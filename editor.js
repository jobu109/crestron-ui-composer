(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    stage = $("stage"),
    list = $("component-list");
  const firstPage = {
    id: "page-home",
    name: "Home",
    background: "#182126",
    bindingMode: "none",
    binding: "",
  };
  const state = {
    width: 1920,
    height: 1200,
    targetDevice: "tsw-1070",
    diagnostics: false,
    components: [],
    pages: [firstPage],
    activePage: firstPage.id,
    items: [],
    assets: [],
    reusables: [],
    pageTemplates: [],
    themes: [],
    contract: {
      name: "MyCrestronUI",
      description: "",
      company: "",
      client: "",
      author: "",
      version: "1.0.0.0",
    },
    selected: null,
    selectedIds: [],
  };
  const history = [];
  let historyIndex = -1,
    restoringHistory = false,
    historyTimer = 0;
  const legacyAutosaveKey = "crestron-ui-composer-autosave-v3";
  const autosaveKey = "crestron-ui-composer-recovery-v4";
  const autosaveLimit = 10;
  const autosaveInterval = 30000;
  let autosaveEnabled = false,
    autosaveTimer = 0,
    projectDirty = false,
    lastManualFingerprint = "";
  let componentClipboard = "";
  let snapEnabled = true,
    snapSize = 10;
  const snap = (value) =>
    snapEnabled
      ? Math.round(Number(value) / Math.max(1, snapSize)) *
        Math.max(1, snapSize)
      : Math.round(Number(value));
  function normalizeItemStates(items) {
    (items || []).forEach((item) => {
      item.locked = item.locked === true || item.locked === "true";
      item.hidden = item.hidden === true || item.hidden === "true";
    });
    return items || [];
  }
  function historyState() {
    return JSON.stringify({
      width: state.width,
      height: state.height,
      targetDevice: state.targetDevice,
      diagnostics: state.diagnostics,
      pages: state.pages,
      activePage: state.activePage,
      items: state.items,
      assets: state.assets,
      reusables: state.reusables,
      pageTemplates: state.pageTemplates,
      themes: state.themes,
      contract: state.contract,
    });
  }
  function updateHistoryButtons() {
    const undo = $("undo"),
      redo = $("redo");
    if (undo) undo.disabled = historyIndex <= 0;
    if (redo)
      redo.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }
  function setAutosaveState(text, kind = "") {
    const indicator = $("autosave-state");
    if (!indicator) return;
    indicator.textContent = text;
    indicator.className = `autosave-state ${kind}`.trim();
  }
  function readRecoveryStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(autosaveKey) || "null");
      if (saved && Array.isArray(saved.snapshots)) return saved;
      const legacy = JSON.parse(
        localStorage.getItem(legacyAutosaveKey) || "null",
      );
      if (legacy && legacy.project)
        return {
          version: 4,
          snapshots: [
            {
              savedAt: legacy.savedAt || new Date().toISOString(),
              project: legacy.project,
            },
          ],
        };
    } catch (_) {}
    return { version: 4, snapshots: [] };
  }
  function clearRecovery() {
    clearTimeout(autosaveTimer);
    try {
      localStorage.removeItem(autosaveKey);
      localStorage.removeItem(legacyAutosaveKey);
    } catch (_) {}
    if (native) nativeRequest("clearRecovery").catch(() => {});
  }
  function persistAutosave(value, forceSnapshot = false) {
    if (!autosaveEnabled || !projectDirty) return;
    try {
      const store = readRecoveryStore(),
        now = new Date(),
        latest = store.snapshots[0],
        latestTime = latest ? new Date(latest.savedAt).getTime() : 0,
        parsed = JSON.parse(value),
        snapshot = { savedAt: now.toISOString(), project: parsed };
      if (
        forceSnapshot ||
        !latest ||
        now.getTime() - latestTime >= autosaveInterval
      )
        store.snapshots.unshift(snapshot);
      else store.snapshots[0] = snapshot;
      store.snapshots = store.snapshots.slice(0, autosaveLimit);
      store.version = 4;
      const serialized = JSON.stringify(store);
      if (native) nativeRequest("writeRecovery", serialized).catch(() => {});
      try {
        localStorage.setItem(autosaveKey, serialized);
        localStorage.removeItem(legacyAutosaveKey);
      } catch (storageError) {
        if (!native) throw storageError;
        console.warn("Browser recovery mirror failed", storageError);
      }
      setAutosaveState(
        `Autosaved ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        "dirty",
      );
    } catch (error) {
      setAutosaveState("Autosave failed", "error");
      console.warn("Autosave failed", error);
    }
  }
  function writeAutosave(value) {
    if (!autosaveEnabled) return;
    projectDirty = value !== lastManualFingerprint;
    if (!projectDirty) {
      setAutosaveState("Saved");
      return;
    }
    setAutosaveState("Unsaved changes", "dirty");
    if (!autosaveTimer)
      autosaveTimer = setTimeout(() => {
        autosaveTimer = 0;
        persistAutosave(historyState());
      }, autosaveInterval);
  }
  function markProjectSaved() {
    lastManualFingerprint = historyState();
    projectDirty = false;
    clearRecovery();
    setAutosaveState("Saved");
  }
  function commitHistory(persist = true) {
    if (restoringHistory) return;
    const value = historyState();
    if (historyIndex >= 0 && history[historyIndex] === value) return;
    history.splice(historyIndex + 1);
    history.push(value);
    if (history.length > 100) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
    if (persist) writeAutosave(value);
  }
  function scheduleHistory() {
    if (restoringHistory) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(commitHistory, 0);
  }
  function restoreHistory(index) {
    if (index < 0 || index >= history.length || index === historyIndex) return;
    restoringHistory = true;
    const saved = JSON.parse(history[index]);
    state.width = saved.width;
    state.height = saved.height;
    state.targetDevice = saved.targetDevice;
    state.diagnostics = !!saved.diagnostics;
    state.pages = saved.pages;
    state.activePage = saved.activePage;
    state.items = normalizeItemStates(saved.items);
    state.assets = saved.assets || [];
    state.reusables = saved.reusables || [];
    state.pageTemplates = saved.pageTemplates || [];
    state.themes = saved.themes || [];
    state.contract = { ...state.contract, ...(saved.contract || {}) };
    state.selected = null;
    state.selectedIds = [];
    historyIndex = index;
    $("target-device").value = state.targetDevice;
    $("custom-size").hidden = state.targetDevice !== "custom";
    $("panel-width").value = state.width;
    $("panel-height").value = state.height;
    resize(state.width, state.height);
    renderPage();
    updateHistoryButtons();
    restoringHistory = false;
    setStatus(index === history.length - 1 ? "Redo complete" : "Undo complete");
  }
  function undo() {
    restoreHistory(historyIndex - 1);
  }
  function redo() {
    restoreHistory(historyIndex + 1);
  }
  function recoveryDescription(snapshot) {
    const p = snapshot.project || {},
      pages = (p.pages || []).length,
      items = (p.items || []).length,
      device =
        deviceProfiles.find((entry) => entry.id === p.targetDevice)?.name ||
        p.targetDevice ||
        "Custom panel";
    return `${device} · ${pages} page${pages === 1 ? "" : "s"} · ${items} widget${items === 1 ? "" : "s"}`;
  }
  function restoreRecoveryProject(p, savedAt) {
    state.items = normalizeItemStates(p.items);
    state.assets = p.assets || [];
    state.reusables = p.reusables || [];
    state.pageTemplates = p.pageTemplates || [];
    state.themes = p.themes || [];
    state.contract = {
      ...state.contract,
      ...(p.contract || {}),
    };
    state.pages = p.pages || [{ ...firstPage }];
    state.activePage = p.activePage || state.pages[0].id;
    state.targetDevice = p.targetDevice || "tsw-1070";
    state.diagnostics = !!p.diagnostics;
    state.width = Number(p.width) || 1920;
    state.height = Number(p.height) || 1200;
    $("target-device").value = state.targetDevice;
    $("custom-size").hidden = state.targetDevice !== "custom";
    $("panel-width").value = state.width;
    $("panel-height").value = state.height;
    resize(state.width, state.height);
    renderPage();
    commitHistory(false);
    projectDirty = true;
    setAutosaveState("Recovered · unsaved", "dirty");
    setStatus("Recovered autosave from " + new Date(savedAt).toLocaleString());
  }
  async function recoverAutosave() {
    let store = readRecoveryStore();
    if (native)
      try {
        const desktopValue = await nativeRequest("readRecovery");
        if (desktopValue) {
          const desktopStore = JSON.parse(desktopValue),
            browserLatest = store.snapshots[0]?.savedAt || "",
            desktopLatest = desktopStore.snapshots?.[0]?.savedAt || "";
          if (desktopLatest > browserLatest) store = desktopStore;
        }
      } catch (error) {
        console.warn("Desktop recovery file could not be read", error);
      }
    const snapshots = store.snapshots.filter(
      (entry) => entry && entry.project && entry.savedAt,
    );
    if (!snapshots.length) {
      autosaveEnabled = true;
      lastManualFingerprint = historyState();
      setAutosaveState("Saved");
      return;
    }
    const list = $("recovery-list");
    list.innerHTML = snapshots
      .map(
        (entry, index) =>
          `<label class="recovery-entry"><input type="radio" name="recovery-snapshot" value="${index}" ${index === 0 ? "checked" : ""}><span><strong>${new Date(entry.savedAt).toLocaleString()}${index === 0 ? " · Latest" : ""}</strong><small>${recoveryDescription(entry)}</small></span></label>`,
      )
      .join("");
    $("recovery-restore").onclick = () => {
      const selected = list.querySelector(
          'input[name="recovery-snapshot"]:checked',
        ),
        snapshot = snapshots[Number(selected?.value || 0)];
      $("recovery-dialog").close();
      autosaveEnabled = true;
      restoreRecoveryProject(snapshot.project, snapshot.savedAt);
    };
    $("recovery-discard").onclick = () => {
      clearRecovery();
      autosaveEnabled = true;
      lastManualFingerprint = historyState();
      projectDirty = false;
      setAutosaveState("Saved");
      $("recovery-dialog").close();
      setStatus("Recovery history discarded");
    };
    $("recovery-dialog").showModal();
  }
  let deviceProfiles = [];
  let categoryOrder = [
    "Buttons",
    "Sliders & Levels",
    "Text",
    "Navigation & Menus",
    "Lists & Selectors",
    "Input",
    "Status & Information",
    "Other",
  ];
  const native = window.chrome && window.chrome.webview,
    nativePending = new Map();
  if (native)
    native.addEventListener("message", (event) => {
      const m = event.data;
      if (m && m.type === "openProjectFile") {
        loadProjectText(m.contents).then(() => setStatus("Opened " + m.path));
        return;
      }
      if (!m || m.type !== "nativeResponse") return;
      const pending = nativePending.get(m.id);
      if (!pending) return;
      nativePending.delete(m.id);
      m.ok
        ? pending.resolve(m.data)
        : pending.reject(new Error(m.error || "cancelled"));
    });
  function nativeRequest(command, payload = null) {
    return new Promise((resolve, reject) => {
      if (!native) {
        reject(new Error("unavailable"));
        return;
      }
      const id = uid("request-");
      nativePending.set(id, { resolve, reject });
      native.postMessage({ id, command, payload });
    });
  }
  const uid = (p) =>
      (p || "w") +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 6),
    currentPage = () => state.pages.find((p) => p.id === state.activePage),
    current = () => state.items.find((x) => x.id === state.selected),
    selectedItems = () =>
      (state.selectedIds || [])
        .map((id) => state.items.find((item) => item.id === id))
        .filter(Boolean);
  function setStatus(s) {
    $("status").textContent = s;
  }
  function safeDoc(html, target) {
    const bridge = target
      ? `<script>document.addEventListener("pointerup",function(){parent.postMessage({type:"crestron-local-page",page:${JSON.stringify(target)}},"*")});<\/script>`
      : "";
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}${bridge}</body></html>`;
  }
  function componentCategory(name) {
    const n = name.toLowerCase();
    if (/button|toggle|switch/.test(n)) return "Buttons";
    if (/slider|level|volume|shade|light|mic/.test(n))
      return "Sliders & Levels";
    if (/text|label|scroll/.test(n)) return "Text";
    if (/menu|nav|carousel|dpad/.test(n)) return "Navigation & Menus";
    if (/list|selector|preset/.test(n)) return "Lists & Selectors";
    if (/keyboard|password|input/.test(n)) return "Input";
    if (/clock|weather|display|progress|wait|status|led/.test(n))
      return "Status & Information";
    return "Other";
  }
  function addComponent(name, html, metadata = {}) {
    if (state.components.some((x) => x.name === name)) return;
    state.components.push({
      name,
      html,
      componentId: metadata.componentId || "",
      runtime: metadata.runtime || "legacy",
      displayName: metadata.name || name.replace(/\.html$/i, ""),
      category: metadata.category || componentCategory(name),
      width: metadata.width || 220,
      height: metadata.height || 120,
    });
    renderComponentLibrary();
  }
  function renderComponentLibrary() {
    const query = $("component-search").value.trim().toLowerCase();
    list.innerHTML = "";
    categoryOrder.forEach((category) => {
      const components = state.components
        .filter(
          (c) =>
            c.category === category &&
            (!query ||
              (c.displayName + " " + c.name).toLowerCase().includes(query)),
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      if (!components.length) return;
      const group = document.createElement("details"),
        summary = document.createElement("summary"),
        items = document.createElement("div");
      group.className = "component-category";
      group.open =
        !!query || ["Buttons", "Sliders & Levels", "Text"].includes(category);
      summary.innerHTML =
        category +
        '<span class="category-count">' +
        components.length +
        "</span>";
      items.className = "category-items";
      components.forEach((c) => {
        const el = document.createElement("div");
        el.className = "component";
        el.textContent = c.displayName;
        el.draggable = true;
        el.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/component", c.name),
        );
        el.addEventListener("dblclick", () => createItem(c.name, 40, 40));
        items.appendChild(el);
      });
      group.append(summary, items);
      list.appendChild(group);
    });
  }
  async function loadKnown() {
    let count = 0;
    try {
      const manifest = await (await fetch("components.manifest.json")).json();
      categoryOrder = manifest.categories;
      for (const metadata of manifest.components) {
        const r = await fetch(encodeURI(metadata.file));
        if (r.ok) {
          addComponent(metadata.file, await r.text(), metadata);
          count++;
        }
      }
    } catch (e) {
      console.error("Component manifest failed to load", e);
    }
    setStatus(
      count
        ? count + " manifest components loaded"
        : "Import snippets to begin",
    );
  }
  async function loadDevices() {
    try {
      const manifest = await (await fetch("devices.manifest.json")).json();
      deviceProfiles = manifest.devices;
      const select = $("target-device");
      select.innerHTML = "";
      deviceProfiles.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.id;
        option.textContent =
          device.name +
          (device.id === "custom"
            ? ""
            : ` — ${device.width} × ${device.height}`);
        select.appendChild(option);
      });
      select.value = state.targetDevice;
      applyDevice(state.targetDevice);
    } catch (error) {
      console.error("Device profiles failed to load", error);
    }
  }
  function selectedDevice() {
    return (
      deviceProfiles.find((device) => device.id === state.targetDevice) || {
        id: "custom",
        name: "Custom resolution",
        width: state.width,
        height: state.height,
        supportsCh5: null,
        validationStatus: "unverified",
      }
    );
  }
  function applyDevice(id) {
    state.targetDevice = id;
    const device = selectedDevice(),
      custom = id === "custom";
    $("custom-size").hidden = !custom;
    if (!custom) {
      resize(device.width, device.height);
      $("panel-width").value = device.width;
      $("panel-height").value = device.height;
      setStatus(`${device.name}: ${device.width} × ${device.height}`);
    } else setStatus("Custom panel profile — CH5 compatibility unverified");
  }
  function createItem(name, x, y, data) {
    const c = state.components.find((v) => v.name === name);
    if (!c) return;
    const definition =
        c.componentId && window.ComposerRuntime.get(c.componentId),
      signalBindings = {},
      properties = {};
    if (definition) {
      definition.signals.forEach(
        (s) =>
          (signalBindings[s.key] = {
            mode: /^\d+$/.test(s.defaultValue || "") ? "join" : "contract",
            value: s.defaultValue || "",
          }),
      );
      (definition.properties || []).forEach(
        (p) => (properties[p.key] = p.defaultValue),
      );
    }
    const item = Object.assign(
      {
        id: uid(),
        pageId: state.activePage,
        name: c.displayName,
        source: c.html,
        componentId: c.componentId,
        signalBindings,
        properties,
        x: snap(x),
        y: snap(y),
        w: snap(c.width),
        h: snap(c.height),
        z: state.items.length + 1,
        targetPage: "",
      },
      data || {},
    );
    state.items.push(item);
    renderItem(item);
    select(item.id);
  }
  function renderItem(item) {
    let el = stage.querySelector('.widget[data-id="' + item.id + '"]');
    if (item.pageId !== state.activePage && !item.master) {
      if (el) {
        if (el.runtimeDispose) el.runtimeDispose();
        el.remove();
      }
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.className = "widget";
      el.dataset.id = item.id;
      el.addEventListener("pointerdown", startMove);
      stage.appendChild(el);
    }
    el.classList.toggle("locked", !!item.locked);
    el.classList.toggle("grouped", !!item.groupId);
    if (el.runtimeDispose) {
      el.runtimeDispose();
      el.runtimeDispose = null;
    }
    el.innerHTML = item.componentId
      ? '<div class="scoped-preview"></div><i class="handle"></i>'
      : '<iframe sandbox="allow-scripts allow-same-origin"></iframe><i class="handle"></i>';
    el.querySelector(".handle").addEventListener("pointerdown", startResize);
    el.style.cssText = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z};display:${item.hidden ? "none" : "block"}`;
    const backgroundAsset = state.assets.find(
      (asset) => asset.id === item.backgroundAsset,
    );
    el.style.backgroundImage = backgroundAsset
      ? `url("${backgroundAsset.dataUrl}")`
      : "";
    el.style.backgroundSize = backgroundAsset ? "cover" : "";
    el.style.backgroundPosition = backgroundAsset ? "center" : "";
    if (item.componentId)
      el.runtimeDispose = window.ComposerRuntime.mount(
        el.querySelector(".scoped-preview"),
        item.componentId,
        {
          bindings: item.signalBindings,
          properties: item.properties || {},
          targetPage: item.targetPage,
          navigate: () => {},
        },
      );
    else el.querySelector("iframe").srcdoc = safeDoc(item.source, "");
  }
  function renderPage() {
    stage.innerHTML = "";
    const page = currentPage(),
      backgroundAsset = state.assets.find(
        (asset) => asset.id === page.backgroundAsset,
      );
    stage.style.backgroundColor = page.background;
    stage.style.backgroundImage = backgroundAsset
      ? `url("${backgroundAsset.dataUrl}")`
      : "";
    stage.style.backgroundSize = backgroundAsset ? "cover" : "";
    stage.style.backgroundPosition = backgroundAsset ? "center" : "";
    state.items
      .filter((i) => i.pageId === state.activePage || i.master)
      .forEach(renderItem);
    select(null);
    renderPages();
    renderPageInspector();
    renderLayers();
    renderAssets();
    renderReusableLibrary();
    renderThemes();
  }
  function renderPages() {
    const host = $("page-list");
    host.innerHTML = "";
    state.pages.forEach((p) => {
      const row = document.createElement("div"),
        open = document.createElement("button"),
        remove = document.createElement("button");
      row.className = "page-row";
      open.textContent = p.name;
      open.classList.toggle("active", p.id === state.activePage);
      open.onclick = () => {
        state.activePage = p.id;
        renderPage();
      };
      remove.className = "remove-page";
      remove.textContent = "×";
      remove.title = "Delete page";
      remove.disabled = state.pages.length === 1;
      remove.onclick = () => deletePage(p.id);
      row.append(open, remove);
      host.appendChild(row);
    });
    refreshTargets();
  }
  function renderLayers() {
    const host = $("layers-list");
    if (!host) return;
    const query = String($("layer-search")?.value || "")
        .trim()
        .toLowerCase(),
      pageItems = state.items
        .filter((item) => item.pageId === state.activePage || item.master)
        .filter(
          (item) =>
            !query ||
            `${item.name} ${item.componentId || "HTML"}`
              .toLowerCase()
              .includes(query),
        )
        .sort((a, b) => (Number(b.z) || 0) - (Number(a.z) || 0)),
      groups = new Map();
    host.innerHTML = "";
    pageItems.forEach((item) => {
      const key = item.groupId || `item:${item.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    function row(item) {
      const element = document.createElement("div");
      element.className = `layer-row${(state.selectedIds || []).includes(item.id) ? " selected" : ""}${item.hidden ? " hidden-layer" : ""}`;
      element.draggable = !item.locked;
      element.dataset.id = item.id;
      const visible = document.createElement("button"),
        lock = document.createElement("button"),
        name = document.createElement("div"),
        z = document.createElement("span");
      visible.type = lock.type = "button";
      visible.title = item.hidden ? "Show layer" : "Hide layer";
      visible.textContent = item.hidden ? "○" : "●";
      lock.title = item.locked ? "Unlock layer" : "Lock layer";
      lock.textContent = item.locked ? "🔒" : "🔓";
      name.className = "layer-name";
      name.textContent = item.name;
      const type = document.createElement("small");
      type.className = "layer-type";
      type.textContent = `${item.master ? "GLOBAL · " : ""}${item.componentId || "Custom HTML"}`;
      name.appendChild(type);
      z.className = "layer-z";
      z.textContent = item.z;
      visible.onclick = (event) => {
        event.stopPropagation();
        item.hidden = !item.hidden;
        renderItem(item);
        renderLayers();
        commitHistory();
        setStatus(`${item.hidden ? "Hidden" : "Shown"} “${item.name}”`);
      };
      lock.onclick = (event) => {
        event.stopPropagation();
        select(item.id);
        toggleSelectedLock();
      };
      element.onclick = (event) => select(item.id, event.shiftKey);
      element.ondragstart = (event) =>
        event.dataTransfer.setData("text/layer-id", item.id);
      element.ondragover = (event) => {
        event.preventDefault();
        element.classList.add("drag-over");
      };
      element.ondragleave = () => element.classList.remove("drag-over");
      element.ondrop = (event) => {
        event.preventDefault();
        element.classList.remove("drag-over");
        reorderLayer(event.dataTransfer.getData("text/layer-id"), item.id);
      };
      element.oncontextmenu = (event) => showLayerContextMenu(event, item.id);
      element.append(visible, lock, name, z);
      return element;
    }
    groups.forEach((items, key) => {
      if (items[0].groupId) {
        const group = document.createElement("div"),
          title = document.createElement("div");
        group.className = "layer-group";
        title.className = "layer-group-title";
        title.textContent = `Group · ${items.length} items`;
        group.appendChild(title);
        items.forEach((item) => group.appendChild(row(item)));
        host.appendChild(group);
      } else host.appendChild(row(items[0]));
    });
    if (!pageItems.length)
      host.innerHTML = '<p class="hint">No matching layers.</p>';
  }
  function reorderLayer(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    const items = state.items
        .filter((item) => item.pageId === state.activePage || item.master)
        .sort((a, b) => (Number(b.z) || 0) - (Number(a.z) || 0)),
      sourceIndex = items.findIndex((item) => item.id === sourceId),
      targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || items[sourceIndex].locked) return;
    const [source] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, source);
    items.forEach((item, index) => {
      item.z = items.length - index;
      renderItem(item);
    });
    renderLayers();
    commitHistory();
    setStatus(`Moved “${source.name}” to z-index ${source.z}`);
  }
  function assetUsage(assetId) {
    return (
      state.pages.filter((page) => page.backgroundAsset === assetId).length +
      state.items.filter(
        (item) => item.assetId === assetId || item.backgroundAsset === assetId,
      ).length
    );
  }
  function assetSource(asset) {
    const style =
      "position:fixed;inset:0;display:block;width:100%;height:100%;margin:0;object-fit:cover;background:transparent";
    if (asset.type.startsWith("image/"))
      return `<img src="${asset.dataUrl}" alt="" style="${style}">`;
    if (asset.type.startsWith("video/"))
      return `<video src="${asset.dataUrl}" controls playsinline style="${style}"></video>`;
    if (asset.type.startsWith("audio/"))
      return `<div style="display:grid;place-items:center;width:100%;height:100%;background:#182126"><audio src="${asset.dataUrl}" controls style="width:90%"></audio></div>`;
    return `<div style="display:grid;place-items:center;width:100%;height:100%;background:#182126;color:#7cebd8;font:20px Segoe UI,sans-serif">Font: ${asset.name.replace(/[<>]/g, "")}</div>`;
  }
  function createAssetItem(assetId, x, y) {
    const asset = state.assets.find((entry) => entry.id === assetId);
    if (!asset || asset.type.includes("font")) return;
    const item = {
      id: uid("asset-item-"),
      pageId: state.activePage,
      name: asset.name,
      source: assetSource(asset),
      componentId: "",
      assetId: asset.id,
      signalBindings: {},
      properties: {},
      x: snap(x),
      y: snap(y),
      w: asset.type.startsWith("audio/") ? 360 : 320,
      h: asset.type.startsWith("audio/") ? 100 : 220,
      z:
        Math.max(
          0,
          ...state.items
            .filter(
              (entry) => entry.pageId === state.activePage || entry.master,
            )
            .map((entry) => Number(entry.z) || 0),
        ) + 1,
      targetPage: "",
    };
    state.items.push(item);
    renderItem(item);
    select(item.id);
    commitHistory();
    setStatus(`Added asset “${asset.name}” to the canvas`);
  }
  function renderAssets() {
    const host = $("asset-list");
    if (!host) return;
    const query = String($("asset-search")?.value || "")
      .trim()
      .toLowerCase();
    host.innerHTML = "";
    state.assets
      .filter((asset) => !query || asset.name.toLowerCase().includes(query))
      .forEach((asset) => {
        const card = document.createElement("div"),
          preview = document.createElement("div"),
          info = document.createElement("div"),
          buttons = document.createElement("div"),
          usage = assetUsage(asset.id);
        card.className = `asset-card${usage ? "" : " asset-unused"}`;
        card.draggable = !asset.type.includes("font");
        card.dataset.assetId = asset.id;
        preview.className = "asset-preview";
        if (asset.type.startsWith("image/")) {
          const image = document.createElement("img");
          image.src = asset.dataUrl;
          preview.appendChild(image);
        } else if (asset.type.startsWith("video/")) {
          const video = document.createElement("video");
          video.src = asset.dataUrl;
          preview.appendChild(video);
        } else
          preview.textContent = asset.type.startsWith("audio/")
            ? "AUDIO"
            : "FONT";
        info.innerHTML = `<div class="asset-name"></div><div class="asset-meta">${Math.ceil(asset.size / 1024)} KB · ${usage} use${usage === 1 ? "" : "s"}</div>`;
        info.querySelector(".asset-name").textContent = asset.name;
        buttons.className = "asset-buttons";
        const pageButton = document.createElement("button"),
          selectedButton = document.createElement("button"),
          replaceButton = document.createElement("button"),
          deleteButton = document.createElement("button");
        pageButton.textContent = "Page bg";
        selectedButton.textContent = "Selected bg";
        replaceButton.textContent = "Replace";
        deleteButton.textContent = "Delete";
        pageButton.disabled = !asset.type.startsWith("image/");
        selectedButton.disabled = !asset.type.startsWith("image/");
        pageButton.onclick = () => {
          currentPage().backgroundAsset = asset.id;
          renderPage();
          commitHistory();
          setStatus(`Page background: “${asset.name}”`);
        };
        selectedButton.onclick = () => {
          const items = selectedItems();
          items.forEach((item) => {
            item.backgroundAsset = asset.id;
            renderItem(item);
          });
          commitHistory();
          setStatus(
            `Applied “${asset.name}” to ${items.length} component${items.length === 1 ? "" : "s"}`,
          );
        };
        replaceButton.onclick = () => {
          $("asset-replace-file").dataset.assetId = asset.id;
          $("asset-replace-file").click();
        };
        deleteButton.onclick = () => {
          if (
            usage &&
            !confirm(
              `“${asset.name}” is used ${usage} time${usage === 1 ? "" : "s"}. Remove it and clear those references?`,
            )
          )
            return;
          state.pages.forEach((page) => {
            if (page.backgroundAsset === asset.id) delete page.backgroundAsset;
          });
          state.items.forEach((item) => {
            if (item.backgroundAsset === asset.id) delete item.backgroundAsset;
          });
          state.items = state.items.filter((item) => item.assetId !== asset.id);
          state.assets = state.assets.filter((entry) => entry.id !== asset.id);
          renderPage();
          commitHistory();
          setStatus(`Removed asset “${asset.name}”`);
        };
        buttons.append(pageButton, selectedButton, replaceButton, deleteButton);
        card.ondragstart = (event) =>
          event.dataTransfer.setData("text/asset", asset.id);
        card.ondblclick = () => createAssetItem(asset.id, 40, 40);
        card.append(preview, info, buttons);
        host.appendChild(card);
      });
    if (!host.children.length)
      host.innerHTML = '<p class="hint">No assets imported.</p>';
  }
  function readAssetFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          id: uid("asset-"),
          name: file.name,
          type:
            file.type ||
            (/\.(woff2?|ttf|otf)$/i.test(file.name)
              ? "font/embedded"
              : "application/octet-stream"),
          size: file.size,
          dataUrl: reader.result,
        });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function reusableSnapshot(items) {
    const left = Math.min(...items.map((item) => item.x)),
      top = Math.min(...items.map((item) => item.y));
    return items.map((item, index) => {
      const copy = structuredClone(item);
      copy.x -= left;
      copy.y -= top;
      copy.reusableKey = copy.reusableKey || `part-${index + 1}`;
      delete copy.id;
      delete copy.pageId;
      delete copy.reusableId;
      delete copy.linkedInstanceId;
      delete copy.master;
      return copy;
    });
  }
  function saveReusableSelection() {
    const items = selectedItems();
    if (!items.length) {
      setStatus("Select one or more components first");
      return;
    }
    const name = prompt(
      "Reusable design name",
      items.length === 1 ? items[0].name : "Component group",
    );
    if (!name || !name.trim()) return;
    const definition = {
        id: uid("reusable-"),
        name: name.trim(),
        items: reusableSnapshot(items),
      },
      instanceId = uid("instance-");
    state.reusables.push(definition);
    items.forEach((item, index) => {
      item.reusableId = definition.id;
      item.reusableKey = definition.items[index].reusableKey;
      item.linkedInstanceId = instanceId;
    });
    renderReusableLibrary();
    renderLayers();
    commitHistory();
    setStatus(`Saved reusable design “${definition.name}”`);
  }
  function insertReusable(id) {
    const definition = state.reusables.find((entry) => entry.id === id);
    if (!definition) return;
    const instanceId = uid("instance-"),
      groupId = uid("group-"),
      baseZ = Math.max(
        0,
        ...state.items
          .filter((item) => item.pageId === state.activePage || item.master)
          .map((item) => Number(item.z) || 0),
      );
    const items = definition.items.map((source, index) => {
      const item = structuredClone(source);
      item.id = uid("item-");
      item.pageId = state.activePage;
      item.x += 40;
      item.y += 40;
      item.z = baseZ + index + 1;
      item.reusableId = definition.id;
      item.reusableKey = source.reusableKey;
      item.linkedInstanceId = instanceId;
      if (definition.items.length > 1) item.groupId = groupId;
      return item;
    });
    state.items.push(...items);
    items.forEach(renderItem);
    selectMany(
      items.map((item) => item.id),
      items[items.length - 1].id,
    );
    renderReusableLibrary();
    commitHistory();
    setStatus(`Inserted linked “${definition.name}”`);
  }
  function updateReusableInstances() {
    const selected = selectedItems(),
      reference = selected[0];
    if (!reference?.reusableId || !reference.linkedInstanceId) return;
    const definition = state.reusables.find(
        (entry) => entry.id === reference.reusableId,
      ),
      sourceItems = state.items.filter(
        (item) => item.linkedInstanceId === reference.linkedInstanceId,
      );
    if (!definition || !sourceItems.length) return;
    definition.items = reusableSnapshot(sourceItems);
    const instances = new Map();
    state.items
      .filter(
        (item) =>
          item.reusableId === definition.id &&
          item.linkedInstanceId !== reference.linkedInstanceId,
      )
      .forEach((item) => {
        if (!instances.has(item.linkedInstanceId))
          instances.set(item.linkedInstanceId, []);
        instances.get(item.linkedInstanceId).push(item);
      });
    instances.forEach((items) => {
      const left = Math.min(...items.map((item) => item.x)),
        top = Math.min(...items.map((item) => item.y));
      items.forEach((item) => {
        const source = definition.items.find(
          (entry) => entry.reusableKey === item.reusableKey,
        );
        if (!source) return;
        const keep = {
          id: item.id,
          pageId: item.pageId,
          groupId: item.groupId,
          linkedInstanceId: item.linkedInstanceId,
          reusableId: definition.id,
          reusableKey: item.reusableKey,
          x: left + source.x,
          y: top + source.y,
        };
        Object.assign(item, structuredClone(source), keep);
      });
    });
    renderPage();
    commitHistory();
    setStatus(`Updated all linked “${definition.name}” instances`);
  }
  function detachReusableInstance() {
    const instanceId = current()?.linkedInstanceId;
    if (!instanceId) return;
    state.items
      .filter((item) => item.linkedInstanceId === instanceId)
      .forEach((item) => {
        delete item.reusableId;
        delete item.reusableKey;
        delete item.linkedInstanceId;
      });
    renderLayers();
    renderReusableLibrary();
    commitHistory();
    setStatus("Detached reusable instance");
  }
  function savePageTemplate() {
    const page = currentPage(),
      items = state.items.filter((item) => item.pageId === page.id),
      name = prompt("Page template name", page.name);
    if (!name || !name.trim()) return;
    state.pageTemplates.push({
      id: uid("page-template-"),
      name: name.trim(),
      background: page.background,
      backgroundAsset: page.backgroundAsset || "",
      items: items.map((item) => {
        const copy = structuredClone(item);
        delete copy.id;
        delete copy.pageId;
        return copy;
      }),
    });
    renderReusableLibrary();
    commitHistory();
    setStatus(`Saved page template “${name.trim()}”`);
  }
  function createPageFromTemplate(id) {
    const template = state.pageTemplates.find((entry) => entry.id === id);
    if (!template) return;
    const page = {
        id: uid("page-"),
        name: template.name,
        background: template.background,
        backgroundAsset: template.backgroundAsset || "",
        bindingMode: "none",
        binding: "",
      },
      groups = new Map(),
      instances = new Map();
    state.pages.push(page);
    state.activePage = page.id;
    template.items.forEach((source) => {
      const item = structuredClone(source);
      item.id = uid("item-");
      item.pageId = page.id;
      if (item.groupId) {
        if (!groups.has(item.groupId)) groups.set(item.groupId, uid("group-"));
        item.groupId = groups.get(item.groupId);
      }
      if (item.linkedInstanceId) {
        if (!instances.has(item.linkedInstanceId))
          instances.set(item.linkedInstanceId, uid("instance-"));
        item.linkedInstanceId = instances.get(item.linkedInstanceId);
      }
      state.items.push(item);
    });
    renderPage();
    commitHistory();
    setStatus(`Created page from “${template.name}”`);
  }
  function renderReusableLibrary() {
    const reusableHost = $("reusable-list"),
      templateHost = $("page-template-list");
    if (!reusableHost || !templateHost) return;
    reusableHost.innerHTML = "";
    templateHost.innerHTML = "";
    function card(entry, meta, insert, remove) {
      const element = document.createElement("div"),
        name = document.createElement("div"),
        detail = document.createElement("div"),
        buttons = document.createElement("div"),
        add = document.createElement("button"),
        del = document.createElement("button");
      element.className = "design-card";
      name.className = "design-name";
      detail.className = "design-meta";
      buttons.className = "design-buttons";
      name.textContent = entry.name;
      detail.textContent = meta;
      add.textContent = "Insert";
      del.textContent = "Delete";
      add.onclick = insert;
      del.onclick = remove;
      buttons.append(add, del);
      element.append(name, detail, buttons);
      return element;
    }
    state.reusables.forEach((entry) =>
      reusableHost.appendChild(
        card(
          entry,
          `${entry.items.length} component${entry.items.length === 1 ? "" : "s"}`,
          () => insertReusable(entry.id),
          () => {
            state.reusables = state.reusables.filter(
              (item) => item.id !== entry.id,
            );
            state.items
              .filter((item) => item.reusableId === entry.id)
              .forEach((item) => {
                delete item.reusableId;
                delete item.reusableKey;
                delete item.linkedInstanceId;
              });
            renderReusableLibrary();
            commitHistory();
          },
        ),
      ),
    );
    state.pageTemplates.forEach((entry) =>
      templateHost.appendChild(
        card(
          entry,
          `${entry.items.length} component${entry.items.length === 1 ? "" : "s"}`,
          () => createPageFromTemplate(entry.id),
          () => {
            state.pageTemplates = state.pageTemplates.filter(
              (item) => item.id !== entry.id,
            );
            renderReusableLibrary();
            commitHistory();
          },
        ),
      ),
    );
    if (!state.reusables.length)
      reusableHost.innerHTML = '<p class="hint">No reusable designs.</p>';
    if (!state.pageTemplates.length)
      templateHost.innerHTML = '<p class="hint">No page templates.</p>';
  }
  function currentTheme() {
    return {
      page: $("theme-page").value,
      surface: $("theme-surface").value,
      accent: $("theme-accent").value,
      text: $("theme-text").value,
      glow: $("theme-glow").value,
      border: $("theme-border").value,
    };
  }
  function loadTheme(theme) {
    ["page", "surface", "accent", "text", "glow", "border"].forEach((key) => {
      if (theme[key]) $("theme-" + key).value = theme[key];
    });
    setStatus(`Loaded theme “${theme.name || "palette"}”`);
  }
  function themeValueFor(key, theme) {
    const name = key.toLowerCase();
    if (!/color/.test(name)) return "";
    if (/glow/.test(name)) return theme.glow;
    if (/border|outline/.test(name)) return theme.border;
    if (/text|label|status|value/.test(name)) return theme.text;
    if (
      /off|background|surface|face|button|card|frame|panel|track|knob|shade/.test(
        name,
      )
    )
      return theme.surface;
    if (
      /accent|selected|pressed|active|on|high|gauge|wave|fill|level/.test(name)
    )
      return theme.accent;
    return theme.accent;
  }
  function applyThemeToItems(items, theme) {
    items.forEach((item) => {
      item.properties = item.properties || {};
      Object.keys(item.properties).forEach((key) => {
        const value = themeValueFor(key, theme);
        if (value) item.properties[key] = value;
      });
      renderItem(item);
    });
  }
  function applyTheme(scope) {
    const theme = currentTheme();
    let items = [];
    if (scope === "selection") items = selectedItems();
    if (scope === "page") {
      items = state.items.filter(
        (item) => item.pageId === state.activePage || item.master,
      );
      currentPage().background = theme.page;
    }
    if (scope === "project") {
      items = state.items;
      state.pages.forEach((page) => (page.background = theme.page));
    }
    if (!items.length && scope === "selection") {
      setStatus("Select one or more components first");
      return;
    }
    applyThemeToItems(items, theme);
    renderPage();
    commitHistory();
    setStatus(
      `Applied theme to ${scope === "selection" ? `${items.length} selected component${items.length === 1 ? "" : "s"}` : scope}`,
    );
  }
  function renderThemes() {
    const host = $("theme-list");
    if (!host) return;
    host.innerHTML = "";
    state.themes.forEach((theme) => {
      const card = document.createElement("div"),
        name = document.createElement("div"),
        swatches = document.createElement("div"),
        buttons = document.createElement("div"),
        load = document.createElement("button"),
        remove = document.createElement("button");
      card.className = "design-card";
      name.className = "design-name";
      swatches.className = "theme-swatches";
      buttons.className = "design-buttons";
      name.textContent = theme.name;
      [
        theme.page,
        theme.surface,
        theme.accent,
        theme.text,
        theme.glow,
        theme.border,
      ].forEach((color) => {
        const swatch = document.createElement("i");
        swatch.style.background = color;
        swatches.appendChild(swatch);
      });
      load.textContent = "Load";
      remove.textContent = "Delete";
      load.onclick = () => loadTheme(theme);
      remove.onclick = () => {
        state.themes = state.themes.filter((entry) => entry.id !== theme.id);
        renderThemes();
        commitHistory();
      };
      buttons.append(load, remove);
      card.append(name, swatches, buttons);
      host.appendChild(card);
    });
    if (!state.themes.length)
      host.innerHTML = '<p class="hint">No saved themes.</p>';
  }
  function addPage() {
    const p = {
      id: uid("page-"),
      name: "Page " + (state.pages.length + 1),
      background: currentPage().background,
      bindingMode: "none",
      binding: "",
    };
    state.pages.push(p);
    state.activePage = p.id;
    renderPage();
  }
  function deletePage(id) {
    if (
      state.pages.length === 1 ||
      !confirm("Delete this page and all of its components?")
    )
      return;
    state.pages = state.pages.filter((p) => p.id !== id);
    const fallbackPage = state.pages[0].id;
    state.items.forEach((item) => {
      if (item.pageId === id && item.master) item.pageId = fallbackPage;
    });
    state.items = state.items
      .filter((i) => i.pageId !== id || i.master)
      .map((i) => {
        if (i.targetPage === id) i.targetPage = "";
        return i;
      });
    if (state.activePage === id) state.activePage = state.pages[0].id;
    renderPage();
  }
  function renderPageInspector() {
    const p = currentPage();
    $("page-name").value = p.name;
    $("page-background").value = p.background;
    $("page-binding-mode").value = p.bindingMode;
    $("page-binding").value = p.binding;
    syncPageBinding();
  }
  function refreshTargets() {
    const target = $("prop-target"),
      value = current()?.targetPage || "";
    target.innerHTML = '<option value="">No page change</option>';
    state.pages.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      target.appendChild(o);
    });
    target.value = value;
  }
  function select(id, additive = false) {
    let ids = state.selectedIds || [];
    if (additive === "preserve") ids = ids.slice();
    else if (!id) ids = [];
    else if (additive)
      ids = ids.includes(id)
        ? ids.filter((value) => value !== id)
        : [...ids, id];
    else {
      const clicked = state.items.find((item) => item.id === id);
      ids =
        clicked && clicked.groupId
          ? state.items
              .filter(
                (item) =>
                  item.pageId === clicked.pageId &&
                  item.groupId === clicked.groupId,
              )
              .map((item) => item.id)
          : [id];
    }
    state.selectedIds = ids;
    state.selected = ids.includes(id) ? id : ids[ids.length - 1] || null;
    document
      .querySelectorAll(".widget")
      .forEach((e) =>
        e.classList.toggle("selected", ids.includes(e.dataset.id)),
      );
    const item = current(),
      selection = selectedItems(),
      multiple = selection.length > 1,
      locked = selection.some((entry) => entry.locked);
    $("properties").hidden = !item || multiple;
    $("empty-inspector").hidden = !!item && !multiple;
    $("empty-inspector").textContent = multiple
      ? `${selection.length} components selected. Use the canvas commands to move, align, group, copy, lock, or delete them.`
      : "Select an item on the panel.";
    if ($("align-component")) $("align-component").disabled = !item || locked;
    if ($("layer-component"))
      $("layer-component").disabled = !item || locked || multiple;
    if (item && !multiple) {
      $("prop-name").value = item.name;
      $("prop-x").value = item.x;
      $("prop-y").value = item.y;
      $("prop-w").value = item.w;
      $("prop-h").value = item.h;
      $("prop-z").value = item.z;
      ["x", "y", "w", "h", "z"].forEach(
        (key) => ($("prop-" + key).disabled = locked),
      );
      $("edit-source").disabled = !!item.componentId;
      refreshTargets();
      renderProperties(item);
      renderBindings(item);
    }
    renderLayers();
  }
  function renderProperties(item) {
    const section = $("component-properties-section"),
      host = $("component-properties"),
      definition =
        item.componentId && window.ComposerRuntime.get(item.componentId),
      properties = ((definition && definition.properties) || []).filter(
        (property) => !property.signalSetting,
      );
    section.hidden = !properties.length;
    host.innerHTML = "";
    properties.forEach((property) => {
      const label = document.createElement("label");
      label.textContent = property.name;
      if (property.type === "text-list") {
        const list = document.createElement("div"),
          count = Math.max(
            1,
            Math.min(
              48,
              Number(item.properties && item.properties[property.countKey]) ||
                1,
            ),
          ),
          values = String(
            (item.properties && item.properties[property.key]) ??
              property.defaultValue ??
              "",
          ).split("|");
        list.className = "property-text-list";
        for (let i = 0; i < count; i++) {
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = (property.itemName || "Item") + " " + (i + 1);
          input.value = values[i] || "";
          input.oninput = () => {
            values[i] = input.value;
            item.properties = item.properties || {};
            item.properties[property.key] = values.join("|");
            renderItem(item);
          };
          list.appendChild(input);
        }
        label.appendChild(list);
        host.appendChild(label);
        return;
      }
      const input = document.createElement(
        property.type === "select" ? "select" : "input",
      );
      if (property.type === "select")
        (property.options || []).forEach((option) => {
          const el = document.createElement("option");
          el.value = option.value;
          el.textContent = option.label;
          input.appendChild(el);
        });
      else
        input.type =
          property.type === "number"
            ? "number"
            : property.type === "color"
              ? "color"
              : "text";
      input.value =
        (item.properties && item.properties[property.key]) ??
        property.defaultValue ??
        "";
      input.oninput = () => {
        item.properties = item.properties || {};
        item.properties[property.key] =
          property.type === "number" ? Number(input.value) : input.value;
        renderItem(item);
        if (property.affectsProperties) renderProperties(item);
        if (property.affectsBindings) renderBindings(item);
      };
      label.appendChild(input);
      host.appendChild(label);
    });
  }
  function findBindings(source) {
    const found = [],
      re =
        /\b(var|let|const)\s+([A-Za-z_$][\w$]*Signal)\s*=\s*(["'])(.*?)\3\s*;/g;
    let m;
    while ((m = re.exec(source))) {
      const prefix = source
        .slice(source.lastIndexOf("\n", m.index) + 1, m.index)
        .trim();
      if (!prefix.startsWith("//"))
        found.push({
          declaration: m[1],
          name: m[2],
          value: m[4],
          start: m.index,
          end: re.lastIndex,
          quote: m[3],
        });
    }
    return found;
  }
  function replaceBinding(item, binding, value) {
    const match = findBindings(item.source).find(
      (x) => x.name === binding.name,
    );
    if (!match) return;
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(new RegExp(match.quote, "g"), "\\" + match.quote);
    item.source =
      item.source.slice(0, match.start) +
      match.declaration +
      " " +
      match.name +
      " = " +
      match.quote +
      escaped +
      match.quote +
      ";" +
      item.source.slice(match.end);
    renderItem(item);
  }
  function collectProjectSignals() {
    const rows = [];
    state.pages.forEach((page) => {
      if (page.bindingMode === "none") return;
      rows.push({
        page: page.name,
        widget: "Page selection",
        name: "External page selection",
        type: "digital",
        direction: "input",
        mode: page.bindingMode,
        value: page.binding || "",
        pageId: page.id,
        setMode(mode) {
          page.bindingMode = mode;
        },
        setValue(value) {
          page.binding = value;
        },
      });
    });
    state.items.forEach((item) => {
      const page = item.master
        ? "Global"
        : state.pages.find((entry) => entry.id === item.pageId)?.name ||
          "Missing page";
      if (item.componentId) {
        const definition = window.ComposerRuntime.get(item.componentId);
        if (!definition) return;
        const overall =
          (item.properties && item.properties.bindingMode) || "contract";
        (definition.signals || []).forEach((signal) => {
          const binding =
            item.signalBindings[signal.key] ||
            (item.signalBindings[signal.key] = { mode: overall, value: "" });
          rows.push({
            page,
            widget: item.name,
            name: signal.name,
            type: signal.type,
            direction: signal.direction,
            mode: overall,
            value: binding.value || "",
            itemId: item.id,
            setMode(mode) {
              item.properties.bindingMode = mode;
              Object.values(item.signalBindings || {}).forEach(
                (entry) => (entry.mode = mode),
              );
            },
            setValue(value) {
              binding.value = value;
            },
          });
        });
        (definition.addressBindings || []).forEach((address) =>
          rows.push({
            page,
            widget: item.name,
            name: address.name,
            type: address.type,
            direction: address.direction,
            mode: overall,
            value: String(item.properties[address.key] || ""),
            itemId: item.id,
            setMode(mode) {
              item.properties.bindingMode = mode;
            },
            setValue(value) {
              item.properties[address.key] = value;
            },
          }),
        );
        (definition.rangeBindings || []).forEach((range) =>
          rows.push({
            page,
            widget: item.name,
            name: range.name,
            type: range.type,
            direction: range.direction,
            mode: overall,
            value: String(item.properties[range.baseKey] || ""),
            itemId: item.id,
            range: true,
            rangeCount: Math.max(
              1,
              Math.min(
                100,
                Math.round(
                  Number(
                    item.properties.maxItems ||
                      item.properties.maxCards ||
                      item.properties.maxSlides ||
                      item.properties.maxButtons ||
                      item.properties.maxCount ||
                      item.properties.defaultCount ||
                      1,
                  ) || 1,
                ),
              ),
            ),
            rangeIncrement: Math.max(
              1,
              Math.round(Number(item.properties[range.incrementKey] || 1) || 1),
            ),
            setMode(mode) {
              item.properties.bindingMode = mode;
            },
            setValue(value) {
              item.properties[range.baseKey] = value;
            },
          }),
        );
      } else {
        findBindings(item.source || "").forEach((binding) => {
          const name = binding.name,
            type = /text|label|name/i.test(name)
              ? "serial"
              : /level|position|value|analog/i.test(name)
                ? "analog"
                : "digital",
            direction = /feedback|text|label|name|value/i.test(name)
              ? "input"
              : "output";
          rows.push({
            page,
            widget: item.name,
            name,
            type,
            direction,
            mode: /^\d+$/.test(binding.value) ? "join" : "contract",
            value: binding.value,
            setMode() {},
            setValue(value) {
              replaceBinding(item, binding, value);
            },
          });
        });
      }
    });
    return rows;
  }
  function renderSignalManager() {
    const rows = collectProjectSignals(),
      query = String($("signal-search").value || "")
        .trim()
        .toLowerCase(),
      counts = new Map();
    rows.forEach((row) => {
      if (!row.value) return;
      const key = `${row.type}:${row.direction}:${row.value}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const shown = rows.filter(
        (row) =>
          !query ||
          `${row.page} ${row.widget} ${row.name} ${row.type} ${row.direction} ${row.mode} ${row.value}`
            .toLowerCase()
            .includes(query),
      ),
      body = $("signal-table-body");
    body.innerHTML = "";
    shown.forEach((row) => {
      const tr = document.createElement("tr"),
        duplicate =
          row.value &&
          counts.get(`${row.type}:${row.direction}:${row.value}`) > 1,
        missing = !String(row.value).trim();
      tr.className = duplicate
        ? "signal-duplicate"
        : missing
          ? "signal-warning"
          : "";
      [row.page, row.widget, row.name, row.type, row.direction].forEach(
        (text) => {
          const td = document.createElement("td");
          td.textContent = text;
          tr.appendChild(td);
        },
      );
      const modeCell = document.createElement("td"),
        mode = document.createElement("select"),
        addressCell = document.createElement("td"),
        input = document.createElement("input"),
        status = document.createElement("td");
      mode.innerHTML =
        '<option value="contract">Contract</option><option value="join">Join</option>';
      mode.value = row.mode;
      mode.onchange = () => {
        row.setMode(mode.value);
        renderSignalManager();
        scheduleHistory();
      };
      input.className = "signal-address";
      input.value = row.value;
      input.placeholder =
        mode.value === "join" ? "Join number" : "Contract signal";
      input.onchange = () => {
        row.setValue(input.value.trim());
        renderPage();
        renderSignalManager();
        scheduleHistory();
      };
      status.textContent = duplicate ? "Duplicate" : missing ? "Unbound" : "OK";
      modeCell.appendChild(mode);
      addressCell.appendChild(input);
      tr.append(modeCell, addressCell, status);
      body.appendChild(tr);
    });
    const unbound = rows.filter((row) => !String(row.value).trim()).length,
      duplicates = rows.filter(
        (row) =>
          row.value &&
          counts.get(`${row.type}:${row.direction}:${row.value}`) > 1,
      ).length;
    $("signal-summary").textContent =
      `${rows.length} signals · ${unbound} unbound · ${duplicates} duplicate rows · ${shown.length} shown`;
  }
  function signalCsv() {
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`,
      rows = collectProjectSignals();
    return [
      ["Page", "Widget", "Signal", "Type", "Direction", "Mode", "Address"],
      ...rows.map((row) => [
        row.page,
        row.widget,
        row.name,
        row.type,
        row.direction,
        row.mode,
        row.value,
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
  }
  function stableContractId(value) {
    let a = 2166136261,
      b = 2246822519;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      a = Math.imul(a ^ code, 16777619) >>> 0;
      b = Math.imul(b ^ code, 3266489917) >>> 0;
    }
    return `_${a.toString(36)}${b.toString(36)}`.slice(0, 18);
  }
  function simplIdentifier(value) {
    const identifier = String(value || "")
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return /^[A-Za-z_]/.test(identifier) ? identifier : `_${identifier}`;
  }
  function contractRangeCount(row) {
    if (!row.range || !row.itemId) return 1;
    const item = state.items.find((entry) => entry.id === row.itemId),
      p = (item && item.properties) || {},
      preferred = [
        p.maxItems,
        p.maxCards,
        p.maxSlides,
        p.maxButtons,
        p.maxCount,
        p.defaultCount,
      ].find((value) => Number(value) > 0);
    return Math.max(1, Math.min(100, Math.round(Number(preferred) || 1)));
  }
  function expandedContractSignals() {
    const rows = [];
    collectProjectSignals()
      .filter(
        (row) => row.mode === "contract" && String(row.value || "").trim(),
      )
      .forEach((row) => {
        const count = /\{n\}|\{index\}/.test(row.value)
          ? contractRangeCount(row)
          : 1;
        for (let index = 0; index < count; index++)
          rows.push({
            ...row,
            value: String(row.value)
              .replace(/\{n\}/g, String(index + 1))
              .replace(/\{index\}/g, String(index)),
          });
      });
    return rows;
  }
  function contractBuildData() {
    const rows = expandedContractSignals(),
      errors = [],
      paths = new Map(),
      components = new Map();
    rows.forEach((row) => {
      const value = row.value.trim(),
        parts = value.split(".").filter(Boolean);
      if (parts.length < 2) {
        errors.push(`“${value}” needs a component and signal name.`);
        return;
      }
      if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)) {
        errors.push(`“${value}” contains unsupported contract characters.`);
        return;
      }
      const prior = paths.get(value);
      if (prior)
        errors.push(
          `“${value}” is assigned more than once (${prior.widget} and ${row.widget}).`,
        );
      else paths.set(value, row);
      const instancePath = parts.slice(0, -1).join("."),
        instanceName = simplIdentifier(instancePath),
        attributeName = simplIdentifier(parts[parts.length - 1]),
        key = instanceName,
        component = components.get(key) || {
          instanceName,
          instancePath,
          rows: [],
        };
      if (component.instancePath !== instancePath) {
        errors.push(
          `“${instancePath}” and “${component.instancePath}” both become the SIMPL name “${instanceName}”. Rename one of the contract paths.`,
        );
        return;
      }
      component.rows.push({ ...row, attributeName });
      components.set(key, component);
    });
    const contractId = stableContractId(`contract:${state.contract.name}`),
      cceComponents = [],
      specifications = [];
    components.forEach((component) => {
      const componentId = stableContractId(
          `component:${component.instanceName}`,
        ),
        commands = [],
        feedbacks = [],
        byAttribute = new Map();
      component.rows.forEach((row) => {
        const id = stableContractId(
            `${row.direction}:${row.type}:${row.value}`,
          ),
          entry = {
            Errors: [],
            name: row.attributeName,
            siblingId: "",
            dataType:
              row.type === "digital" ? 1 : row.type === "analog" ? 2 : 3,
            notes: `${row.page} · ${row.widget} · ${row.name}`,
            id,
            parentId: componentId,
            attributeType: row.direction === "output" ? 0 : 1,
          },
          sibling = byAttribute.get(`${row.type}:${row.attributeName}`);
        if (sibling) {
          entry.siblingId = sibling.id;
          sibling.entry.siblingId = id;
        } else
          byAttribute.set(`${row.type}:${row.attributeName}`, {
            id,
            entry,
          });
        (row.direction === "output" ? commands : feedbacks).push(entry);
      });
      cceComponents.push({
        Errors: [],
        parentId: contractId,
        id: componentId,
        name: component.instanceName,
        description: `Generated from Crestron UI Composer (${component.rows[0]?.page || "Project"})`,
        commands,
        feedbacks,
        specifications: [],
      });
      specifications.push({
        Errors: [],
        parentId: contractId,
        id: stableContractId(`specification:${component.instanceName}`),
        componentId,
        instanceName: component.instanceName,
        numberOfInstances: 1,
      });
    });
    const contract = {
      Errors: [],
      id: contractId,
      name: state.contract.name,
      description: state.contract.description,
      company: state.contract.company,
      client: state.contract.client,
      author: state.contract.author,
      version: state.contract.version,
      schemaVersion: 1,
      subContractLinks: [],
      subContracts: [],
      specifications,
      components: cceComponents,
      allComponentsForAllContracts: [],
    };
    return { contract, rows, errors };
  }
  function syncContractMetadata() {
    ["name", "description", "company", "client", "author", "version"].forEach(
      (key) => {
        const input = $(`contract-${key}`);
        input.value = state.contract[key] || "";
        input.oninput = () => {
          state.contract[key] = input.value.trim();
          renderContractSummary();
          scheduleHistory();
        };
      },
    );
  }
  function renderContractSummary() {
    const result = contractBuildData(),
      host = $("contract-summary"),
      status = $("contract-status");
    host.innerHTML = "";
    result.rows.slice(0, 250).forEach((row) => {
      const entry = document.createElement("div");
      entry.className = "contract-summary-row";
      entry.innerHTML = `<span></span><span></span><span></span>`;
      entry.children[0].textContent = row.value;
      entry.children[1].textContent = row.type;
      entry.children[2].textContent =
        row.direction === "output" ? "Command" : "Feedback";
      host.appendChild(entry);
    });
    if (!result.rows.length)
      host.innerHTML =
        '<p class="hint" style="padding:12px">No contract bindings are assigned.</p>';
    status.textContent = result.errors.length
      ? `${result.errors.length} contract error${result.errors.length === 1 ? "" : "s"}: ${result.errors[0]}`
      : `${result.rows.length} signals in ${result.contract.components.length} Contract Editor components.`;
    status.classList.toggle("error", !!result.errors.length);
    $("contract-export").disabled =
      !!result.errors.length || !result.rows.length;
    $("contract-open").disabled = !!result.errors.length || !result.rows.length;
  }
  async function saveContractEditorProject(openAfterSave) {
    if (!approveExport()) return;
    const result = contractBuildData();
    if (result.errors.length) {
      alert(result.errors.join("\n"));
      return;
    }
    if (!result.rows.length) {
      alert("Assign at least one contract binding before exporting.");
      return;
    }
    const contents = JSON.stringify(result.contract, null, "\t"),
      command = openAfterSave
        ? "openContractEditorProject"
        : "saveContractEditorProject";
    try {
      if (native) {
        const saved = await nativeRequest(command, {
          contents,
          name: state.contract.name,
        });
        $("contract-status").textContent = openAfterSave
          ? `Saved and opened ${saved.path}`
          : `Exported ${saved.path}`;
      } else if (!openAfterSave)
        download(
          `${state.contract.name || "CrestronUiContract"}.cce`,
          contents,
          "application/json",
        );
      else
        alert(
          "Opening Contract Editor is available in the Windows application.",
        );
    } catch (error) {
      if (error.message !== "cancelled") {
        $("contract-status").textContent = error.message;
        alert(error.message);
      }
    }
  }
  const signalTypeCode = (type) =>
    type === "digital" ? "b" : type === "analog" ? "n" : "s";
  let simulatorTimer = 0;
  const deploymentSettingsKey = "crestron-ui-composer-deployment-v1";
  function deploymentSettings() {
    try {
      return (
        JSON.parse(localStorage.getItem(deploymentSettingsKey) || "{}") || {}
      );
    } catch (_) {
      return {};
    }
  }
  function saveDeploymentSettings(patch) {
    const settings = { ...deploymentSettings(), ...patch };
    localStorage.setItem(deploymentSettingsKey, JSON.stringify(settings));
    return settings;
  }
  function renderDeploymentHistory() {
    const host = $("deployment-history"),
      settings = deploymentSettings(),
      history = settings.history || [];
    host.innerHTML = "";
    history.forEach((entry) => {
      const row = document.createElement("div"),
        rollback = document.createElement("button"),
        title = document.createElement("strong"),
        detail = document.createElement("small");
      row.className = "deployment-entry";
      rollback.type = "button";
      rollback.textContent = "Use backup";
      rollback.onclick = () => {
        $("deploy-package").value = entry.backupPath;
        saveDeploymentSettings({ packagePath: entry.backupPath });
        $("deploy-status").textContent =
          `Rollback package selected: ${entry.backupPath}`;
      };
      title.textContent = `${entry.host} · ${entry.slowMode ? "slow mode" : "normal mode"}`;
      detail.textContent = `${new Date(entry.time).toLocaleString()} · ${entry.device || "Touchscreen"}${entry.resolution ? ` · ${entry.resolution}` : ""} · ${entry.packagePath}`;
      row.append(rollback, title, detail);
      host.appendChild(row);
    });
    if (!history.length)
      host.innerHTML =
        '<p class="hint" style="padding:10px">No deployments launched yet.</p>';
  }
  async function refreshSystemDiagnostics() {
    const host = $("system-diagnostic-list");
    host.innerHTML = '<p class="hint">Checking system…</p>';
    try {
      const info = await nativeRequest("systemDiagnostics"),
        rows = [
          ["Application", info.appVersion, true],
          ["Windows", `${info.os} · ${info.architecture}`, true],
          [".NET runtime", info.dotnet, true],
          ["WebView2", info.webView2, !!info.webView2],
          ["Node.js", info.node || "Not found", !!info.node],
          ["NPM", info.npm || "Not found", !!info.npm],
          ["Crestron ch5-cli", info.ch5Cli || "Not found", !!info.ch5Cli],
          [
            "CLI location",
            info.ch5CliPath || "Not installed",
            !!info.ch5CliPath,
          ],
          ["Install mode", info.portable ? "Portable" : "Installed", true],
          ["Install folder", info.installFolder, true],
          ["Settings folder", info.settingsFolder, true],
        ];
      host.innerHTML = "";
      rows.forEach(([name, value, ok]) => {
        const row = document.createElement("div"),
          label = document.createElement("strong"),
          detail = document.createElement("code"),
          status = document.createElement("span");
        row.className = "system-diagnostic-row";
        label.textContent = name;
        detail.textContent = value;
        detail.title = value;
        status.className = ok ? "ok" : "missing";
        status.textContent = ok ? "OK" : "MISSING";
        row.append(label, detail, status);
        host.appendChild(row);
      });
    } catch (error) {
      host.innerHTML = `<p class="hint">Diagnostics failed: ${error.message}</p>`;
    }
  }
  function setSimulatedSignal(row, value) {
    if (!row.value) return;
    window.ComposerRuntime.simulator.set(
      signalTypeCode(row.type),
      String(row.value),
      value,
    );
    if (
      row.pageId &&
      row.type === "digital" &&
      (value === true || value === 1)
    ) {
      state.activePage = row.pageId;
      renderPage();
    }
    refreshSimulatorEvents();
  }
  function renderSignalSimulator() {
    const query = String($("simulator-search").value || "")
        .trim()
        .toLowerCase(),
      rows = collectProjectSignals().filter(
        (row) =>
          !query ||
          `${row.page} ${row.widget} ${row.name} ${row.type} ${row.value}`
            .toLowerCase()
            .includes(query),
      ),
      body = $("simulator-table-body"),
      simulator = window.ComposerRuntime.simulator;
    body.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      [
        row.page,
        row.widget,
        row.name,
        `${row.type} · ${row.direction}`,
        row.value || "Unbound",
      ].forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      const controlCell = document.createElement("td"),
        key = `${signalTypeCode(row.type)}:${row.value}`;
      if (!row.value) controlCell.textContent = "—";
      else if (row.type === "digital" && row.direction === "output") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "simulator-toggle";
        button.textContent = "PULSE";
        button.onclick = () => {
          setSimulatedSignal(row, true);
          button.classList.add("on");
          setTimeout(() => {
            setSimulatedSignal(row, false);
            button.classList.remove("on");
          }, 120);
        };
        controlCell.appendChild(button);
      } else if (row.type === "digital") {
        const button = document.createElement("button"),
          currentValue = simulator.values.get(key) === true;
        button.type = "button";
        button.className = `simulator-toggle${currentValue ? " on" : ""}`;
        button.textContent = currentValue ? "TRUE" : "FALSE";
        button.onclick = () => {
          const next = !(simulator.values.get(key) === true);
          setSimulatedSignal(row, next);
          button.classList.toggle("on", next);
          button.textContent = next ? "TRUE" : "FALSE";
        };
        controlCell.appendChild(button);
      } else {
        const input = document.createElement("input");
        input.type = row.type === "analog" ? "number" : "text";
        input.value = simulator.values.get(key) ?? "";
        input.placeholder =
          row.type === "analog"
            ? "0–65535"
            : row.direction === "output"
              ? "Publish serial"
              : "Serial value";
        if (row.type === "analog") {
          input.min = "0";
          input.max = "65535";
        }
        input.onchange = () =>
          setSimulatedSignal(
            row,
            row.type === "analog"
              ? Math.max(
                  0,
                  Math.min(65535, Math.round(Number(input.value) || 0)),
                )
              : input.value,
          );
        controlCell.appendChild(input);
      }
      tr.appendChild(controlCell);
      body.appendChild(tr);
    });
    refreshSimulatorEvents();
  }
  function simulatorLogText() {
    return window.ComposerRuntime.simulator.events
      .slice(-500)
      .map(
        (event) =>
          `${new Date(event.time).toLocaleTimeString()}  ${event.type}  ${event.signal} = ${JSON.stringify(event.value)}`,
      )
      .join("\n");
  }
  function refreshSimulatorEvents() {
    const host = $("simulator-event-log");
    if (!host) return;
    const atBottom =
      host.scrollTop + host.clientHeight >= host.scrollHeight - 12;
    host.textContent = simulatorLogText() || "No signal events yet.";
    if (atBottom) host.scrollTop = host.scrollHeight;
  }
  function renderBindings(item) {
    if (item.componentId) {
      renderStructuredBindings(item);
      return;
    }
    const host = $("signal-bindings"),
      bindings = findBindings(item.source);
    host.innerHTML = "";
    if (!bindings.length) {
      host.innerHTML =
        '<div class="signal-empty">No variables ending in “Signal” were detected.</div>';
      return;
    }
    bindings.forEach((binding) => {
      const row = document.createElement("div"),
        title = document.createElement("strong"),
        controls = document.createElement("div"),
        mode = document.createElement("select"),
        value = document.createElement("input"),
        help = document.createElement("small");
      row.className = "signal-binding";
      controls.className = "binding-controls";
      title.textContent = binding.name;
      mode.innerHTML =
        '<option value="join">Join</option><option value="contract">Contract</option>';
      mode.value = /^\d+$/.test(binding.value.trim()) ? "join" : "contract";
      value.value = binding.value;
      function sync() {
        const join = mode.value === "join";
        value.type = join ? "number" : "text";
        value.min = join ? "1" : "";
        value.placeholder = join ? "Join number" : "Example: Room.Lights.On";
        help.textContent = join
          ? "Numeric digital, analog, or serial join"
          : "Named contract signal";
      }
      mode.onchange = () => {
        sync();
        value.focus();
        value.select();
      };
      value.onchange = () => {
        let next = value.value.trim();
        if (mode.value === "join") {
          next = String(Math.max(1, Math.round(Number(next) || 1)));
          value.value = next;
        } else if (!next) return;
        replaceBinding(item, binding, next);
        renderBindings(item);
      };
      sync();
      controls.append(mode, value);
      row.append(title, controls, help);
      host.appendChild(row);
    });
  }
  function renderStructuredBindings(item) {
    const host = $("signal-bindings"),
      definition = window.ComposerRuntime.get(item.componentId),
      overall = (definition.properties || []).some(
        (p) => p.key === "bindingMode",
      )
        ? (item.properties && item.properties.bindingMode) || "join"
        : "";
    host.innerHTML = "";
    definition.signals.forEach((signal) => {
      const binding =
          item.signalBindings[signal.key] ||
          (item.signalBindings[signal.key] = {
            mode: overall || "join",
            value: "",
          }),
        row = document.createElement("div"),
        title = document.createElement("strong"),
        controls = document.createElement("div"),
        mode = document.createElement("select"),
        value = document.createElement("input"),
        help = document.createElement("small");
      row.className = "signal-binding";
      controls.className = "binding-controls";
      title.textContent = signal.name;
      mode.innerHTML =
        '<option value="join">Join</option><option value="contract">Contract</option>';
      if (overall) binding.mode = overall;
      mode.value = binding.mode;
      value.value = binding.value;
      function sync() {
        const join = (overall || mode.value) === "join";
        value.type = join ? "number" : "text";
        value.min = join ? "1" : "";
        value.placeholder = join ? "Join number" : "Contract signal name";
        help.textContent =
          signal.type +
          " · " +
          signal.direction +
          (overall ? " · " + overall : "");
      }
      mode.onchange = () => {
        binding.mode = mode.value;
        sync();
        value.focus();
        value.select();
      };
      value.onchange = () => {
        const selectedMode = overall || mode.value;
        binding.mode = selectedMode;
        binding.value =
          selectedMode === "join"
            ? String(Math.max(1, Math.round(Number(value.value) || 1)))
            : value.value.trim();
        value.value = binding.value;
        renderItem(item);
      };
      sync();
      if (!overall) controls.appendChild(mode);
      controls.appendChild(value);
      row.append(title, controls, help);
      host.appendChild(row);
    });
    (definition.addressBindings || []).forEach((address) => {
      const row = document.createElement("div"),
        title = document.createElement("strong"),
        controls = document.createElement("div"),
        value = document.createElement("input"),
        help = document.createElement("small"),
        bindingMode = overall || "join";
      row.className = "signal-binding";
      controls.className = "binding-controls";
      title.textContent = address.name;
      value.value = (item.properties && item.properties[address.key]) || "";
      value.type = bindingMode === "join" ? "number" : "text";
      value.min = bindingMode === "join" ? "1" : "";
      value.placeholder =
        bindingMode === "join" ? "Join number" : "Contract signal name";
      value.onchange = () => {
        item.properties = item.properties || {};
        item.properties[address.key] =
          bindingMode === "join"
            ? String(Math.max(1, Math.round(Number(value.value) || 1)))
            : value.value.trim();
        value.value = item.properties[address.key];
        renderItem(item);
      };
      controls.appendChild(value);
      help.textContent =
        address.type + " · " + address.direction + " · " + bindingMode;
      row.append(title, controls, help);
      host.appendChild(row);
    });
    (definition.rangeBindings || []).forEach((range) => {
      const row = document.createElement("div"),
        title = document.createElement("strong"),
        controls = document.createElement("div"),
        base = document.createElement("input"),
        increment = document.createElement("input"),
        help = document.createElement("small"),
        bindingMode = overall || "join";
      row.className = "signal-binding";
      controls.className = "binding-controls";
      title.textContent = range.name;
      base.value = (item.properties && item.properties[range.baseKey]) || "";
      base.type = bindingMode === "join" ? "number" : "text";
      base.min = bindingMode === "join" ? "1" : "";
      base.placeholder =
        bindingMode === "join"
          ? "First join number"
          : "Example: Carousel.Slides.{n}.Press";
      base.onchange = () => {
        item.properties = item.properties || {};
        item.properties[range.baseKey] =
          bindingMode === "join"
            ? String(Math.max(1, Math.round(Number(base.value) || 1)))
            : base.value.trim();
        base.value = item.properties[range.baseKey];
        renderItem(item);
      };
      controls.appendChild(base);
      if (bindingMode === "join") {
        increment.type = "number";
        increment.min = "1";
        increment.value =
          (item.properties && item.properties[range.incrementKey]) || 1;
        increment.title = "Join increment";
        increment.placeholder = "Increment";
        increment.onchange = () => {
          item.properties[range.incrementKey] = Math.max(
            1,
            Math.round(Number(increment.value) || 1),
          );
          increment.value = item.properties[range.incrementKey];
          renderItem(item);
        };
        controls.appendChild(increment);
      }
      help.textContent =
        range.type +
        " · " +
        range.direction +
        " · " +
        (bindingMode === "join"
          ? "base join + increment"
          : "use {n} or {index}");
      row.append(title, controls, help);
      host.appendChild(row);
    });
    (definition.signalGroups || [])
      .filter(
        (group) =>
          !(definition.rangeBindings || []).some(
            (range) =>
              range.type === group.type && range.direction === group.direction,
          ),
      )
      .forEach((group) => {
        const row = document.createElement("div");
        row.className = "signal-binding";
        row.innerHTML =
          "<strong>" +
          group.name +
          "</strong><small>" +
          group.type +
          " · " +
          group.direction +
          "</small>";
        host.appendChild(row);
      });
  }
  function pointerOp(e, resize) {
    if (e.button === 2) return;
    e.stopPropagation();
    const item = state.items.find(
      (x) => x.id === e.currentTarget.closest(".widget").dataset.id,
    );
    if (e.shiftKey) {
      select(item.id, true);
      return;
    }
    if (!(state.selectedIds || []).includes(item.id)) select(item.id);
    else if (
      !item.groupId &&
      selectedItems().some((entry) => entry.locked) &&
      !item.locked
    )
      select(item.id);
    const selection = selectedItems();
    if (item.locked === true) {
      setStatus(`“${item.name}” is locked`);
      return;
    }
    const movingItems = selection.filter((entry) => entry.locked !== true);
    const sx = e.clientX,
      sy = e.clientY,
      start = { x: item.x, y: item.y, w: item.w, h: item.h },
      starts = movingItems.map((entry) => ({
        item: entry,
        x: entry.x,
        y: entry.y,
        w: entry.w,
        h: entry.h,
      }));
    const bounds = {
      left: Math.min(...starts.map((entry) => entry.x)),
      top: Math.min(...starts.map((entry) => entry.y)),
      right: Math.max(...starts.map((entry) => entry.x + entry.w)),
      bottom: Math.max(...starts.map((entry) => entry.y + entry.h)),
    };
    function move(ev) {
      if (resize) {
        if (movingItems.length === 1) {
          item.w = Math.max(20, snap(start.w + ev.clientX - sx));
          item.h = Math.max(20, snap(start.h + ev.clientY - sy));
        } else {
          const originalWidth = Math.max(1, bounds.right - bounds.left),
            originalHeight = Math.max(1, bounds.bottom - bounds.top),
            scaleX = Math.max(
              0.05,
              (originalWidth + ev.clientX - sx) / originalWidth,
            ),
            scaleY = Math.max(
              0.05,
              (originalHeight + ev.clientY - sy) / originalHeight,
            );
          starts.forEach((entry) => {
            entry.item.x = snap(bounds.left + (entry.x - bounds.left) * scaleX);
            entry.item.y = snap(bounds.top + (entry.y - bounds.top) * scaleY);
            entry.item.w = Math.max(20, snap(entry.w * scaleX));
            entry.item.h = Math.max(20, snap(entry.h * scaleY));
          });
        }
      } else {
        const dx = snap(ev.clientX - sx),
          dy = snap(ev.clientY - sy);
        starts.forEach((entry) => {
          entry.item.x = entry.x + dx;
          entry.item.y = entry.y + dy;
        });
      }
      movingItems.forEach(renderItem);
      selectMany((state.selectedIds || []).slice(), item.id);
    }
    function up() {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    }
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  }
  function selectMany(ids, primary = ids[ids.length - 1] || null) {
    state.selectedIds = ids.filter((id) =>
      state.items.some((item) => item.id === id),
    );
    state.selected = state.selectedIds.includes(primary)
      ? primary
      : state.selectedIds[0] || null;
    document
      .querySelectorAll(".widget")
      .forEach((element) =>
        element.classList.toggle(
          "selected",
          state.selectedIds.includes(element.dataset.id),
        ),
      );
    select(state.selected, "preserve");
  }
  function startMove(e) {
    if (!e.target.classList.contains("handle")) pointerOp(e, false);
  }
  function startResize(e) {
    pointerOp(e, true);
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function validateProject() {
    const issues = [],
      used = new Map(),
      add = (severity, message) => issues.push({ severity, message }),
      key = (type, direction, value) =>
        type + ":" + direction + ":" + String(value).trim();
    if (!state.items.length) add("warning", "The project has no components.");
    const device = selectedDevice();
    if (device.supportsCh5 === false)
      add("error", device.name + " does not support CH5 projects.");
    if (device.supportsCh5 == null)
      add("warning", device.name + " has not been verified for CH5.");
    if (!state.pages.length) add("error", "The project has no pages.");
    if (!state.pages.some((page) => page.id === state.activePage))
      add("error", "The active page no longer exists.");
    const pageIds = new Set(),
      pageNames = new Set();
    state.pages.forEach((page) => {
      if (!String(page.name || "").trim()) add("error", "A page has no name.");
      if (pageIds.has(page.id))
        add("error", `Page ID “${page.id}” is duplicated.`);
      pageIds.add(page.id);
      const normalizedName = String(page.name || "")
        .trim()
        .toLowerCase();
      if (pageNames.has(normalizedName))
        add("warning", `Page name “${page.name}” is duplicated.`);
      pageNames.add(normalizedName);
      if (page.bindingMode !== "none" && !String(page.binding || "").trim())
        add("error", `Page “${page.name}” has no external selection signal.`);
    });

    const assetIds = new Set();
    state.assets.forEach((asset) => {
      if (!asset.id)
        add("error", `Asset “${asset.name || "Unnamed"}” has no ID.`);
      else if (assetIds.has(asset.id))
        add("error", `Asset ID “${asset.id}” is duplicated.`);
      else assetIds.add(asset.id);
      if (!asset.dataUrl || !/^data:/i.test(asset.dataUrl))
        add("error", `Asset “${asset.name || asset.id}” has no embedded data.`);
    });
    const checkAsset = (assetId, owner) => {
      if (assetId && !assetIds.has(assetId))
        add("error", `${owner} references missing asset “${assetId}”.`);
    };
    state.pages.forEach((page) =>
      checkAsset(page.backgroundAsset, `Page “${page.name}”`),
    );
    state.pageTemplates.forEach((template) => {
      checkAsset(template.backgroundAsset, `Page template “${template.name}”`);
      (template.items || []).forEach((item) => {
        checkAsset(item.assetId, `Page template “${template.name}”`);
        checkAsset(item.backgroundAsset, `Page template “${template.name}”`);
      });
    });
    state.reusables.forEach((reusable) =>
      (reusable.items || []).forEach((item) => {
        checkAsset(item.assetId, `Reusable “${reusable.name}”`);
        checkAsset(item.backgroundAsset, `Reusable “${reusable.name}”`);
      }),
    );

    const unsupported = new Set(device.unsupportedComponents || []),
      supported = device.supportedComponents
        ? new Set(device.supportedComponents)
        : null,
      capabilities = new Set(device.capabilities || []);
    state.items.forEach((item) => {
      if (!item.master && !pageIds.has(item.pageId))
        add("error", `“${item.name}” belongs to a page that no longer exists.`);
      if (
        item.x < 0 ||
        item.y < 0 ||
        item.x + item.w > state.width ||
        item.y + item.h > state.height
      )
        add(
          "error",
          `“${item.name}” is outside the ${state.width} × ${state.height} panel bounds.`,
        );
      if (item.w < 20 || item.h < 20)
        add("error", `“${item.name}” is smaller than the editor minimum.`);
      if (![item.x, item.y, item.w, item.h, item.z].every(Number.isFinite))
        add(
          "error",
          `“${item.name}” has invalid position, size, or z-index data.`,
        );
      if (
        item.targetPage &&
        !state.pages.some((page) => page.id === item.targetPage)
      )
        add("error", `“${item.name}” targets a page that no longer exists.`);
      checkAsset(item.assetId, `“${item.name}”`);
      checkAsset(item.backgroundAsset, `“${item.name}”`);
      if (!item.componentId) {
        if (!String(item.source || "").trim())
          add("error", `“${item.name}” has no custom HTML source.`);
        return;
      }
      const definition = window.ComposerRuntime.get(item.componentId);
      if (!definition) {
        add(
          "error",
          `“${item.name}” references missing component ${item.componentId}.`,
        );
        return;
      }
      if (unsupported.has(item.componentId))
        add("error", `${device.name} does not support “${item.name}”.`);
      if (supported && !supported.has(item.componentId))
        add(
          "warning",
          `“${item.name}” is not listed as supported by ${device.name}.`,
        );
      (definition.requiresCapabilities || []).forEach((capability) => {
        if (!capabilities.has(capability))
          add(
            "error",
            `“${item.name}” requires unsupported panel capability “${capability}”.`,
          );
      });
    });

    const expandedSignals = [];
    collectProjectSignals().forEach((row) => {
      const value = String(row.value || "").trim(),
        count = row.range ? Math.max(1, Number(row.rangeCount) || 1) : 1;
      if (!value) {
        add(
          "warning",
          `${row.page} · “${row.widget}” has no ${row.name} binding.`,
        );
        return;
      }
      if (row.mode === "join") {
        if (
          !/^\d+$/.test(value) ||
          Number(value) < 1 ||
          Number(value) > 65535
        ) {
          add(
            "error",
            `${row.page} · “${row.widget}” has invalid ${row.name} join “${value}”.`,
          );
          return;
        }
        for (let index = 0; index < count; index++) {
          const expandedJoin =
            Number(value) + index * (row.rangeIncrement || 1);
          if (expandedJoin > 65535)
            add(
              "error",
              `${row.page} · “${row.widget}” ${row.name} expands beyond join 65535.`,
            );
          else expandedSignals.push({ ...row, value: String(expandedJoin) });
        }
      } else {
        if (!/^[A-Za-z_][A-Za-z0-9_.{}-]*$/.test(value)) {
          add(
            "error",
            `${row.page} · “${row.widget}” has invalid ${row.name} contract “${value}”.`,
          );
          return;
        }
        if (row.range && count > 1 && !/\{n\}|\{index\}/.test(value))
          add(
            "error",
            `${row.page} · “${row.widget}” ${row.name} needs {n} or {index} for ${count} entries.`,
          );
        for (let index = 0; index < count; index++)
          expandedSignals.push({
            ...row,
            value: value
              .replace(/\{n\}/g, String(index + 1))
              .replace(/\{index\}/g, String(index)),
          });
      }
    });
    expandedSignals.forEach((row) => {
      const signalKey = key(row.type, row.direction, row.value),
        owner = `${row.page} · “${row.widget}” ${row.name}`;
      if (used.has(signalKey))
        add(
          "warning",
          `${owner} duplicates ${row.mode} signal ${row.value} used by ${used.get(signalKey)}.`,
        );
      else used.set(signalKey, owner);
    });
    const contractResult = contractBuildData();
    contractResult.errors.forEach((message) => add("error", message));

    const estimatedBytes = JSON.stringify(project()).length,
      maximumBytes = Number(device.maximumProjectSizeMb || 0) * 1024 * 1024;
    if (maximumBytes && estimatedBytes > maximumBytes)
      add(
        "error",
        `Estimated project size ${(estimatedBytes / 1024 / 1024).toFixed(1)} MB exceeds ${device.name} limit of ${device.maximumProjectSizeMb} MB.`,
      );
    else if (maximumBytes && estimatedBytes > maximumBytes * 0.85)
      add(
        "warning",
        `Estimated project size is ${(estimatedBytes / maximumBytes).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 0 })} of the ${device.name} limit.`,
      );
    for (let a = 0; a < state.items.length; a++)
      for (let b = a + 1; b < state.items.length; b++) {
        const x = state.items[a],
          y = state.items[b];
        if (x.pageId !== y.pageId) continue;
        const overlap =
          x.x < y.x + y.w &&
          x.x + x.w > y.x &&
          x.y < y.y + y.h &&
          x.y + x.h > y.y;
        if (overlap)
          add(
            "warning",
            `“${x.name}” overlaps “${y.name}” on ${state.pages.find((p) => p.id === x.pageId)?.name || "a page"}.`,
          );
      }
    return issues;
  }
  function validationReport(issues) {
    const errors = issues.filter((x) => x.severity === "error"),
      warnings = issues.filter((x) => x.severity === "warning"),
      lines = [`${errors.length} error(s), ${warnings.length} warning(s)`];
    issues.forEach((issue, index) =>
      lines.push(
        `${index + 1}. ${issue.severity.toUpperCase()}: ${issue.message}`,
      ),
    );
    return lines.join("\n");
  }
  function runValidation(interactive = true) {
    const issues = validateProject(),
      errors = issues.filter((x) => x.severity === "error");
    if (interactive)
      alert(
        issues.length
          ? validationReport(issues)
          : "Validation passed. No project issues were found.",
      );
    setStatus(
      issues.length
        ? `${errors.length} validation errors, ${issues.length - errors.length} warnings`
        : "Validation passed",
    );
    return { issues, errors };
  }
  function approveExport() {
    const result = runValidation(false);
    if (result.errors.length) {
      alert(validationReport(result.issues));
      return false;
    }
    if (
      result.issues.length &&
      !confirm(validationReport(result.issues) + "\n\nContinue anyway?")
    )
      return false;
    return true;
  }
  function project() {
    return {
      version: 3,
      width: state.width,
      height: state.height,
      targetDevice: state.targetDevice,
      targetDeviceProfile: {
        ...selectedDevice(),
        width: state.width,
        height: state.height,
      },
      diagnostics: state.diagnostics,
      pages: state.pages,
      activePage: state.activePage,
      items: state.items,
      assets: state.assets,
      reusables: state.reusables,
      pageTemplates: state.pageTemplates,
      themes: state.themes,
      contract: state.contract,
    };
  }
  function exportHtml() {
    return window.ComposerExporter.exportProject(project());
  }
  function syncPageBinding() {
    const mode = $("page-binding-mode").value,
      label = $("page-binding-label"),
      input = $("page-binding");
    label.hidden = mode === "none";
    input.type = mode === "join" ? "number" : "text";
    input.placeholder =
      mode === "join" ? "Digital join number" : "Example: Navigation.Home";
  }
  stage.onpointerdown = (e) => {
    if (e.target !== stage || e.button !== 0) return;
    const rect = stage.getBoundingClientRect(),
      startX = e.clientX - rect.left,
      startY = e.clientY - rect.top,
      prior = e.shiftKey ? (state.selectedIds || []).slice() : [],
      marquee = document.createElement("div");
    marquee.className = "selection-marquee";
    marquee.style.left = `${startX}px`;
    marquee.style.top = `${startY}px`;
    stage.appendChild(marquee);
    if (!e.shiftKey) select(null);
    function move(event) {
      const x = event.clientX - rect.left,
        y = event.clientY - rect.top,
        left = Math.min(startX, x),
        top = Math.min(startY, y),
        right = Math.max(startX, x),
        bottom = Math.max(startY, y);
      Object.assign(marquee.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
      });
      const hit = state.items
        .filter(
          (item) =>
            (item.pageId === state.activePage || item.master) &&
            item.x < right &&
            item.x + item.w > left &&
            item.y < bottom &&
            item.y + item.h > top,
        )
        .map((item) => item.id);
      selectMany(
        [...new Set([...prior, ...hit])],
        hit[hit.length - 1] || prior[prior.length - 1],
      );
    }
    function up() {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      marquee.remove();
    }
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };
  stage.ondragover = (e) => e.preventDefault();
  stage.ondrop = (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const assetId = e.dataTransfer.getData("text/asset");
    if (assetId) {
      createAssetItem(assetId, e.clientX - r.left, e.clientY - r.top);
      return;
    }
    createItem(
      e.dataTransfer.getData("text/component"),
      e.clientX - r.left,
      e.clientY - r.top,
    );
  };
  $("snippet-files").onchange = async (e) => {
    for (const f of e.target.files) addComponent(f.name, await f.text());
    setStatus(e.target.files.length + " snippets imported");
  };
  $("snippet-files-label").onclick = async (e) => {
    if (!native) return;
    e.preventDefault();
    try {
      const files = await nativeRequest("importSnippets");
      files.forEach((f) => addComponent(f.name, f.html));
      setStatus(files.length + " snippets imported");
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("component-search").oninput = renderComponentLibrary;
  $("layer-search").oninput = renderLayers;
  $("asset-search").oninput = renderAssets;
  $("asset-files").onchange = async (event) => {
    const imported = await Promise.all(
      [...event.target.files].map(readAssetFile),
    );
    state.assets.push(...imported);
    event.target.value = "";
    renderAssets();
    commitHistory();
    setStatus(
      `Imported ${imported.length} asset${imported.length === 1 ? "" : "s"}`,
    );
  };
  $("asset-replace-file").onchange = async (event) => {
    const file = event.target.files[0],
      asset = state.assets.find(
        (entry) => entry.id === event.target.dataset.assetId,
      );
    if (!file || !asset) return;
    const replacement = await readAssetFile(file);
    asset.name = replacement.name;
    asset.type = replacement.type;
    asset.size = replacement.size;
    asset.dataUrl = replacement.dataUrl;
    state.items
      .filter((item) => item.assetId === asset.id)
      .forEach((item) => {
        item.name = asset.name;
        item.source = assetSource(asset);
      });
    event.target.value = "";
    renderPage();
    commitHistory();
    setStatus(`Replaced asset with “${asset.name}”`);
  };
  $("asset-audit").onclick = () => {
    const unused = state.assets.filter((asset) => !assetUsage(asset.id)),
      missing = new Set();
    state.pages.forEach((page) => {
      if (
        page.backgroundAsset &&
        !state.assets.some((asset) => asset.id === page.backgroundAsset)
      )
        missing.add(page.backgroundAsset);
    });
    state.items.forEach((item) =>
      [item.assetId, item.backgroundAsset].filter(Boolean).forEach((id) => {
        if (!state.assets.some((asset) => asset.id === id)) missing.add(id);
      }),
    );
    alert(
      `Asset audit\n\n${state.assets.length} total asset(s)\n${unused.length} unused asset(s)\n${missing.size} missing reference(s)`,
    );
    setStatus(`Asset audit: ${unused.length} unused, ${missing.size} missing`);
  };
  $("asset-clean").onclick = () => {
    const unused = state.assets.filter((asset) => !assetUsage(asset.id));
    if (!unused.length) {
      setStatus("No unused assets");
      return;
    }
    if (
      !confirm(
        `Remove ${unused.length} unused asset${unused.length === 1 ? "" : "s"}?`,
      )
    )
      return;
    const ids = new Set(unused.map((asset) => asset.id));
    state.assets = state.assets.filter((asset) => !ids.has(asset.id));
    renderAssets();
    commitHistory();
    setStatus(
      `Removed ${unused.length} unused asset${unused.length === 1 ? "" : "s"}`,
    );
  };
  ["name", "x", "y", "w", "h", "z"].forEach(
    (k) =>
      ($("prop-" + k).oninput = (e) => {
        const i = current();
        if (!i) return;
        i[k] = k === "name" ? e.target.value : Number(e.target.value);
        renderItem(i);
        if (k === "name" || k === "z") renderLayers();
      }),
  );
  $("prop-target").onchange = (e) => {
    if (current()) current().targetPage = e.target.value;
  };
  function copySelected() {
    const items = selectedItems();
    if (!items.length) return;
    componentClipboard = JSON.stringify(items);
    setStatus(
      items.length === 1
        ? "Copied “" + items[0].name + "”"
        : `Copied ${items.length} components`,
    );
  }
  function pasteComponent() {
    if (!componentClipboard) return;
    const source = JSON.parse(componentClipboard),
      sourceItems = Array.isArray(source) ? source : [source],
      groupMap = new Map(),
      baseZ = Math.max(
        0,
        ...state.items
          .filter((x) => x.pageId === state.activePage || x.master)
          .map((x) => Number(x.z) || 0),
      ),
      pasted = sourceItems.map((original, index) => {
        const item = structuredClone(original);
        item.id = uid("item-");
        item.pageId = state.activePage;
        item.x = Math.max(
          0,
          Math.min(state.width - item.w, Number(item.x || 0) + 20),
        );
        item.y = Math.max(
          0,
          Math.min(state.height - item.h, Number(item.y || 0) + 20),
        );
        item.z = baseZ + index + 1;
        if (item.groupId) {
          if (!groupMap.has(item.groupId))
            groupMap.set(item.groupId, uid("group-"));
          item.groupId = groupMap.get(item.groupId);
        }
        if (
          item.targetPage &&
          !state.pages.some((page) => page.id === item.targetPage)
        )
          item.targetPage = "";
        return item;
      });
    state.items.push(...pasted);
    componentClipboard = JSON.stringify(pasted);
    pasted.forEach(renderItem);
    selectMany(
      pasted.map((item) => item.id),
      pasted[pasted.length - 1].id,
    );
    commitHistory();
    setStatus(
      pasted.length === 1
        ? "Pasted “" + pasted[0].name + "”"
        : `Pasted ${pasted.length} components`,
    );
  }
  function cutSelected() {
    if (!selectedItems().length || selectedItems().some((item) => item.locked))
      return;
    copySelected();
    $("delete").click();
    setStatus("Cut component");
  }
  $("snap-grid").onchange = (e) => {
    snapEnabled = e.target.checked;
    setStatus(
      snapEnabled ? `Grid snapping: ${snapSize}px` : "Grid snapping off",
    );
  };
  $("snap-size").onchange = (e) => {
    snapSize = Math.max(
      1,
      Math.min(200, Math.round(Number(e.target.value) || 10)),
    );
    e.target.value = snapSize;
    setStatus(`Grid size: ${snapSize}px`);
  };
  $("align-component").onchange = (e) => {
    const items = selectedItems(),
      item = current(),
      mode = e.target.value;
    if (!item || !mode) return;
    const bounds = {
      left: Math.min(...items.map((entry) => entry.x)),
      right: Math.max(...items.map((entry) => entry.x + entry.w)),
      top: Math.min(...items.map((entry) => entry.y)),
      bottom: Math.max(...items.map((entry) => entry.y + entry.h)),
    };
    items.forEach((entry) => {
      if (mode === "left") entry.x = items.length > 1 ? bounds.left : 0;
      if (mode === "center")
        entry.x =
          items.length > 1
            ? (bounds.left + bounds.right - entry.w) / 2
            : (state.width - entry.w) / 2;
      if (mode === "right")
        entry.x =
          items.length > 1 ? bounds.right - entry.w : state.width - entry.w;
      if (mode === "top") entry.y = items.length > 1 ? bounds.top : 0;
      if (mode === "middle")
        entry.y =
          items.length > 1
            ? (bounds.top + bounds.bottom - entry.h) / 2
            : (state.height - entry.h) / 2;
      if (mode === "bottom")
        entry.y =
          items.length > 1 ? bounds.bottom - entry.h : state.height - entry.h;
      entry.x = snap(entry.x);
      entry.y = snap(entry.y);
    });
    if (mode === "distribute-h" && items.length > 2) {
      const sorted = [...items].sort((a, b) => a.x - b.x),
        space =
          (bounds.right -
            bounds.left -
            sorted.reduce((sum, entry) => sum + entry.w, 0)) /
          (sorted.length - 1);
      let x = bounds.left;
      sorted.forEach((entry) => {
        entry.x = snap(x);
        x += entry.w + space;
      });
    }
    if (mode === "distribute-v" && items.length > 2) {
      const sorted = [...items].sort((a, b) => a.y - b.y),
        space =
          (bounds.bottom -
            bounds.top -
            sorted.reduce((sum, entry) => sum + entry.h, 0)) /
          (sorted.length - 1);
      let y = bounds.top;
      sorted.forEach((entry) => {
        entry.y = snap(y);
        y += entry.h + space;
      });
    }
    items.forEach(renderItem);
    selectMany(
      items.map((entry) => entry.id),
      item.id,
    );
    commitHistory();
    setStatus(
      `${mode.startsWith("distribute") ? "Distributed" : "Aligned"} ${items.length === 1 ? `“${item.name}”` : `${items.length} components`} ${mode}`,
    );
    e.target.value = "";
  };
  $("layer-component").onchange = (e) => {
    const item = current(),
      mode = e.target.value;
    if (!item || !mode) return;
    const pageItems = state.items
        .filter((x) => x.pageId === state.activePage || x.master)
        .sort((a, b) => (Number(a.z) || 0) - (Number(b.z) || 0)),
      index = pageItems.indexOf(item);
    if (mode === "front") {
      pageItems.splice(index, 1);
      pageItems.push(item);
    }
    if (mode === "back") {
      pageItems.splice(index, 1);
      pageItems.unshift(item);
    }
    if (mode === "forward" && index < pageItems.length - 1) {
      [pageItems[index], pageItems[index + 1]] = [
        pageItems[index + 1],
        pageItems[index],
      ];
    }
    if (mode === "backward" && index > 0) {
      [pageItems[index], pageItems[index - 1]] = [
        pageItems[index - 1],
        pageItems[index],
      ];
    }
    pageItems.forEach((entry, z) => (entry.z = z + 1));
    pageItems.forEach(renderItem);
    select(item.id);
    commitHistory();
    setStatus(`Layer changed: “${item.name}”`);
    e.target.value = "";
  };
  function toggleSelectedLock() {
    const items = selectedItems();
    if (!items.length) return;
    const lock = !items.some((item) => item.locked);
    items.forEach((item) => {
      item.locked = lock;
      renderItem(item);
    });
    selectMany(
      items.map((item) => item.id),
      items[items.length - 1].id,
    );
    commitHistory();
    setStatus(
      `${lock ? "Locked" : "Unlocked"} ${items.length === 1 ? `“${items[0].name}”` : `${items.length} components`}`,
    );
  }
  const contextMenu = $("canvas-context-menu");
  const layerContextMenu = $("layer-context-menu");
  function hideContextMenu() {
    contextMenu.hidden = true;
    layerContextMenu.hidden = true;
  }
  function positionContextMenu(menu, event) {
    menu.hidden = false;
    const width = menu.offsetWidth,
      height = menu.offsetHeight;
    menu.style.left = `${Math.max(6, Math.min(event.clientX, window.innerWidth - width - 6))}px`;
    menu.style.top = `${Math.max(6, Math.min(event.clientY, window.innerHeight - height - 6))}px`;
  }
  function showLayerContextMenu(event, itemId) {
    event.preventDefault();
    event.stopPropagation();
    if (!(state.selectedIds || []).includes(itemId)) select(itemId);
    const selection = selectedItems();
    $("layer-rename").disabled = selection.length !== 1;
    $("layer-duplicate").disabled = !selection.length;
    $("layer-delete").disabled =
      !selection.length || selection.some((item) => item.locked);
    contextMenu.hidden = true;
    positionContextMenu(layerContextMenu, event);
  }
  stage.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const widget = e.target.closest(".widget");
    if (widget) {
      if (!(state.selectedIds || []).includes(widget.dataset.id))
        select(widget.dataset.id);
    } else select(null);
    const item = current(),
      selection = selectedItems();
    $("context-copy").disabled = !selection.length;
    $("context-paste").disabled = !componentClipboard;
    $("context-lock").disabled = !selection.length;
    $("context-lock").textContent = selection.some((entry) => entry.locked)
      ? "Unlock"
      : "Lock";
    $("context-group").disabled =
      selection.length < 2 || selection.some((entry) => entry.locked);
    $("context-ungroup").disabled =
      !selection.some((entry) => entry.groupId) ||
      selection.some((entry) => entry.locked);
    $("context-delete").disabled =
      !selection.length || selection.some((entry) => entry.locked);
    $("context-save-reusable").disabled = !selection.length;
    $("context-update-reusable").disabled =
      !selection.length || !selection[0]?.reusableId;
    $("context-detach-reusable").disabled =
      !selection.length || !selection[0]?.linkedInstanceId;
    $("context-master").disabled = !selection.length;
    $("context-master").textContent =
      selection.length && selection.every((item) => item.master)
        ? "Remove from global layer"
        : "Make global on every page";
    layerContextMenu.hidden = true;
    positionContextMenu(contextMenu, e);
  });
  $("context-copy").onclick = () => {
    copySelected();
    hideContextMenu();
  };
  $("context-paste").onclick = () => {
    pasteComponent();
    hideContextMenu();
  };
  $("context-lock").onclick = () => {
    toggleSelectedLock();
    hideContextMenu();
  };
  $("context-group").onclick = () => {
    const items = selectedItems(),
      groupId = uid("group-");
    items.forEach((item) => {
      item.groupId = groupId;
      renderItem(item);
    });
    selectMany(
      items.map((item) => item.id),
      items[items.length - 1].id,
    );
    commitHistory();
    setStatus(`Grouped ${items.length} components`);
    hideContextMenu();
  };
  $("context-ungroup").onclick = () => {
    const items = selectedItems();
    items.forEach((item) => {
      delete item.groupId;
      renderItem(item);
    });
    selectMany(
      items.map((item) => item.id),
      items[items.length - 1].id,
    );
    commitHistory();
    setStatus(`Ungrouped ${items.length} components`);
    hideContextMenu();
  };
  $("context-save-reusable").onclick = () => {
    saveReusableSelection();
    hideContextMenu();
  };
  $("context-update-reusable").onclick = () => {
    updateReusableInstances();
    hideContextMenu();
  };
  $("context-detach-reusable").onclick = () => {
    detachReusableInstance();
    hideContextMenu();
  };
  $("context-master").onclick = () => {
    const items = selectedItems(),
      makeGlobal = !items.every((item) => item.master);
    items.forEach((item) => {
      item.master = makeGlobal;
      if (!makeGlobal) item.pageId = state.activePage;
    });
    renderPage();
    commitHistory();
    setStatus(
      `${makeGlobal ? "Added" : "Removed"} ${items.length} component${items.length === 1 ? "" : "s"} ${makeGlobal ? "to" : "from"} the global layer`,
    );
    hideContextMenu();
  };
  $("context-delete").onclick = () => {
    $("delete").click();
    hideContextMenu();
  };
  $("layer-rename").onclick = () => {
    const item = current();
    if (!item) return;
    const name = prompt("Layer name", item.name);
    if (name && name.trim()) {
      item.name = name.trim();
      if ($("prop-name")) $("prop-name").value = item.name;
      renderLayers();
      commitHistory();
      setStatus(`Renamed layer to “${item.name}”`);
    }
    hideContextMenu();
  };
  $("layer-duplicate").onclick = () => {
    copySelected();
    pasteComponent();
    hideContextMenu();
  };
  $("layer-delete").onclick = () => {
    $("delete").click();
    hideContextMenu();
  };
  document.addEventListener("pointerdown", (e) => {
    if (
      (!contextMenu.hidden && !contextMenu.contains(e.target)) ||
      (!layerContextMenu.hidden && !layerContextMenu.contains(e.target))
    )
      hideContextMenu();
  });
  window.addEventListener("blur", hideContextMenu);
  window.addEventListener("resize", hideContextMenu);
  $("delete").onclick = () => {
    const items = selectedItems();
    if (!items.length) return;
    if (items.some((item) => item.locked)) {
      alert("Unlock the selected components before deleting them.");
      return;
    }
    const ids = new Set(items.map((item) => item.id));
    items.forEach((item) =>
      stage.querySelector('.widget[data-id="' + item.id + '"]')?.remove(),
    );
    state.items = state.items.filter((item) => !ids.has(item.id));
    select(null);
    commitHistory();
    setStatus(
      items.length === 1
        ? `Deleted “${items[0].name}”`
        : `Deleted ${items.length} components`,
    );
  };
  $("duplicate").onclick = () => {
    if (!current()) return;
    copySelected();
    pasteComponent();
  };
  $("edit-source").onclick = () => {
    if (current()) {
      $("source-editor").value = current().source;
      $("source-dialog").showModal();
    }
  };
  $("apply-source").onclick = () => {
    if (current()) {
      current().source = $("source-editor").value;
      renderItem(current());
    }
  };
  $("add-page").onclick = addPage;
  $("save-reusable").onclick = saveReusableSelection;
  $("save-page-template").onclick = savePageTemplate;
  $("theme-selection").onclick = () => applyTheme("selection");
  $("theme-page-apply").onclick = () => applyTheme("page");
  $("theme-project").onclick = () => applyTheme("project");
  $("theme-save").onclick = () => {
    const name = prompt("Theme name", "Custom theme");
    if (!name || !name.trim()) return;
    state.themes.push({
      id: uid("theme-"),
      name: name.trim(),
      ...currentTheme(),
    });
    renderThemes();
    commitHistory();
    setStatus(`Saved theme “${name.trim()}”`);
  };
  $("page-name").oninput = (e) => {
    currentPage().name = e.target.value;
    renderPages();
  };
  $("page-background").oninput = (e) => {
    currentPage().background = e.target.value;
    stage.style.backgroundColor = e.target.value;
  };
  $("page-binding-mode").onchange = (e) => {
    currentPage().bindingMode = e.target.value;
    syncPageBinding();
  };
  $("page-binding").oninput = (e) =>
    (currentPage().binding = e.target.value.trim());
  function resize(w, h) {
    state.width = w;
    state.height = h;
    stage.style.width = w + "px";
    stage.style.height = h + "px";
  }
  $("target-device").onchange = (e) => applyDevice(e.target.value);
  ["width", "height"].forEach(
    (k) =>
      ($("panel-" + k).oninput = (e) =>
        resize(
          k === "width" ? +e.target.value : state.width,
          k === "height" ? +e.target.value : state.height,
        )),
  );
  async function loadProjectText(text, markClean = true) {
    const p = JSON.parse(text);
    state.items = normalizeItemStates(p.items);
    state.assets = p.assets || [];
    state.reusables = p.reusables || [];
    state.pageTemplates = p.pageTemplates || [];
    state.themes = p.themes || [];
    state.contract = { ...state.contract, ...(p.contract || {}) };
    state.pages = p.pages || [
      { ...firstPage, background: p.background || firstPage.background },
    ];
    state.activePage = p.activePage || state.pages[0].id;
    state.targetDevice =
      p.targetDevice ||
      (p.width === 1920 && p.height === 1200 ? "tsw-1070" : "custom");
    state.diagnostics = !!p.diagnostics;
    $("target-device").value = state.targetDevice;
    $("custom-size").hidden = state.targetDevice !== "custom";
    $("panel-width").value = p.width;
    $("panel-height").value = p.height;
    state.items.forEach((i) => {
      i.pageId = i.pageId || state.pages[0].id;
      const known = i.componentId
        ? state.components.some((c) => c.componentId === i.componentId)
        : state.components.some((c) => c.html === i.source);
      if (!known)
        addComponent(i.name + ".html", i.source || "", {
          componentId: i.componentId || "",
          runtime: i.componentId ? "scoped" : "legacy",
          name: i.name,
        });
    });
    resize(p.width, p.height);
    renderPage();
    commitHistory(false);
    if (markClean) markProjectSaved();
    setStatus("Project opened for " + selectedDevice().name);
  }
  $("save-project").onclick = async () => {
    const text = JSON.stringify(project(), null, 2);
    if (native) {
      try {
        const path = await nativeRequest("saveProject", text);
        markProjectSaved();
        setStatus("Saved to " + path);
      } catch (error) {
        if (error.message !== "cancelled") setStatus(error.message);
      }
    } else {
      download("crestron-ui-project.cuiproj", text, "application/json");
      markProjectSaved();
    }
  };
  $("validate-project").onclick = () => runValidation(true);
  $("signal-manager").onclick = () => {
    $("signal-search").value = "";
    renderSignalManager();
    $("signal-dialog").showModal();
  };
  $("signal-search").oninput = renderSignalManager;
  $("signal-export-csv").onclick = () =>
    download("crestron-signal-map.csv", signalCsv(), "text/csv");
  $("signal-simulator").onclick = () => {
    $("simulator-search").value = "";
    renderSignalSimulator();
    const dialog = $("simulator-dialog");
    if (!dialog.open) {
      dialog.style.left = `${Math.max(20, (window.innerWidth - Math.min(1200, window.innerWidth * 0.88)) / 2)}px`;
      dialog.style.top = "72px";
      dialog.show();
    }
    clearInterval(simulatorTimer);
    simulatorTimer = setInterval(refreshSimulatorEvents, 250);
  };
  $("simulator-search").oninput = renderSignalSimulator;
  $("simulator-clear").onclick = () => {
    window.ComposerRuntime.simulator.events.length = 0;
    refreshSimulatorEvents();
  };
  $("simulator-export").onclick = () =>
    download("crestron-simulator-events.txt", simulatorLogText(), "text/plain");
  $("simulator-dialog").addEventListener("close", () => {
    clearInterval(simulatorTimer);
    simulatorTimer = 0;
  });
  $("simulator-drag-handle").addEventListener("pointerdown", (event) => {
    if (event.target.closest("input,button,select")) return;
    const dialog = $("simulator-dialog"),
      rect = dialog.getBoundingClientRect(),
      startX = event.clientX,
      startY = event.clientY;
    event.preventDefault();
    function move(moveEvent) {
      const left = Math.max(
          0,
          Math.min(
            window.innerWidth - 120,
            rect.left + moveEvent.clientX - startX,
          ),
        ),
        top = Math.max(
          0,
          Math.min(
            window.innerHeight - 60,
            rect.top + moveEvent.clientY - startY,
          ),
        );
      dialog.style.left = `${left}px`;
      dialog.style.top = `${top}px`;
    }
    function up() {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    }
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
  $("export").onclick = async () => {
    if (!approveExport()) return;
    const text = exportHtml();
    if (native) {
      try {
        const path = await nativeRequest("exportHtml", text);
        setStatus("Exported to " + path);
      } catch (error) {
        if (error.message !== "cancelled") setStatus(error.message);
      }
    } else download("index.html", text, "text/html");
  };
  $("build-ch5").onclick = () => {
    syncContractMetadata();
    renderContractSummary();
    $("build-project-dialog").showModal();
  };
  $("contract-export").onclick = () => saveContractEditorProject(false);
  $("contract-open").onclick = () => saveContractEditorProject(true);
  $("build-project-ch5").onclick = async () => {
    if (!approveExport()) return;
    if (!native) {
      alert("CH5 packaging is available in the Windows application.");
      return;
    }
    const device = {
      ...selectedDevice(),
      width: state.width,
      height: state.height,
    };
    if (device.supportsCh5 === false) {
      alert(device.name + " does not support CH5 projects.");
      return;
    }
    if (
      device.supportsCh5 == null &&
      !confirm(
        "This custom target has not been verified for CH5. Build anyway?",
      )
    )
      return;
    const projectName = state.contract.name.trim();
    if (!projectName) return;
    const usesContracts =
      state.pages.some((p) => p.bindingMode === "contract") ||
      state.items.some((i) =>
        i.componentId
          ? Object.entries(i.properties || {}).some(
              ([key, value]) =>
                /bindingmode$/i.test(key) && value === "contract",
            ) ||
            Object.values(i.signalBindings || {}).some(
              (b) => b.mode === "contract",
            )
          : findBindings(i.source).some((b) => !/^[0-9]+$/.test(b.value)),
      );
    setStatus("Building Crestron package…");
    try {
      const result = await nativeRequest("buildCh5Package", {
        html: exportHtml(),
        projectName,
        usesContracts,
        device,
      });
      $("deploy-package").value = result.path;
      saveDeploymentSettings({ packagePath: result.path });
      $("contract-status").textContent =
        "Built " + result.path + " for " + device.name;
      setStatus("Built " + result.path + " for " + device.name);
    } catch (error) {
      if (error.message !== "cancelled") {
        setStatus("Build failed");
        alert(error.message);
      }
    }
  };
  $("deploy-panel").onclick = () => {
    if (!native) {
      alert("Panel deployment is available in the Windows application.");
      return;
    }
    const settings = deploymentSettings();
    $("deploy-host").value = settings.host || "";
    $("deploy-slow").checked = !!settings.slowMode;
    $("deploy-package").value = settings.packagePath || "";
    $("deploy-status").textContent = "Ready. Check the panel, then deploy.";
    renderDeploymentHistory();
    $("deployment-dialog").showModal();
  };
  $("deploy-host").onchange = () =>
    saveDeploymentSettings({ host: $("deploy-host").value.trim() });
  $("deploy-slow").onchange = () =>
    saveDeploymentSettings({ slowMode: $("deploy-slow").checked });
  $("deploy-check").onclick = async () => {
    const host = $("deploy-host").value.trim();
    $("deploy-status").textContent = `Checking ${host || "panel"}…`;
    try {
      const result = await nativeRequest("checkPanel", host);
      $("deploy-status").textContent = result.reachable
        ? `${host} is reachable · ${result.roundtripMs} ms`
        : `${host} did not respond · ${result.status}`;
      saveDeploymentSettings({ host });
    } catch (error) {
      $("deploy-status").textContent =
        `Reachability check failed: ${error.message}`;
    }
  };
  $("deploy-select").onclick = async () => {
    try {
      const result = await nativeRequest("selectCh5Package");
      $("deploy-package").value = result.path;
      saveDeploymentSettings({ packagePath: result.path });
      $("deploy-status").textContent =
        `Selected ${(result.size / 1024 / 1024).toFixed(2)} MB package.`;
    } catch (error) {
      if (error.message !== "cancelled")
        $("deploy-status").textContent = error.message;
    }
  };
  $("deploy-build").onclick = () => $("build-ch5").click();
  $("deploy-start").onclick = async () => {
    const host = $("deploy-host").value.trim(),
      packagePath = $("deploy-package").value,
      slowMode = $("deploy-slow").checked;
    if (!host || !packagePath) {
      $("deploy-status").textContent =
        "Enter a panel host and select or build a .ch5z package.";
      return;
    }
    if (
      !confirm(
        `Deploy ${packagePath}\n\nto TSW panel ${host}?\n\nA terminal will request the panel credentials.`,
      )
    )
      return;
    $("deploy-status").textContent =
      "Opening the Crestron deployment terminal…";
    try {
      const result = await nativeRequest("deployCh5Package", {
        host,
        packagePath,
        slowMode,
      });
      const settings = deploymentSettings(),
        history = [
          {
            time: new Date().toISOString(),
            host,
            packagePath,
            backupPath: result.backupPath,
            slowMode,
            device: selectedDevice().name,
            resolution: `${state.width} × ${state.height}`,
          },
          ...(settings.history || []),
        ].slice(0, 20);
      saveDeploymentSettings({ host, packagePath, slowMode, history });
      renderDeploymentHistory();
      $("deploy-status").textContent =
        "Deployment terminal opened. Enter credentials there and watch for “Success. Restarting UI”.";
    } catch (error) {
      $("deploy-status").textContent =
        `Deployment failed to start: ${error.message}`;
    }
  };
  $("system-diagnostics").onclick = () => {
    if (!native) {
      alert("System diagnostics are available in the Windows application.");
      return;
    }
    refreshSystemDiagnostics();
    $("system-dialog").showModal();
  };
  $("system-refresh").onclick = refreshSystemDiagnostics;
  $("system-install-webview").onclick = () =>
    nativeRequest("installPrerequisite", "webview2");
  $("system-install-node").onclick = () =>
    nativeRequest("installPrerequisite", "node");
  $("system-install-ch5").onclick = async () => {
    if (
      !confirm(
        "Open a terminal and install Crestron's official CH5 utilities globally with NPM?",
      )
    )
      return;
    await nativeRequest("installPrerequisite", "ch5cli");
  };
  $("system-open-settings").onclick = () => nativeRequest("openSettingsFolder");
  $("preview").onclick = () => {
    const w = open();
    w.document.write(exportHtml());
    w.document.close();
  };
  $("open-project").onchange = async (e) =>
    loadProjectText(await e.target.files[0].text());
  $("open-project-label").onclick = async (e) => {
    if (!native) return;
    e.preventDefault();
    try {
      const result = await nativeRequest("openProject");
      await loadProjectText(result.contents);
      setStatus("Opened " + result.path);
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("new-project").onclick = () => {
    if (
      (state.items.length ||
        state.assets.length ||
        state.reusables.length ||
        state.pageTemplates.length ||
        state.themes.length) &&
      !confirm("Clear this project?")
    )
      return;
    state.items = [];
    state.assets = [];
    state.reusables = [];
    state.pageTemplates = [];
    state.themes = [];
    state.contract = {
      name: "MyCrestronUI",
      description: "",
      company: "",
      client: "",
      author: "",
      version: "1.0.0.0",
    };
    state.pages = [{ ...firstPage }];
    state.activePage = firstPage.id;
    state.diagnostics = false;
    clearRecovery();
    projectDirty = false;
    applyDevice(state.targetDevice);
    renderPage();
    history.length = 0;
    historyIndex = -1;
    commitHistory(false);
    lastManualFingerprint = historyState();
    setAutosaveState("Saved");
  };
  $("undo").onclick = undo;
  $("redo").onclick = redo;
  addEventListener("keydown", (e) => {
    const editing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName),
      key = e.key.toLowerCase();
    if (!editing && (e.ctrlKey || e.metaKey) && key === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (!editing && (e.ctrlKey || e.metaKey) && key === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (!editing && (e.ctrlKey || e.metaKey) && key === "c") {
      e.preventDefault();
      copySelected();
      return;
    }
    if (!editing && (e.ctrlKey || e.metaKey) && key === "x") {
      e.preventDefault();
      cutSelected();
      return;
    }
    if (!editing && (e.ctrlKey || e.metaKey) && key === "v") {
      e.preventDefault();
      pasteComponent();
      return;
    }
    const i = current(),
      items = selectedItems();
    if (!i || editing) return;
    if (e.key === "Delete") $("delete").click();
    const d = e.shiftKey ? 10 : 1;
    if (e.key.startsWith("Arrow") && !items.some((item) => item.locked)) {
      e.preventDefault();
      items.forEach((item) => {
        if (e.key === "ArrowLeft") item.x -= d;
        if (e.key === "ArrowRight") item.x += d;
        if (e.key === "ArrowUp") item.y -= d;
        if (e.key === "ArrowDown") item.y += d;
        renderItem(item);
      });
      selectMany(
        items.map((item) => item.id),
        i.id,
      );
      scheduleHistory();
    }
  });
  document.addEventListener("input", scheduleHistory);
  document.addEventListener("change", scheduleHistory);
  document.addEventListener("click", scheduleHistory);
  addEventListener("pointerup", scheduleHistory);
  addEventListener("beforeunload", () => {
    clearTimeout(historyTimer);
    clearTimeout(autosaveTimer);
    if (!restoringHistory) commitHistory(false);
    persistAutosave(historyState(), true);
  });
  resize(1920, 1200);
  renderPages();
  renderPageInspector();
  commitHistory(false);
  Promise.all([loadDevices(), loadKnown()]).then(recoverAutosave);
})();
