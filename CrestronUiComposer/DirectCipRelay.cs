using System.Buffers;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace CrestronUiComposer;

/// <summary>
/// Adapts the browser-only WebSocket transport used by Crestron's CH5 runtime
/// to the processor's native CIP TCP service. The listener is bound to loopback,
/// accepts only the Composer preview origin, and exists only for this process.
/// </summary>
internal sealed class DirectCipRelay : IAsyncDisposable
{
    private const int MaximumHttpHeaderBytes = 32 * 1024;
    private const int MaximumCipPacketBytes = 1024 * 1024;
    private readonly string _processorHost;
    private readonly int _processorPort;
    private readonly TcpListener _listener;
    private readonly X509Certificate2 _certificate;
    private readonly RSA _certificateKey;
    private readonly SslStreamCertificateContext _certificateContext;
    private readonly CancellationTokenSource _shutdown = new();
    private readonly Task _acceptLoop;

    private DirectCipRelay(string processorHost, int processorPort)
    {
        _processorHost = processorHost;
        _processorPort = processorPort;
        (_certificate, _certificateKey) = CreateLoopbackCertificate();
        _certificateContext = SslStreamCertificateContext.Create(_certificate, additionalCertificates: null, offline: true);
        _listener = new TcpListener(IPAddress.Loopback, 0);
        _listener.Start();
        _acceptLoop = AcceptLoopAsync(_shutdown.Token);
    }

    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;
    public string CertificateFingerprint => _certificate.GetCertHashString(HashAlgorithmName.SHA256);
    public string? LastError { get; private set; }

    public static DirectCipRelay Start(string processorHost, int processorPort) =>
        new(processorHost, processorPort);

    private static (X509Certificate2 Certificate, RSA Key) CreateLoopbackCertificate()
    {
        var key = RSA.Create(2048);
        var request = new CertificateRequest(
            "CN=Crestron UI Composer Direct CIP Relay",
            key,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(
            X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment,
            false));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(
            new OidCollection { new("1.3.6.1.5.5.7.3.1") },
            false));
        request.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(request.PublicKey, false));
        var names = new SubjectAlternativeNameBuilder();
        names.AddIpAddress(IPAddress.Loopback);
        names.AddDnsName("localhost");
        request.CertificateExtensions.Add(names.Build());
        var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddDays(2));
        return (certificate, key);
    }

    private async Task AcceptLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var client = await _listener.AcceptTcpClientAsync(cancellationToken);
                _ = HandleClientAsync(client, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
            catch (ObjectDisposedException) when (cancellationToken.IsCancellationRequested) { }
            catch when (!cancellationToken.IsCancellationRequested)
            {
                // A malformed or abruptly closed preview connection must not
                // stop later reconnect attempts from the CH5 worker.
            }
        }
    }

    private async Task HandleClientAsync(TcpClient browserClient, CancellationToken cancellationToken)
    {
        using (browserClient)
        using (var tls = new SslStream(browserClient.GetStream(), false))
        {
            try
            {
                await tls.AuthenticateAsServerAsync(new SslServerAuthenticationOptions
                {
                    ServerCertificateContext = _certificateContext,
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    ClientCertificateRequired = false,
                    CertificateRevocationCheckMode = X509RevocationMode.NoCheck,
                }, cancellationToken);

                var request = await ReadHttpHeaderAsync(tls, cancellationToken);
                if (!IsAuthorizedUpgrade(request, out var webSocketKey))
                {
                    await WriteHttpResponseAsync(tls, "403 Forbidden", cancellationToken);
                    return;
                }

                using var processorClient = new TcpClient();
                await processorClient.ConnectAsync(_processorHost, _processorPort, cancellationToken);
                await WriteUpgradeResponseAsync(tls, webSocketKey!, cancellationToken);

                using var relayCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                var processorStream = processorClient.GetStream();
                var writeLock = new SemaphoreSlim(1, 1);
                var browserToProcessor = RelayWebSocketToTcpAsync(tls, processorStream, writeLock, relayCancellation.Token);
                var processorToBrowser = RelayTcpToWebSocketAsync(processorStream, tls, writeLock, relayCancellation.Token);
                await Task.WhenAny(browserToProcessor, processorToBrowser);
                relayCancellation.Cancel();
                try { await Task.WhenAll(browserToProcessor, processorToBrowser); }
                catch (OperationCanceledException) when (relayCancellation.IsCancellationRequested) { }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                LastError = ex.GetBaseException().Message;
            }
        }
    }

    private static async Task<string> ReadHttpHeaderAsync(Stream stream, CancellationToken cancellationToken)
    {
        var bytes = new List<byte>(1024);
        var single = new byte[1];
        while (bytes.Count < MaximumHttpHeaderBytes)
        {
            if (await stream.ReadAsync(single, cancellationToken) == 0) throw new IOException("The preview connection closed during its WebSocket handshake.");
            bytes.Add(single[0]);
            var count = bytes.Count;
            if (count >= 4 && bytes[count - 4] == '\r' && bytes[count - 3] == '\n' && bytes[count - 2] == '\r' && bytes[count - 1] == '\n')
                return Encoding.ASCII.GetString(bytes.ToArray());
        }
        throw new InvalidDataException("The preview WebSocket handshake was too large.");
    }

    private static bool IsAuthorizedUpgrade(string request, out string? webSocketKey)
    {
        webSocketKey = null;
        var lines = request.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length == 0 || !lines[0].StartsWith("GET / HTTP/1.1", StringComparison.Ordinal)) return false;
        var headers = lines.Skip(1)
            .Select(line => line.Split(':', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(parts => parts[0].Trim(), parts => parts[1].Trim(), StringComparer.OrdinalIgnoreCase);
        if (!headers.TryGetValue("Origin", out var origin) || !origin.Equals("https://composer.local", StringComparison.OrdinalIgnoreCase)) return false;
        if (!headers.TryGetValue("Upgrade", out var upgrade) || !upgrade.Equals("websocket", StringComparison.OrdinalIgnoreCase)) return false;
        if (!headers.TryGetValue("Connection", out var connection) || !connection.Contains("Upgrade", StringComparison.OrdinalIgnoreCase)) return false;
        return headers.TryGetValue("Sec-WebSocket-Key", out webSocketKey) && !string.IsNullOrWhiteSpace(webSocketKey);
    }

    private static async Task WriteUpgradeResponseAsync(Stream stream, string key, CancellationToken cancellationToken)
    {
        var acceptBytes = SHA1.HashData(Encoding.ASCII.GetBytes(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"));
        var accept = Convert.ToBase64String(acceptBytes);
        var response = Encoding.ASCII.GetBytes(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            $"Sec-WebSocket-Accept: {accept}\r\n\r\n");
        await stream.WriteAsync(response, cancellationToken);
        await stream.FlushAsync(cancellationToken);
    }

    private static async Task WriteHttpResponseAsync(Stream stream, string status, CancellationToken cancellationToken)
    {
        var response = Encoding.ASCII.GetBytes($"HTTP/1.1 {status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        await stream.WriteAsync(response, cancellationToken);
    }

    private static async Task RelayWebSocketToTcpAsync(Stream webSocket, Stream tcp, SemaphoreSlim writeLock, CancellationToken cancellationToken)
    {
        using var fragmentedMessage = new MemoryStream();
        var fragmenting = false;
        while (!cancellationToken.IsCancellationRequested)
        {
            var header = new byte[2];
            await ReadExactlyAsync(webSocket, header, cancellationToken);
            var final = (header[0] & 0x80) != 0;
            var opcode = header[0] & 0x0f;
            var masked = (header[1] & 0x80) != 0;
            ulong length = (uint)(header[1] & 0x7f);
            if (length == 126)
            {
                var extended = new byte[2];
                await ReadExactlyAsync(webSocket, extended, cancellationToken);
                length = (uint)((extended[0] << 8) | extended[1]);
            }
            else if (length == 127)
            {
                var extended = new byte[8];
                await ReadExactlyAsync(webSocket, extended, cancellationToken);
                if (BitConverter.IsLittleEndian) Array.Reverse(extended);
                length = BitConverter.ToUInt64(extended);
            }
            if (!masked || length > MaximumCipPacketBytes) throw new InvalidDataException("Invalid preview WebSocket frame.");
            var mask = new byte[4];
            await ReadExactlyAsync(webSocket, mask, cancellationToken);
            var payload = new byte[(int)length];
            await ReadExactlyAsync(webSocket, payload, cancellationToken);
            for (var index = 0; index < payload.Length; index++) payload[index] ^= mask[index % 4];

            if (opcode == 0x8) return;
            if (opcode == 0x9)
            {
                await WriteWebSocketFrameAsync(webSocket, 0xA, payload, writeLock, cancellationToken);
                continue;
            }
            if (opcode == 0xA) continue;
            if (opcode == 0x2)
            {
                fragmentedMessage.SetLength(0);
                fragmenting = !final;
            }
            else if (opcode != 0x0 || !fragmenting) throw new InvalidDataException("Only binary CIP WebSocket messages are supported.");
            await fragmentedMessage.WriteAsync(payload, cancellationToken);
            if (fragmentedMessage.Length > MaximumCipPacketBytes) throw new InvalidDataException("The CIP packet was too large.");
            if (!final) continue;
            fragmenting = false;
            var packet = fragmentedMessage.GetBuffer().AsMemory(0, checked((int)fragmentedMessage.Length));
            await tcp.WriteAsync(packet, cancellationToken);
            await tcp.FlushAsync(cancellationToken);
        }
    }

    private static async Task RelayTcpToWebSocketAsync(Stream tcp, Stream webSocket, SemaphoreSlim writeLock, CancellationToken cancellationToken)
    {
        var header = new byte[3];
        while (!cancellationToken.IsCancellationRequested)
        {
            await ReadExactlyAsync(tcp, header, cancellationToken);
            var payloadLength = (header[1] << 8) | header[2];
            var packetLength = payloadLength + 3;
            if (packetLength > MaximumCipPacketBytes) throw new InvalidDataException("The processor sent an oversized CIP packet.");
            var rented = ArrayPool<byte>.Shared.Rent(packetLength);
            try
            {
                header.CopyTo(rented, 0);
                await ReadExactlyAsync(tcp, rented.AsMemory(3, payloadLength), cancellationToken);
                await WriteWebSocketFrameAsync(webSocket, 0x2, rented.AsMemory(0, packetLength), writeLock, cancellationToken);
            }
            finally { ArrayPool<byte>.Shared.Return(rented); }
        }
    }

    private static async Task WriteWebSocketFrameAsync(Stream stream, byte opcode, ReadOnlyMemory<byte> payload, SemaphoreSlim writeLock, CancellationToken cancellationToken)
    {
        var header = new byte[10];
        header[0] = (byte)(0x80 | opcode);
        var headerLength = 2;
        if (payload.Length < 126) header[1] = (byte)payload.Length;
        else if (payload.Length <= ushort.MaxValue)
        {
            header[1] = 126;
            header[2] = (byte)(payload.Length >> 8);
            header[3] = (byte)payload.Length;
            headerLength = 4;
        }
        else
        {
            header[1] = 127;
            var length = (ulong)payload.Length;
            for (var index = 0; index < 8; index++) header[9 - index] = (byte)(length >> (index * 8));
            headerLength = 10;
        }
        await writeLock.WaitAsync(cancellationToken);
        try
        {
            await stream.WriteAsync(header.AsMemory(0, headerLength), cancellationToken);
            await stream.WriteAsync(payload, cancellationToken);
            await stream.FlushAsync(cancellationToken);
        }
        finally { writeLock.Release(); }
    }

    private static async Task ReadExactlyAsync(Stream stream, Memory<byte> buffer, CancellationToken cancellationToken)
    {
        var offset = 0;
        while (offset < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer[offset..], cancellationToken);
            if (read == 0) throw new IOException("The connection was closed.");
            offset += read;
        }
    }

    public async ValueTask DisposeAsync()
    {
        _shutdown.Cancel();
        _listener.Stop();
        try { await _acceptLoop; }
        catch (OperationCanceledException) { }
        _certificate.Dispose();
        _certificateKey.Dispose();
        _shutdown.Dispose();
    }
}
