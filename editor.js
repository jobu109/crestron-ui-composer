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
    transition: "none",
    transitionDuration: 350,
  };
  const state = {
    width: 1280,
    height: 800,
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
    customComponents: [],
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
  let actionClipboard = [];
  let lastHealthReport = "";
  let activeColorInput = null;
  let panelZoom = 1;
  let lastRenderedPageId = "";
  let customEditingId = "";
  let customBuilderSourceItemId = "";
  let sourceEditingComponent = false;
  let snapEnabled = true,
    snapSize = 10;
  const snap = (value) =>
    snapEnabled
      ? Math.round(Number(value) / Math.max(1, snapSize)) *
        Math.max(1, snapSize)
      : Math.round(Number(value));
  function setPanelZoom(value) {
    panelZoom = Math.max(0.1, Math.min(2, Math.round(value * 100) / 100));
    stage.style.zoom = panelZoom;
    $("zoom-level").textContent = `${Math.round(panelZoom * 100)}%`;
    localStorage.setItem("crestron-ui-composer-panel-zoom", panelZoom);
  }
  function fitPanel() {
    const viewport = document.querySelector(".stage-wrap"),
      horizontalPadding = 64,
      verticalPadding = 82,
      widthZoom = (viewport.clientWidth - horizontalPadding) / state.width,
      heightZoom = (viewport.clientHeight - verticalPadding) / state.height;
    setPanelZoom(Math.min(widthZoom, heightZoom, 1));
    viewport.scrollTo({ left: 0, top: 0 });
  }
  function wirePaneResizer(id, property, side, defaultWidth) {
    const handle = $(id),
      workspace = document.querySelector(".workspace");
    const saved = Number(
      localStorage.getItem(`crestron-ui-composer-${property}`),
    );
    if (Number.isFinite(saved) && saved >= 160)
      workspace.style.setProperty(`--${property}`, `${saved}px`);
    handle.ondblclick = () => {
      workspace.style.setProperty(`--${property}`, `${defaultWidth}px`);
      localStorage.removeItem(`crestron-ui-composer-${property}`);
    };
    handle.onpointerdown = (event) => {
      event.preventDefault();
      handle.classList.add("dragging");
      const startX = event.clientX,
        current = parseFloat(
          getComputedStyle(workspace).getPropertyValue(`--${property}`),
        );
      function move(moveEvent) {
        const delta = (moveEvent.clientX - startX) * side,
          maximum = Math.max(260, Math.min(640, window.innerWidth * 0.42)),
          width = Math.max(160, Math.min(maximum, current + delta));
        workspace.style.setProperty(`--${property}`, `${width}px`);
      }
      function up() {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        handle.classList.remove("dragging");
        const width = parseFloat(
          getComputedStyle(workspace).getPropertyValue(`--${property}`),
        );
        localStorage.setItem(`crestron-ui-composer-${property}`, width);
      }
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    };
  }
  function collapsiblePanelSection(title, nodes, key, open = true, anchor = nodes[0]) {
    if (!anchor || !nodes.length) return null;
    const details = document.createElement("details"),
      summary = document.createElement("summary"),
      body = document.createElement("div"),
      saved = localStorage.getItem(`crestron-ui-composer-section-${key}`);
    details.className = "side-panel-section";
    details.open = saved === null ? open : saved === "open";
    summary.textContent = title;
    body.className = "side-panel-section-body";
    anchor.parentNode.insertBefore(details, anchor);
    details.append(summary, body);
    nodes.forEach((node) => body.appendChild(node));
    details.addEventListener("toggle", () =>
      localStorage.setItem(
        `crestron-ui-composer-section-${key}`,
        details.open ? "open" : "closed",
      ),
    );
    return details;
  }
  function initializeCollapsibleSidePanels() {
    const sidebar = document.querySelector(".sidebar"),
      headings = [...sidebar.querySelectorAll(":scope > h2")];
    headings.forEach((heading, index) => {
      const stop = headings[index + 1], nodes = [];
      for (let node = heading.nextElementSibling; node && node !== stop; ) {
        const next = node.nextElementSibling;
        nodes.push(node);
        node = next;
      }
      const title = heading.textContent.trim(), key = `library-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      if (nodes.length) {
        const details = collapsiblePanelSection(
          title,
          nodes,
          key,
          index < 2 || title === "Page",
        );
        if (details && title === "Page") details.id = "page-library-section";
      }
      heading.remove();
    });

    const inspector = document.querySelector(".inspector"),
      form = $("properties"),
      firstSection = form.querySelector(":scope > section"),
      basicNodes = [];
    for (let node = form.firstElementChild; node && node !== firstSection; ) {
      const next = node.nextElementSibling;
      basicNodes.push(node);
      node = next;
    }
    if (basicNodes.length) collapsiblePanelSection("Widget", basicNodes, "inspector-widget", true);
    [...form.querySelectorAll(":scope > section")].forEach((section) => {
      const heading = section.querySelector(":scope > h2"),
        title = heading?.textContent.trim() || "Section",
        children = [...section.children].filter((child) => child !== heading),
        details = collapsiblePanelSection(
          title,
          children,
          `inspector-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title === "Component properties" || title === "Signal bindings",
          section,
        );
      if (details) {
        details.id = section.id;
        details.classList.add(...[...section.classList].filter((name) => name !== "signal-section"));
        details.hidden = section.hidden;
      }
      heading?.remove();
      section.remove();
    });
    const navigation = $("prop-target")?.closest("label");
    if (navigation) collapsiblePanelSection("Navigation", [navigation], "inspector-navigation", false);
    const actionStart = $("edit-source"), actionNodes = [];
    for (let node = actionStart; node; ) {
      const next = node.nextElementSibling;
      actionNodes.push(node);
      node = next;
    }
    if (actionNodes.length) collapsiblePanelSection("Widget actions", actionNodes, "inspector-actions", false);

    const pageHeading = [...inspector.querySelectorAll(":scope > h2")].find((heading) => heading.textContent.trim() === "Page");
    if (pageHeading) {
      const pageNodes = [];
      for (let node = pageHeading.nextElementSibling; node; ) {
        const next = node.nextElementSibling;
        pageNodes.push(node);
        node = next;
      }
      const pageBody = $("page-library-section")?.querySelector(
        ":scope > .side-panel-section-body",
      );
      if (pageBody) {
        const divider = document.createElement("div"),
          heading = document.createElement("h3"),
          settings = document.createElement("div");
        divider.className = "page-settings-divider";
        heading.className = "page-settings-title";
        heading.textContent = "Page settings";
        settings.className = "page-sidebar-settings";
        settings.append(...pageNodes);
        pageBody.append(divider, heading, settings);
      } else {
        collapsiblePanelSection("Page", pageNodes, "inspector-page", true);
      }
      pageHeading.remove();
    }
    const inspectorHeading = inspector.querySelector(":scope > h2");
    if (inspectorHeading) inspectorHeading.classList.add("side-panel-title");
  }
  function normalizeHexColor(value) {
    const text = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(text))
      return (
        "#" +
        text
          .slice(1)
          .split("")
          .map((part) => part + part)
          .join("")
      ).toLowerCase();
    return "";
  }
  function colorChannels(hex) {
    const value = normalizeHexColor(hex) || "#000000";
    return [1, 3, 5].map((index) =>
      parseInt(value.slice(index, index + 2), 16),
    );
  }
  function setColorDialogValue(hex, updateTarget = true) {
    const value = normalizeHexColor(hex);
    if (!value) return false;
    const [red, green, blue] = colorChannels(value);
    $("color-hex").value = value.toUpperCase();
    ["red", "green", "blue"].forEach((channel, index) => {
      $("color-" + channel).value = [red, green, blue][index];
      $("color-" + channel + "-value").value = [red, green, blue][index];
    });
    $("color-preview").style.background = value;
    $("color-native-input").value = value;
    if (updateTarget && activeColorInput) {
      activeColorInput.value = value;
      activeColorInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }
  function openColorDialog(input) {
    activeColorInput = input;
    const label = input.closest("label")?.textContent.trim();
    $("color-dialog-title").textContent = label
      ? `Choose ${label.toLowerCase()}`
      : "Choose color";
    setColorDialogValue(input.value, false);
    if (!$("color-dialog").open) $("color-dialog").showModal();
  }
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
      customComponents: state.customComponents,
      contract: state.contract,
    });
  }
  function describeHistoryChange(previousValue, nextValue) {
    if (!previousValue) return "Initial project state";
    const previous = JSON.parse(previousValue),
      next = JSON.parse(nextValue),
      oldItems = new Map((previous.items || []).map((item) => [item.id, item])),
      newItems = new Map((next.items || []).map((item) => [item.id, item])),
      addedItems = [...newItems.values()].filter(
        (item) => !oldItems.has(item.id),
      ),
      removedItems = [...oldItems.values()].filter(
        (item) => !newItems.has(item.id),
      );
    if (addedItems.length)
      return addedItems.length === 1
        ? `Added ${addedItems[0].name}`
        : `Added ${addedItems.length} widgets`;
    if (removedItems.length)
      return removedItems.length === 1
        ? `Deleted ${removedItems[0].name}`
        : `Deleted ${removedItems.length} widgets`;
    if ((next.pages || []).length !== (previous.pages || []).length)
      return (next.pages || []).length > (previous.pages || []).length
        ? "Added page"
        : "Deleted page";
    const changedPage = (next.pages || []).find((page) => {
      const old = (previous.pages || []).find((entry) => entry.id === page.id);
      return old && JSON.stringify(old) !== JSON.stringify(page);
    });
    if (changedPage) {
      const old = (previous.pages || []).find(
        (entry) => entry.id === changedPage.id,
      );
      if (old.name !== changedPage.name)
        return `Renamed page to ${changedPage.name}`;
      if (old.background !== changedPage.background)
        return `Changed ${changedPage.name} background`;
      return `Changed ${changedPage.name} page settings`;
    }
    if (previous.activePage !== next.activePage) {
      const page = (next.pages || []).find(
        (entry) => entry.id === next.activePage,
      );
      return `Opened ${page?.name || "page"}`;
    }
    const changed = [...newItems.values()].filter((item) => {
      const old = oldItems.get(item.id);
      return old && JSON.stringify(old) !== JSON.stringify(item);
    });
    if (changed.length > 1) {
      const grouped = changed.every(
          (item) => oldItems.get(item.id)?.groupId !== item.groupId,
        ),
        locked = changed.every(
          (item) => oldItems.get(item.id)?.locked !== item.locked,
        );
      if (grouped)
        return `${changed.every((item) => item.groupId) ? "Grouped" : "Ungrouped"} ${changed.length} widgets`;
      if (locked)
        return `${changed.every((item) => item.locked) ? "Locked" : "Unlocked"} ${changed.length} widgets`;
      return `Changed ${changed.length} widgets`;
    }
    if (changed.length === 1) {
      const item = changed[0],
        old = oldItems.get(item.id);
      if (old.name !== item.name) return `Renamed ${old.name} to ${item.name}`;
      if (old.x !== item.x || old.y !== item.y) return `Moved ${item.name}`;
      if (old.w !== item.w || old.h !== item.h) return `Resized ${item.name}`;
      if (old.locked !== item.locked)
        return `${item.locked ? "Locked" : "Unlocked"} ${item.name}`;
      if (old.hidden !== item.hidden)
        return `${item.hidden ? "Hid" : "Showed"} ${item.name}`;
      if (old.groupId !== item.groupId)
        return `${item.groupId ? "Grouped" : "Ungrouped"} ${item.name}`;
      if (old.master !== item.master)
        return `${item.master ? "Made global" : "Removed global"}: ${item.name}`;
      if (
        JSON.stringify(old.signalBindings) !==
        JSON.stringify(item.signalBindings)
      )
        return `Changed ${item.name} bindings`;
      if (JSON.stringify(old.properties) !== JSON.stringify(item.properties)) {
        const oldProperties = old.properties || {},
          newProperties = item.properties || {},
          keys = new Set([
            ...Object.keys(oldProperties),
            ...Object.keys(newProperties),
          ]),
          changedKeys = [...keys].filter(
            (key) => oldProperties[key] !== newProperties[key],
          );
        return changedKeys.some((key) =>
          /binding|signal|join|base|increment/i.test(key),
        )
          ? `Changed ${item.name} bindings`
          : `Styled ${item.name}`;
      }
      if (old.targetPage !== item.targetPage)
        return `Changed ${item.name} navigation`;
      if (JSON.stringify(old.interaction) !== JSON.stringify(item.interaction))
        return `Changed ${item.name} interaction`;
      if (
        JSON.stringify(old.interactions) !== JSON.stringify(item.interactions)
      )
        return `Changed ${item.name} timeline`;
      if (JSON.stringify(old.actions) !== JSON.stringify(item.actions))
        return `Changed ${item.name} actions`;
      return `Changed ${item.name}`;
    }
    if (previous.width !== next.width || previous.height !== next.height)
      return "Changed panel size";
    if (previous.targetDevice !== next.targetDevice)
      return "Changed target panel";
    if (JSON.stringify(previous.assets) !== JSON.stringify(next.assets))
      return "Changed project assets";
    if (JSON.stringify(previous.themes) !== JSON.stringify(next.themes))
      return "Changed themes";
    if (JSON.stringify(previous.contract) !== JSON.stringify(next.contract))
      return "Changed contract settings";
    return "Changed project";
  }
  function renderHistory() {
    const host = $("history-list");
    if (!host) return;
    host.innerHTML = "";
    history.forEach((entry, index) => {
      const button = document.createElement("button"),
        marker = document.createElement("span"),
        label = document.createElement("span");
      button.type = "button";
      button.className = `history-entry${index === historyIndex ? " current" : ""}${index > historyIndex ? " future" : ""}`;
      button.title = `${entry.label} · ${new Date(entry.time).toLocaleTimeString()}`;
      marker.className = "history-entry-index";
      marker.textContent =
        index === historyIndex ? "●" : index > historyIndex ? "○" : "✓";
      label.className = "history-entry-label";
      label.textContent = entry.label;
      button.append(marker, label);
      button.onclick = () => restoreHistory(index);
      host.appendChild(button);
    });
  }
  function updateHistoryButtons() {
    const undo = $("undo"),
      redo = $("redo");
    if (undo) undo.disabled = historyIndex <= 0;
    if (redo)
      redo.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
    renderHistory();
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
    synchronizeReusableMasters();
    const value = historyState();
    if (historyIndex >= 0 && history[historyIndex].state === value) return;
    const previous = historyIndex >= 0 ? history[historyIndex].state : "";
    history.splice(historyIndex + 1);
    history.push({
      state: value,
      label: describeHistoryChange(previous, value),
      time: new Date().toISOString(),
    });
    if (history.length > 100) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
    if (persist) writeAutosave(value);
  }
  function scheduleHistory() {
    if (restoringHistory) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(commitHistory, 250);
  }
  function restoreHistory(index) {
    if (index < 0 || index >= history.length || index === historyIndex) return;
    restoringHistory = true;
    const priorIndex = historyIndex,
      entry = history[index],
      saved = JSON.parse(entry.state);
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
    state.customComponents = saved.customComponents || [];
    state.customComponents.forEach(registerCustomComponent);
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
    writeAutosave(entry.state);
    setStatus(
      `${index < priorIndex ? "Undo" : index > priorIndex ? "Redo" : "History"}: ${entry.label}`,
    );
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
    p = window.ComposerProjectMigrations.migrate(p).project;
    state.items = normalizeItemStates(p.items);
    state.assets = p.assets || [];
    state.reusables = p.reusables || [];
    state.pageTemplates = p.pageTemplates || [];
    state.themes = p.themes || [];
    state.customComponents = p.customComponents || [];
    state.customComponents.forEach(registerCustomComponent);
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
    history.length = 0;
    historyIndex = -1;
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
        loadProjectText(m.contents, true, m.path).then(() => setStatus("Opened " + m.path));
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
  const topToolbar = document.querySelector(".toolbar");
  topToolbar.addEventListener("wheel", (event) => {
    if (topToolbar.scrollWidth <= topToolbar.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    topToolbar.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  function safeDoc(html, target) {
    const bridge = target
      ? `<script>document.addEventListener("pointerup",function(){parent.postMessage({type:"crestron-local-page",page:${JSON.stringify(target)}},"*")});<\/script>`
      : "";
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}${bridge}</body></html>`;
  }
  function componentCategory(name) {
    const n = name.toLowerCase();
    if (/toggle|switch/.test(n)) return "Toggle Buttons";
    if (/button/.test(n)) return "Standard Buttons";
    if (/slider|level|volume|shade|light|mic/.test(n))
      return "Sliders & Levels";
    if (/text|label|scroll|keyboard|password|input/.test(n)) return "Text & Input";
    if (/menu|nav|carousel|dpad/.test(n)) return "Navigation & Menus";
    if (/list|selector|preset/.test(n)) return "Lists & Selectors";
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
      icon: metadata.icon || "",
      width: metadata.width || 220,
      height: metadata.height || 120,
    });
    renderComponentLibrary();
  }
  function registerCustomComponent(entry) {
    const appearanceProperties = [
        { key: "appearanceEnabled", name: "Override custom appearance", type: "checkbox", defaultValue: false },
        { key: "localText", name: "Local text", type: "text", defaultValue: "" },
        { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#253436" },
        { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
        { key: "borderColor", name: "Border color", type: "color", defaultValue: "#04dcb9" },
        { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04dcb9" },
        { key: "fontSize", name: "Text size", type: "number", defaultValue: 18 },
        { key: "cornerRadius", name: "Corner radius", type: "number", defaultValue: 8 },
        { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 12 },
        { key: "contentInset", name: "Glow-safe inset", type: "number", defaultValue: 10 },
      ],
      declaredKeys = new Set((entry.properties || []).map((property) => property.key)),
      properties = [
        ...(entry.properties || []),
        ...appearanceProperties.filter((property) => !declaredKeys.has(property.key)),
      ];
    window.ComposerRuntime.register({
      id: entry.id,
      name: entry.name,
      category: entry.category || "Custom",
      icon: entry.icon || "🧩",
      defaultSize: entry.defaultSize || { width: 320, height: 180 },
      properties,
      signals: entry.signals || [],
      template: '<div class="custom-component-host"></div>',
      styles:
        "[data-component] .custom-component-host,[data-component] .custom-component-host iframe{display:block;width:100%;height:100%;border:0}",
      data: { html: prepareCustomSource(entry.html) },
      mount(root, context) {
        const host = root.querySelector(".custom-component-host"),
          frame = document.createElement("iframe"),
          properties = context.options.properties || {},
          color = (value, fallback) =>
            /^#[0-9a-f]{6}$/i.test(String(value || ""))
              ? String(value)
              : fallback,
          signals = context.options.definitionData.signals || [],
          raw = String(context.options.definitionData.html || ""),
          resolved = raw.replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_, key) =>
            String(properties[key] ?? ""),
          ),
          appearanceEnabled =
            properties.appearanceEnabled === true ||
            properties.appearanceEnabled === 1 ||
            properties.appearanceEnabled === "1" ||
            String(properties.appearanceEnabled).toLowerCase() === "true",
          appearance = appearanceEnabled
            ? `<style>
button,[role="button"],.custom-component{
background-color:${color(properties.backgroundColor, "#253436")}!important;
color:${color(properties.textColor, "#ffffff")}!important;
border-color:${color(properties.borderColor, "#04dcb9")}!important;
border-radius:${Math.max(0, Number(properties.cornerRadius) || 0)}px!important;
font-size:${Math.max(1, Number(properties.fontSize) || 18)}px!important;
box-shadow:0 0 ${Math.max(0, Number(properties.glowStrength) || 0)}px ${color(properties.glowColor, "#04dcb9")}!important;
}</style>`
            : "",
          localText = String(properties.localText || ""),
          localTextScript = localText
            ? `<script>document.addEventListener('DOMContentLoaded',function(){var target=document.querySelector('[data-custom-text],.button-label');if(target)target.textContent=${JSON.stringify(localText)}});<\/script>`
            : "",
          frameBaseStyle = `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;box-sizing:border-box}body{padding:${properties.contentInset == null || properties.contentInset === "" ? 10 : Math.max(0, Number(properties.contentInset) || 0)}px}body>*{box-sizing:border-box}</style>`,
          bridge = `<script>window.ComposerComponent={publish:function(key,value){parent.postMessage({type:'composer-custom-publish',key:key,value:value},'*')}};window.addEventListener('error',function(e){parent.postMessage({type:'composer-custom-error',message:e.message},'*')});document.addEventListener('pointerdown',function(){parent.postMessage({type:'composer-interaction',phase:'press'},'*')});document.addEventListener('pointerup',function(){parent.postMessage({type:'composer-interaction',phase:'release'},'*')});<\/script>`,
          documentText = /<\/body>/i.test(resolved)
            ? resolved.replace(/<\/body>/i, frameBaseStyle + appearance + localTextScript + bridge + "</body>")
            : resolved + frameBaseStyle + appearance + localTextScript + bridge;
        frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
        frame.srcdoc = documentText;
        host.appendChild(frame);
        function receive(event) {
          if (
            event.source === frame.contentWindow &&
            event.data?.type === "composer-custom-error"
          ) {
            host.innerHTML = `<div class="custom-component-error" style="padding:12px;color:#ffc1c1;background:#291718;border:1px solid #a65050">Component error: ${String(event.data.message || "Unknown error")}</div>`;
            return;
          }
          if (
            event.source === frame.contentWindow &&
            event.data?.type === "composer-custom-publish"
          )
            context.signals.publish(event.data.key, event.data.value);
        }
        addEventListener("message", receive);
        signals
          .filter((signal) => signal.direction === "input")
          .forEach((signal) =>
            context.signals.subscribe(signal.key, (value) =>
              frame.contentWindow?.postMessage(
                { type: "composer-signal", key: signal.key, value },
                "*",
              ),
            ),
          );
        return () => removeEventListener("message", receive);
      },
    });
    const definition = window.ComposerRuntime.get(entry.id);
    definition.data.signals = entry.signals || [];
    addComponent(`${entry.id}.html`, "", {
      componentId: entry.id,
      runtime: "scoped",
      name: entry.name,
      category: entry.category || "Custom",
      icon: entry.icon || "🧩",
      width: entry.defaultSize?.width || 320,
      height: entry.defaultSize?.height || 180,
    });
  }
  function renderComponentLibrary() {
    const query = $("component-search").value.trim().toLowerCase();
    list.innerHTML = "";
    [
      ...new Set([
        ...categoryOrder,
        ...state.components.map((c) => c.category),
      ]),
    ].forEach((category) => {
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
        !!query || ["Standard Buttons", "Sliders & Levels", "Text & Input"].includes(category);
      summary.innerHTML =
        category +
        '<span class="category-count">' +
        components.length +
        "</span>";
      items.className = "category-items";
      components.forEach((c) => {
        const el = document.createElement("div");
        el.className = "component";
        if (c.icon) {
          const icon = document.createElement("span");
          icon.className = "component-icon";
          icon.textContent = c.icon;
          el.append(icon, document.createTextNode(c.displayName));
        } else el.textContent = c.displayName;
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
            : ` — ${device.width} × ${device.height}${device.nativeWidth ? ` viewport (${device.nativeWidth} × ${device.nativeHeight} display)` : ""}`);
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
  function layoutDefaults(item) {
    item.layout = Object.assign(
      { anchorX: "left", anchorY: "top", scaleMode: "fixed", safeMargin: 0 },
      item.layout || {},
    );
    item.deviceOverrides ||= {};
    return item.layout;
  }
  function panelLayoutKey(id = state.targetDevice, width = state.width, height = state.height) {
    return id === "custom" ? `custom:${width}x${height}` : id;
  }
  function savePanelLayouts(id = state.targetDevice, width = state.width, height = state.height) {
    const key = panelLayoutKey(id, width, height);
    state.items.forEach((item) => {
      layoutDefaults(item);
      item.deviceOverrides[key] = { x: item.x, y: item.y, w: item.w, h: item.h, panelWidth: width, panelHeight: height };
    });
  }
  function applyResponsiveSize(width, height, destinationKey) {
    const from = { width: state.width, height: state.height };
    state.items.forEach((item) => {
      const layout = layoutDefaults(item), saved = item.deviceOverrides[destinationKey];
      const rect = saved || window.ComposerResponsiveLayout.adaptRect(item, from, { width, height }, layout);
      Object.assign(item, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });
    });
    resize(width, height);
    renderPage();
  }
  function applyDevice(id) {
    const previousId = state.targetDevice, previousWidth = state.width, previousHeight = state.height;
    savePanelLayouts(previousId, previousWidth, previousHeight);
    state.targetDevice = id;
    const device = selectedDevice(),
      custom = id === "custom";
    $("custom-size").hidden = !custom;
    if (!custom) {
      applyResponsiveSize(device.width, device.height, panelLayoutKey(id, device.width, device.height));
      $("panel-width").value = device.width;
      $("panel-height").value = device.height;
      setStatus(`${device.name}: ${device.width} × ${device.height}`);
    } else {
      const returningToCustom = previousId === "custom",
        width = returningToCustom ? Number($("panel-width").value) || device.width : device.width,
        height = returningToCustom ? Number($("panel-height").value) || device.height : device.height;
      $("panel-width").value = width;
      $("panel-height").value = height;
      applyResponsiveSize(width, height, panelLayoutKey(id, width, height));
      setStatus("Custom panel profile — CH5 compatibility unverified");
    }
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
        interaction: {
          trigger: "none",
          preset: "fade",
          direction: "left",
          duration: 300,
          delay: 0,
          easing: "ease-out",
        },
        actions: [],
        layout: { anchorX: "left", anchorY: "top", scaleMode: "fixed", safeMargin: 0 },
        deviceOverrides: {},
      },
      data || {},
    );
    state.items.push(item);
    renderItem(item);
    select(item.id);
  }
  function interactionFrames(interaction, reverse = false) {
    const preset = interaction?.preset || "fade",
      direction = interaction?.direction || "left",
      movement = {
        left: "translateX(-48px)",
        right: "translateX(48px)",
        up: "translateY(-48px)",
        down: "translateY(48px)",
      },
      frames =
        preset === "slide"
          ? [
              { opacity: 0, transform: movement[direction] },
              { opacity: 1, transform: "translate(0,0)" },
            ]
          : preset === "scale"
            ? [
                { opacity: 0.35, transform: "scale(.72)" },
                { opacity: 1, transform: "scale(1)" },
              ]
            : preset === "glow"
              ? [
                  { filter: "drop-shadow(0 0 0 rgba(4,220,185,0))" },
                  { filter: "drop-shadow(0 0 18px rgba(4,220,185,.95))" },
                  { filter: "drop-shadow(0 0 0 rgba(4,220,185,0))" },
                ]
              : preset === "press"
                ? [
                    { transform: "scale(1)", filter: "brightness(1)" },
                    { transform: "scale(.94)", filter: "brightness(1.14)" },
                  ]
                : [{ opacity: 0 }, { opacity: 1 }];
    return reverse ? frames.slice().reverse() : frames;
  }
  function resetItemInteraction(item) {
    const element = stage.querySelector(`.widget[data-id="${item.id}"]`);
    if (!element) return;
    element.getAnimations().forEach((animation) => animation.cancel());
    ["opacity", "transform", "filter"].forEach((name) =>
      element.style.removeProperty(name),
    );
  }
  function playItemInteraction(
    item,
    reverse = false,
    interactionOverride = null,
    keepAnimations = false,
  ) {
    const element = stage.querySelector(`.widget[data-id="${item.id}"]`),
      interaction = interactionOverride || item.interaction || {};
    if (!element) return;
    if (!keepAnimations) resetItemInteraction(item);
    element.animate(interactionFrames(interaction, reverse), {
      duration: Math.max(50, Number(interaction.duration) || 300),
      delay: reverse
        ? 0
        : Math.max(0, Number(interaction.start ?? interaction.delay) || 0),
      easing: interaction.easing || "ease-out",
    });
  }
  function interactionList(item) {
    return item.interactions?.length
      ? item.interactions
      : item.interaction
        ? [item.interaction]
        : [];
  }
  function playItemTimeline(item) {
    const tracks = interactionList(item);
    resetItemInteraction(item);
    tracks.forEach((track) => playItemInteraction(item, false, track, true));
  }
  function wireItemInteraction(element, item) {
    clearTimeout(element.interactionTimer);
    if (element.interactionAbort) element.interactionAbort.abort();
    element.interactionAbort = new AbortController();
    const listenerOptions = { signal: element.interactionAbort.signal };
    const interactions = interactionList(item).filter(
      (interaction) => interaction.trigger && interaction.trigger !== "none",
    );
    const actions = item.actions || [];
    interactions
      .filter((interaction) => interaction.trigger === "page-enter")
      .forEach((interaction) =>
        playItemInteraction(item, false, interaction, true),
      );
    interactions
      .filter((interaction) => interaction.trigger === "delayed")
      .forEach((interaction) =>
        playItemInteraction(item, false, interaction, true),
      );
    if (actions.some((action) => action.event === "page-enter"))
      runItemActions(item, "page-enter");
    if (actions.some((action) => action.event === "timer"))
      runItemActions(item, "timer");
    [
      ...new Map(
        actions
          .filter(
            (action) =>
              action.event === "signal-change" && action.triggerSignal,
          )
          .map((action) => [
            `${action.triggerType || "digital"}:${action.triggerSignal}`,
            action,
          ]),
      ).values(),
    ].forEach((action) => {
      const type = action.triggerType || "digital";
      const dispose = window.ComposerRuntime.simulator.subscribe(
        type === "digital" ? "b" : type === "analog" ? "n" : "s",
        action.triggerSignal,
        (value) =>
          runItemActions(item, "signal-change", action.triggerSignal, value),
      );
      element.interactionAbort.signal.addEventListener("abort", dispose, {
        once: true,
      });
    });
    let holdTimer = 0;
    element.addEventListener(
      "pointerdown",
      () => {
        interactions
          .filter((interaction) => interaction.trigger === "press")
          .forEach((interaction) =>
            playItemInteraction(item, false, interaction, true),
          );
        runItemActions(item, "press");
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => runItemActions(item, "hold"), 600);
      },
      listenerOptions,
    );
    element.addEventListener(
      "pointerup",
      () => {
        clearTimeout(holdTimer);
        interactions
          .filter((interaction) => interaction.trigger === "release")
          .forEach((interaction) =>
            playItemInteraction(item, false, interaction, true),
          );
        interactions
          .filter(
            (interaction) =>
              interaction.trigger === "press" && interaction.preset === "press",
          )
          .forEach((interaction) =>
            playItemInteraction(item, true, interaction, true),
          );
        runItemActions(item, "release");
      },
      listenerOptions,
    );
  }
  function actionTargetItem(action) {
    return state.items.find((candidate) => candidate.id === action.target);
  }
  function parseActionValue(value, type = "serial") {
    if (type === "digital") return /^(true|1|on|yes)$/i.test(String(value));
    if (type === "analog") return Number(value) || 0;
    return String(value ?? "");
  }
  function executeItemAction(source, action) {
    const target = actionTargetItem(action),
      value = String(action.value ?? "");
    if (action.type === "navigate") {
      if (state.pages.some((page) => page.id === action.target)) {
        state.activePage = action.target;
        renderPage();
      }
      return;
    }
    if (/^signal-/.test(action.type)) {
      const type = action.type.slice(7),
        code = type === "digital" ? "b" : type === "analog" ? "n" : "s";
      if (action.target)
        window.ComposerRuntime.simulator.publish(
          code,
          action.target,
          parseActionValue(value, type),
        );
      return;
    }
    if (!target) return;
    const element = stage.querySelector(`.widget[data-id="${target.id}"]`);
    if (action.type === "show" || action.type === "hide") {
      target.hidden = action.type === "hide";
      if (element) element.style.display = target.hidden ? "none" : "block";
    } else if (action.type === "animate") playItemTimeline(target);
    else if (action.type === "text") {
      target.properties = target.properties || {};
      target.properties.localText = value;
      renderItem(target);
    } else if (action.type === "property") {
      const separator = value.indexOf("="),
        key = separator < 0 ? "localText" : value.slice(0, separator).trim();
      target.properties = target.properties || {};
      target.properties[key] =
        separator < 0 ? value : value.slice(separator + 1);
      renderItem(target);
    } else if (action.type === "enable" || action.type === "disable") {
      target.actionDisabled = action.type === "disable";
      if (element) {
        element.style.pointerEvents = target.actionDisabled ? "none" : "";
        element.style.opacity = target.actionDisabled ? ".45" : "";
      }
    } else if (action.type === "select") {
      if (element)
        element.classList.toggle(
          "action-selected",
          parseActionValue(value || "true", "digital"),
        );
    }
  }
  function actionConditionMatches(action, eventValue) {
    const operator = action.condition || "always",
      expected = action.compareValue,
      numericActual = Number(eventValue),
      numericExpected = Number(expected);
    if (operator === "always" || operator === "changed") return true;
    if (operator === "truthy")
      return (
        eventValue === true ||
        eventValue === 1 ||
        eventValue === "1" ||
        eventValue === "true"
      );
    if (operator === "falsy")
      return !actionConditionMatches({ condition: "truthy" }, eventValue);
    if (operator === "equals") return String(eventValue) === String(expected);
    if (operator === "not-equals")
      return String(eventValue) !== String(expected);
    if (operator === "greater") return numericActual > numericExpected;
    if (operator === "greater-equal") return numericActual >= numericExpected;
    if (operator === "less") return numericActual < numericExpected;
    if (operator === "less-equal") return numericActual <= numericExpected;
    return true;
  }
  function runItemActions(
    item,
    eventName,
    triggerSignal = "",
    eventValue = undefined,
  ) {
    let sequenceAt = 0;
    (item.actions || [])
      .filter(
        (action) =>
          action.event === eventName &&
          (!triggerSignal || action.triggerSignal === triggerSignal) &&
          actionConditionMatches(action, eventValue),
      )
      .forEach((action) => {
        const delay = Math.max(0, Number(action.delay) || 0);
        if (action.timing === "after") sequenceAt += delay;
        const start = action.timing === "after" ? sequenceAt : delay;
        setTimeout(() => executeItemAction(item, action), start);
      });
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
    el.style.pointerEvents = item.actionDisabled ? "none" : "";
    el.style.opacity = item.actionDisabled ? ".45" : "";
    const backgroundAsset = state.assets.find(
      (asset) => asset.id === item.backgroundAsset,
    );
    el.style.backgroundImage = backgroundAsset
      ? `url("${backgroundAsset.dataUrl}")`
      : "";
    el.style.backgroundSize = backgroundAsset ? "cover" : "";
    el.style.backgroundPosition = backgroundAsset ? "center" : "";
    const graphicAsset = state.assets.find(
        (asset) => asset.id === item.graphicAsset && asset.type.startsWith("image/"),
      ),
      selectedGraphicAsset = state.assets.find(
        (asset) =>
          asset.id === item.selectedGraphicAsset && asset.type.startsWith("image/"),
      ),
      graphicMode = item.graphicAssetMode || "none",
      definition = item.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null,
      repeatGraphic =
        item.graphicAssetPlacement === "items" && !!definition?.itemSelector;
    if (definition) {
      item.properties = item.properties || {};
      definition.properties.forEach((property) => {
        if (!Object.prototype.hasOwnProperty.call(item.properties, property.key))
          item.properties[property.key] = structuredClone(property.defaultValue);
      });
      item.signalBindings = item.signalBindings || {};
      definition.signals.forEach((signal) => {
        if (!Object.prototype.hasOwnProperty.call(item.signalBindings, signal.key))
          item.signalBindings[signal.key] = {
            mode: /^\d+$/.test(String(signal.defaultValue || ""))
              ? "join"
              : "contract",
            value: signal.defaultValue || "",
          };
      });
    }
    el.dataset.graphicMode = graphicMode;
    el.dataset.assetSelected = "false";
    el.dataset.hasSelectedGraphic = selectedGraphicAsset ? "true" : "false";
    el.style.setProperty(
      "--selected-graphic-url",
      selectedGraphicAsset ? `url("${selectedGraphicAsset.dataUrl}")` : "none",
    );
    if (graphicAsset && graphicMode === "background" && !repeatGraphic) {
      el.style.backgroundImage = `url("${graphicAsset.dataUrl}")`;
      el.style.backgroundSize = item.graphicAssetFit || "contain";
      el.style.backgroundPosition = `${Number(item.graphicAssetX ?? 50)}% ${Number(item.graphicAssetY ?? 50)}%`;
      el.style.backgroundRepeat = "no-repeat";
    }
    function appendGraphicOverlay(asset, selected) {
      if (!asset || graphicMode !== "overlay" || repeatGraphic) return;
      const overlay = document.createElement("img");
      overlay.className = `widget-asset-overlay widget-asset-overlay-${selected ? "selected" : "normal"}`;
      overlay.src = asset.dataUrl;
      Object.assign(overlay.style, {
        left: `${Number(item.graphicAssetX ?? 50)}%`,
        top: `${Number(item.graphicAssetY ?? 50)}%`,
        width: `${Number(item.graphicAssetWidth ?? 35)}%`,
        height: `${Number(item.graphicAssetHeight ?? 35)}%`,
        opacity: String(Math.max(0, Math.min(100, Number(item.graphicAssetOpacity ?? 100))) / 100),
        objectFit: item.graphicAspectLocked
          ? item.graphicAssetFit || "contain"
          : "fill",
      });
      el.appendChild(overlay);
    }
    appendGraphicOverlay(graphicAsset, false);
    appendGraphicOverlay(selectedGraphicAsset, true);
    if (item.componentId)
      el.runtimeDispose = window.ComposerRuntime.mount(
        el.querySelector(".scoped-preview"),
        item.componentId,
        {
          bindings: item.signalBindings,
          properties: item.properties || {},
          templateOverride: item.componentTemplate || "",
          stylesOverride: item.componentStyles || "",
          contractPrefix: contractWidgetPrefix(item),
          targetPage: item.targetPage,
          navigate: () => {},
        },
      );
    else el.querySelector("iframe").srcdoc = safeDoc(item.source, "");
    if (repeatGraphic) {
      const root = el.querySelector(".scoped-preview"),
        style = document.createElement("style"),
        selector = definition.itemSelector,
        normalUrl = graphicAsset ? `url("${graphicAsset.dataUrl}")` : "none",
        selectedUrl = selectedGraphicAsset
          ? `url("${selectedGraphicAsset.dataUrl}")`
          : normalUrl,
        size = item.graphicAspectLocked
          ? item.graphicAssetFit || "contain"
          : "100% 100%",
        common = `background-repeat:no-repeat;background-position:center;background-size:${size};`;
      if (graphicMode === "background") {
        style.textContent = `${selector}{background-image:${normalUrl}!important;${common}}${selector}.active,${selector}.selected,${selector}.flipped,${selector}[aria-selected="true"]{background-image:${selectedUrl}!important}`;
      } else if (graphicMode === "overlay") {
        style.textContent = `${selector}{position:relative!important}${selector}::after{content:"";position:absolute;z-index:50;pointer-events:none;left:${Number(item.graphicAssetX ?? 50)}%;top:${Number(item.graphicAssetY ?? 50)}%;width:${Number(item.graphicAssetWidth ?? 35)}%;height:${Number(item.graphicAssetHeight ?? 35)}%;opacity:${Math.max(0, Math.min(100, Number(item.graphicAssetOpacity ?? 100))) / 100};transform:translate(-50%,-50%);background-image:${normalUrl};${common}}${selector}.active::after,${selector}.selected::after,${selector}.flipped::after,${selector}[aria-selected="true"]::after{background-image:${selectedUrl}}`;
      }
      root.appendChild(style);
    }
    wireItemInteraction(el, item);
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
    stage.style.backgroundSize = backgroundAsset
      ? page.backgroundAssetFit || "cover"
      : "";
    stage.style.backgroundPosition = backgroundAsset
      ? `${Number(page.backgroundAssetX ?? 50)}% ${Number(page.backgroundAssetY ?? 50)}%`
      : "";
    stage.style.backgroundRepeat = backgroundAsset ? "no-repeat" : "";
    state.items
      .filter((i) => i.pageId === state.activePage || i.master)
      .forEach(renderItem);
    if (lastRenderedPageId && lastRenderedPageId !== page.id)
      playPageTransition(page);
    lastRenderedPageId = page.id;
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
      type.textContent = `${item.master ? "GLOBAL · " : ""}${item.reusableId ? (isReusableMaster(item) ? "SYMBOL MASTER · " : "SYMBOL INSTANCE · ") : ""}${item.componentId || "Custom HTML"}`;
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
        (item) =>
          item.assetId === assetId ||
          item.backgroundAsset === assetId ||
          item.graphicAsset === assetId ||
          item.selectedGraphicAsset === assetId,
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
        const replaceButton = document.createElement("button"),
          deleteButton = document.createElement("button");
        replaceButton.textContent = "Replace";
        deleteButton.textContent = "Delete";
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
            if (item.graphicAsset === asset.id) {
              delete item.graphicAsset;
              delete item.graphicAssetMode;
            }
            if (item.selectedGraphicAsset === asset.id)
              delete item.selectedGraphicAsset;
          });
          state.items = state.items.filter((item) => item.assetId !== asset.id);
          state.assets = state.assets.filter((entry) => entry.id !== asset.id);
          renderPage();
          commitHistory();
          setStatus(`Removed asset “${asset.name}”`);
        };
        buttons.append(replaceButton, deleteButton);
        card.ondragstart = (event) =>
          event.dataTransfer.setData("text/asset", asset.id);
        card.ondblclick = () => createAssetItem(asset.id, 40, 40);
        card.append(preview, info, buttons);
        host.appendChild(card);
      });
    if (!host.children.length)
      host.innerHTML = '<p class="hint">No assets imported.</p>';
    const selected = current();
    if (selected) renderAssetInspector(selected);
    renderPageInspector();
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
      delete copy.reusableOverrides;
      delete copy.reusableBindingsOverride;
      delete copy.master;
      return copy;
    });
  }
  function ensureReusableMasters() {
    state.reusables.forEach((definition) => {
      const instanceIds = state.items
        .filter((item) => item.reusableId === definition.id && item.linkedInstanceId)
        .map((item) => item.linkedInstanceId);
      if (!instanceIds.includes(definition.masterInstanceId))
        definition.masterInstanceId = instanceIds[0] || "";
    });
  }
  function isReusableMaster(item) {
    if (!item?.reusableId || !item.linkedInstanceId) return false;
    const definition = state.reusables.find((entry) => entry.id === item.reusableId);
    return !!definition && definition.masterInstanceId === item.linkedInstanceId;
  }
  function synchronizeReusableMasters(forceDefinitionId = "") {
    ensureReusableMasters();
    state.reusables.forEach((definition) => {
      if (forceDefinitionId && definition.id !== forceDefinitionId) return;
      const masterItems = state.items.filter(
        (item) => item.reusableId === definition.id && item.linkedInstanceId === definition.masterInstanceId,
      );
      if (!masterItems.length) return;
      const snapshot = reusableSnapshot(masterItems),
        changed = forceDefinitionId === definition.id || JSON.stringify(snapshot) !== JSON.stringify(definition.items || []);
      if (!changed) return;
      definition.items = snapshot;
      const instanceIds = [...new Set(state.items
        .filter((item) => item.reusableId === definition.id && item.linkedInstanceId !== definition.masterInstanceId)
        .map((item) => item.linkedInstanceId))];
      instanceIds.forEach((instanceId) => {
        const items = state.items.filter((item) => item.linkedInstanceId === instanceId),
          left = Math.min(...items.map((item) => item.x)),
          top = Math.min(...items.map((item) => item.y));
        items.forEach((item) => {
          const source = snapshot.find((entry) => entry.reusableKey === item.reusableKey);
          if (!source) return;
          const overrideKeys = [...new Set(item.reusableOverrides || [])],
            overridden = Object.fromEntries(
              overrideKeys
                .filter((key) => Object.prototype.hasOwnProperty.call(item.properties || {}, key))
                .map((key) => [key, structuredClone(item.properties[key])]),
            ),
            customBindings = !!item.reusableBindingsOverride,
            preservedBindings = customBindings
              ? structuredClone(item.signalBindings || {})
              : null,
            preservedSource = customBindings && !item.componentId ? item.source : null,
            componentDefinition = item.componentId
              ? window.ComposerRuntime.get(item.componentId)
              : null,
            signalPropertyKeys = new Set([
              "bindingMode",
              ...(componentDefinition?.signals || [])
                .map((signal) => signal.optionalProperty)
                .filter(Boolean),
              ...(componentDefinition?.properties || [])
                .filter((property) => property.signalSetting)
                .map((property) => property.key),
            ]),
            preservedSignalProperties = customBindings
              ? Object.fromEntries(
                  Object.entries(item.properties || {}).filter(([key]) => signalPropertyKeys.has(key)),
                )
              : {},
            keep = {
              id: item.id,
              pageId: item.pageId,
              groupId: item.groupId,
              linkedInstanceId: item.linkedInstanceId,
              reusableId: definition.id,
              reusableKey: item.reusableKey,
              reusableOverrides: overrideKeys,
              reusableBindingsOverride: customBindings,
              x: left + source.x,
              y: top + source.y,
            };
          Object.assign(item, structuredClone(source), keep);
          item.properties = { ...(item.properties || {}), ...overridden };
          if (customBindings) {
            item.signalBindings = preservedBindings;
            item.properties = { ...item.properties, ...preservedSignalProperties };
            if (!item.componentId) item.source = preservedSource;
          }
          renderItem(item);
        });
      });
    });
  }
  function makeReusableMaster(item) {
    if (!item?.reusableId || !item.linkedInstanceId) return;
    const definition = state.reusables.find((entry) => entry.id === item.reusableId);
    if (!definition) return;
    definition.masterInstanceId = item.linkedInstanceId;
    synchronizeReusableMasters(definition.id);
    renderProperties(item);
    renderLayers();
    commitHistory();
    setStatus(`“${definition.name}” master moved to this instance`);
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
    const instanceId = uid("instance-"),
      definition = {
        id: uid("reusable-"),
        name: name.trim(),
        items: reusableSnapshot(items),
        masterInstanceId: instanceId,
      };
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
    );
    if (!definition) return;
    definition.masterInstanceId = reference.linkedInstanceId;
    synchronizeReusableMasters(definition.id);
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
      backgroundAssetFit: page.backgroundAssetFit || "cover",
      backgroundAssetX: page.backgroundAssetX ?? 50,
      backgroundAssetY: page.backgroundAssetY ?? 50,
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
        backgroundAssetFit: template.backgroundAssetFit || "cover",
        backgroundAssetX: template.backgroundAssetX ?? 50,
        backgroundAssetY: template.backgroundAssetY ?? 50,
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
    const tokenKeys = [
      "page", "surface", "accent", "text", "glow", "border", "font-size",
      "corner-radius", "glow-strength", "animation-duration", "animation-easing",
    ];
    return {
      page: $("theme-page").value,
      surface: $("theme-surface").value,
      accent: $("theme-accent").value,
      text: $("theme-text").value,
      glow: $("theme-glow").value,
      border: $("theme-border").value,
      fontSize: Math.max(1, Number($("theme-font-size").value) || 18),
      cornerRadius: Math.max(0, Number($("theme-corner-radius").value) || 0),
      glowStrength: Math.max(0, Number($("theme-glow-strength").value) || 0),
      animationDuration: Math.max(50, Number($("theme-animation-duration").value) || 300),
      animationEasing: $("theme-animation-easing").value,
      enabled: Object.fromEntries(tokenKeys.map((key) => [key, $("theme-" + key + "-enabled").checked])),
    };
  }
  function loadTheme(theme) {
    ["page", "surface", "accent", "text", "glow", "border"].forEach((key) => {
      if (theme[key]) $("theme-" + key).value = theme[key];
    });
    const extended = {
      "font-size": theme.fontSize,
      "corner-radius": theme.cornerRadius,
      "glow-strength": theme.glowStrength,
      "animation-duration": theme.animationDuration,
      "animation-easing": theme.animationEasing,
    };
    Object.entries(extended).forEach(([key, value]) => {
      if (value !== undefined) $("theme-" + key).value = value;
    });
    ["page", "surface", "accent", "text", "glow", "border", ...Object.keys(extended)].forEach((key) => {
      const legacyColor = ["page", "surface", "accent", "text", "glow", "border"].includes(key);
      $("theme-" + key + "-enabled").checked = theme.enabled?.[key] ?? legacyColor;
    });
    setStatus(`Loaded theme “${theme.name || "palette"}”`);
  }
  function themeValueFor(key, theme) {
    const name = key.toLowerCase();
    if (!/color/.test(name)) return "";
    if (/glow/.test(name)) return theme.enabled.glow ? theme.glow : "";
    if (/border|outline/.test(name)) return theme.enabled.border ? theme.border : "";
    if (/text|label|status|value/.test(name)) return theme.enabled.text ? theme.text : "";
    if (
      /off|background|surface|face|button|card|frame|panel|track|knob|shade/.test(
        name,
      )
    )
      return theme.enabled.surface ? theme.surface : "";
    if (
      /accent|selected|pressed|active|on|high|gauge|wave|fill|level/.test(name)
    )
      return theme.enabled.accent ? theme.accent : "";
    return theme.enabled.accent ? theme.accent : "";
  }
  function applyThemeToItems(items, theme) {
    items.forEach((item) => {
      item.properties = item.properties || {};
      Object.keys(item.properties).forEach((key) => {
        const value = themeValueFor(key, theme);
        if (value) item.properties[key] = value;
      });
      Object.keys(item.properties).forEach((key) => {
        if (theme.enabled["font-size"] && /^(?:fontSize|textSize)$/i.test(key))
          item.properties[key] = theme.fontSize;
        if (theme.enabled["corner-radius"] && /^(?:cornerRadius|borderRadius)$/i.test(key))
          item.properties[key] = theme.cornerRadius;
        if (theme.enabled["glow-strength"] && /^(?:glowStrength|glowSize)$/i.test(key))
          item.properties[key] = theme.glowStrength;
      });
      if (theme.enabled["animation-duration"]) {
        item.interaction = { ...(item.interaction || {}), duration: theme.animationDuration };
        (item.interactions || []).forEach((track) => (track.duration = theme.animationDuration));
      }
      if (theme.enabled["animation-easing"]) {
        item.interaction = { ...(item.interaction || {}), easing: theme.animationEasing };
        (item.interactions || []).forEach((track) => (track.easing = theme.animationEasing));
      }
      renderItem(item);
    });
  }
  function applyTheme(scope) {
    const theme = currentTheme();
    let items = [];
    if (scope === "selection") items = selectedItems();
    if (scope === "component-type") {
      const selected = current();
      if (!selected) {
        setStatus("Select a component type first");
        return;
      }
      items = state.items.filter((item) =>
        selected.componentId ? item.componentId === selected.componentId : !item.componentId && item.name === selected.name,
      );
    }
    if (scope === "page") {
      items = state.items.filter(
        (item) => item.pageId === state.activePage || item.master,
      );
      if (theme.enabled.page) currentPage().background = theme.page;
    }
    if (scope === "project") {
      items = state.items;
      if (theme.enabled.page) state.pages.forEach((page) => (page.background = theme.page));
    }
    if (!items.length && scope === "selection") {
      setStatus("Select one or more components first");
      return;
    }
    applyThemeToItems(items, theme);
    renderPage();
    commitHistory();
    setStatus(
      `Applied theme to ${scope === "selection" ? `${items.length} selected component${items.length === 1 ? "" : "s"}` : scope === "component-type" ? `${items.length} matching component${items.length === 1 ? "" : "s"}` : scope}`,
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
    const assetSelect = $("page-background-asset");
    assetSelect.innerHTML = '<option value="">None</option>';
    state.assets
      .filter((asset) => asset.type.startsWith("image/"))
      .forEach((asset) => {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = asset.name;
        assetSelect.appendChild(option);
      });
    assetSelect.value = p.backgroundAsset || "";
    $("page-background-fit").value = p.backgroundAssetFit || "cover";
    $("page-background-x").value = p.backgroundAssetX ?? 50;
    $("page-background-y").value = p.backgroundAssetY ?? 50;
    $("page-binding-mode").value = p.bindingMode;
    $("page-binding").value = p.binding;
    $("page-transition").value = p.transition || "none";
    $("page-transition-duration").value = p.transitionDuration || 350;
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
      $("edit-source").disabled = false;
      const editableCustom = state.customComponents.some(
        (entry) => entry.id === item.componentId,
      );
      $("create-custom-component").disabled = false;
      $("create-custom-component").textContent = editableCustom
        ? "Edit palette component"
        : "Create palette component";
      refreshTargets();
      renderProperties(item);
      renderAssetInspector(item);
      renderBindings(item);
      renderInteractionEditor(item);
      renderResponsiveEditor(item);
    } else renderSafeMarginGuide(null);
    renderLayers();
  }
  function renderSafeMarginGuide(item) {
    stage.querySelector(".responsive-safe-guide")?.remove();
    const margin = Math.max(0, Number(item?.layout?.safeMargin) || 0);
    if (!item || !margin) return;
    const guide = document.createElement("div");
    guide.className = "responsive-safe-guide";
    guide.dataset.label = `${margin}px safe margin`;
    Object.assign(guide.style, {
      left: margin + "px", top: margin + "px",
      width: Math.max(0, state.width - margin * 2) + "px",
      height: Math.max(0, state.height - margin * 2) + "px",
    });
    stage.appendChild(guide);
  }
  function renderResponsiveEditor(item) {
    const layout = layoutDefaults(item), key = panelLayoutKey();
    ["anchor-x", "anchor-y", "scale-mode", "safe-margin"].forEach((suffix) => {
      const property = { "anchor-x": "anchorX", "anchor-y": "anchorY", "scale-mode": "scaleMode", "safe-margin": "safeMargin" }[suffix],
        input = $("layout-" + suffix);
      input.value = layout[property];
      input.oninput = () => {
        layout[property] = property === "safeMargin" ? Math.max(0, Number(input.value) || 0) : input.value;
        if (property === "safeMargin") renderSafeMarginGuide(item);
        scheduleHistory();
      };
    });
    $("layout-override-status").textContent = item.deviceOverrides[key]
      ? `Saved override for ${key}` : `Using responsive rules for ${key}`;
    $("layout-save-override").onclick = () => {
      item.deviceOverrides[key] = { x: item.x, y: item.y, w: item.w, h: item.h, panelWidth: state.width, panelHeight: state.height };
      renderResponsiveEditor(item); commitHistory(); setStatus(`Saved “${item.name}” layout for ${key}`);
    };
    $("layout-reset-override").onclick = () => {
      delete item.deviceOverrides[key]; renderResponsiveEditor(item); commitHistory();
      setStatus(`Reset “${item.name}” override for ${key}`);
    };
    function applyRules(scope) {
      const targets = state.items.filter((entry) =>
        scope === "project" || entry.master || entry.pageId === state.activePage,
      );
      const label = scope === "project" ? "the entire project" : `page “${currentPage().name}”`;
      if (!confirm(`Apply these responsive rules to ${targets.length} widgets on ${label}?`)) return;
      targets.forEach((entry) => { entry.layout = { ...layout }; });
      renderSafeMarginGuide(item);
      commitHistory();
      setStatus(`Applied responsive rules to ${targets.length} widgets on ${label}`);
    }
    $("layout-apply-page").onclick = () => applyRules("page");
    $("layout-apply-project").onclick = () => applyRules("project");
    renderSafeMarginGuide(item);
  }
  function playPageTransition(page = currentPage()) {
    const transition = page.transition || "none";
    if (transition === "none") return;
    stage.getAnimations().forEach((animation) => animation.cancel());
    stage.animate(
      interactionFrames({
        preset: transition.startsWith("slide") ? "slide" : transition,
        direction: transition === "slide-right" ? "right" : "left",
      }),
      {
        duration: Math.max(50, Number(page.transitionDuration) || 350),
        easing: "ease-out",
      },
    );
  }
  function renderInteractionEditor(item) {
    const defaults = {
      trigger: "none",
      preset: "fade",
      direction: "left",
      duration: 300,
      delay: 0,
      easing: "ease-out",
    };
    const interaction = { ...defaults, ...(item.interaction || {}) };
    ["trigger", "preset", "direction", "duration", "delay", "easing"].forEach(
      (key) => {
        const input = $("interaction-" + key);
        input.value = interaction[key];
        input.oninput = () => {
          interaction[key] = /duration|delay/.test(key)
            ? Number(input.value)
            : input.value;
          item.interaction = { ...interaction };
          $("interaction-direction-label").hidden =
            interaction.preset !== "slide";
          scheduleHistory();
        };
      },
    );
    $("interaction-direction-label").hidden = interaction.preset !== "slide";
    $("interaction-preview").onclick = () => {
      const original = item.interaction;
      item.interaction = interaction;
      playItemInteraction(item);
      item.interaction = original;
    };
    $("interaction-reset").onclick = () => resetItemInteraction(item);
    $("interaction-timeline-open").onclick = () => openTimeline(item);
    $("action-editor-open").onclick = () => openActionEditor(item);
  }
  function timelineOptions(values, selected) {
    return values
      .map(
        ([value, label]) =>
          `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`,
      )
      .join("");
  }
  function openTimeline(item) {
    if (!item.interactions?.length) {
      const source = item.interaction || {
        trigger: "press",
        preset: "press",
        direction: "left",
        duration: 180,
        delay: 0,
        easing: "ease-out",
      };
      item.interactions = [{ ...source, start: Number(source.delay) || 0 }];
    }
    $("timeline-widget-name").textContent = item.name;
    renderTimeline(item);
    $("timeline-dialog").showModal();
  }
  function actionOptions(values, selected) {
    return values
      .map(
        ([value, label]) =>
          `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`,
      )
      .join("");
  }
  function openActionEditor(item) {
    item.actions = item.actions || [];
    $("action-widget-name").textContent = item.name;
    renderActionEditor(item);
    $("action-editor-dialog").showModal();
  }
  function renderActionEditor(item) {
    const host = $("action-rows");
    host.innerHTML = "";
    (item.actions || []).forEach((action, index) => {
      const row = document.createElement("div");
      row.className = "action-row";
      const drag = document.createElement("span"),
        event = document.createElement("select"),
        triggerType = document.createElement("select"),
        triggerSignal = document.createElement("input"),
        condition = document.createElement("select"),
        compareValue = document.createElement("input"),
        type = document.createElement("select"),
        target = document.createElement("input"),
        value = document.createElement("input"),
        delay = document.createElement("input"),
        timing = document.createElement("select"),
        remove = document.createElement("button");
      row.draggable = true;
      drag.className = "action-drag-handle";
      drag.textContent = "⋮⋮";
      event.innerHTML = actionOptions(
        [
          ["press", "Press"],
          ["release", "Release"],
          ["hold", "Hold"],
          ["page-enter", "Page enter"],
          ["timer", "Timer"],
          ["signal-change", "Signal change"],
        ],
        action.event || "press",
      );
      triggerType.innerHTML = actionOptions(
        [
          ["digital", "Digital"],
          ["analog", "Analog"],
          ["serial", "Serial"],
        ],
        action.triggerType || "digital",
      );
      condition.innerHTML = actionOptions(
        [
          ["always", "Always"],
          ["truthy", "True / On"],
          ["falsy", "False / Off"],
          ["equals", "Equals"],
          ["not-equals", "Not equal"],
          ["greater", "Greater than"],
          ["greater-equal", "At least"],
          ["less", "Less than"],
          ["less-equal", "At most"],
          ["changed", "Any change"],
        ],
        action.condition || "always",
      );
      type.innerHTML = actionOptions(
        [
          ["navigate", "Navigate page"],
          ["show", "Show widget"],
          ["hide", "Hide widget"],
          ["animate", "Play timeline"],
          ["signal-digital", "Set digital"],
          ["signal-analog", "Set analog"],
          ["signal-serial", "Set serial"],
          ["text", "Change local text"],
          ["property", "Set property"],
          ["enable", "Enable widget"],
          ["disable", "Disable widget"],
          ["select", "Select widget"],
        ],
        action.type || "navigate",
      );
      timing.innerHTML = actionOptions(
        [
          ["parallel", "Parallel"],
          ["after", "After previous"],
        ],
        action.timing || "parallel",
      );
      triggerSignal.placeholder = "Signal address";
      triggerSignal.value = action.triggerSignal || "";
      compareValue.placeholder = "Compare value";
      compareValue.value = action.compareValue ?? "";
      target.placeholder = "Page, widget, or signal";
      target.value = action.target || "";
      target.setAttribute("list", "action-target-options");
      value.placeholder =
        type.value === "property" ? "property=value" : "Value";
      value.value = action.value ?? "";
      delay.type = "number";
      delay.min = "0";
      delay.value = Number(action.delay) || 0;
      remove.type = "button";
      remove.textContent = "×";
      const update = (record = true) => {
        Object.assign(action, {
          event: event.value,
          triggerSignal: triggerSignal.value.trim(),
          type: type.value,
          triggerType: triggerType.value,
          condition: condition.value,
          compareValue: compareValue.value,
          target: target.value.trim(),
          value: value.value,
          delay: Math.max(0, Number(delay.value) || 0),
          timing: timing.value,
        });
        const signalEvent = event.value === "signal-change";
        triggerType.disabled = triggerSignal.disabled = !signalEvent;
        condition.disabled = compareValue.disabled = !signalEvent;
        compareValue.hidden = ![
          "equals",
          "not-equals",
          "greater",
          "greater-equal",
          "less",
          "less-equal",
        ].includes(condition.value);
        value.placeholder =
          type.value === "property" ? "property=value" : "Value";
        if (record) scheduleHistory();
      };
      [
        event,
        triggerType,
        triggerSignal,
        condition,
        compareValue,
        type,
        target,
        value,
        delay,
        timing,
      ].forEach((control) => (control.oninput = () => update()));
      remove.onclick = () => {
        item.actions.splice(index, 1);
        renderActionEditor(item);
        commitHistory();
      };
      row.ondragstart = () => {
        row.classList.add("dragging");
        row.dataset.dragIndex = String(index);
      };
      row.ondragend = () => row.classList.remove("dragging");
      row.ondragover = (dragEvent) => dragEvent.preventDefault();
      row.ondrop = (dragEvent) => {
        dragEvent.preventDefault();
        const fromRow = host.querySelector(".action-row.dragging"),
          from = Number(fromRow?.dataset.dragIndex);
        if (!Number.isInteger(from) || from === index) return;
        const [moved] = item.actions.splice(from, 1);
        item.actions.splice(index, 0, moved);
        renderActionEditor(item);
        commitHistory();
      };
      update(false);
      row.append(
        drag,
        event,
        triggerType,
        triggerSignal,
        condition,
        compareValue,
        type,
        target,
        value,
        delay,
        timing,
        remove,
      );
      host.appendChild(row);
    });
    let datalist = $("action-target-options");
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = "action-target-options";
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = [
      ...state.pages.map(
        (page) => `<option value="${page.id}">${page.name} page</option>`,
      ),
      ...state.items.map(
        (entry) => `<option value="${entry.id}">${entry.name}</option>`,
      ),
    ].join("");
  }
  function renderTimeline(item) {
    const host = $("timeline-tracks");
    host.innerHTML = "";
    (item.interactions || []).forEach((track, index) => {
      const row = document.createElement("div"),
        trigger = document.createElement("select"),
        preset = document.createElement("select"),
        direction = document.createElement("select"),
        start = document.createElement("input"),
        duration = document.createElement("input"),
        easing = document.createElement("select"),
        bar = document.createElement("div"),
        fill = document.createElement("i"),
        remove = document.createElement("button");
      row.className = "timeline-track";
      trigger.innerHTML = timelineOptions(
        [
          ["press", "Press"],
          ["release", "Release"],
          ["page-enter", "Page enter"],
          ["delayed", "Delayed"],
        ],
        track.trigger,
      );
      preset.innerHTML = timelineOptions(
        [
          ["fade", "Fade"],
          ["slide", "Slide"],
          ["scale", "Scale"],
          ["glow", "Glow"],
          ["press", "Press state"],
        ],
        track.preset,
      );
      direction.innerHTML = timelineOptions(
        [
          ["left", "From left"],
          ["right", "From right"],
          ["up", "From above"],
          ["down", "From below"],
        ],
        track.direction || "left",
      );
      easing.innerHTML = timelineOptions(
        [
          ["ease-out", "Ease out"],
          ["ease-in-out", "Ease in/out"],
          ["linear", "Linear"],
          ["cubic-bezier(.2,.8,.2,1)", "Smooth"],
        ],
        track.easing,
      );
      start.type = duration.type = "number";
      start.min = "0";
      duration.min = "50";
      start.value = track.start ?? track.delay ?? 0;
      duration.value = track.duration || 300;
      start.title = "Start offset (ms)";
      duration.title = "Duration (ms)";
      bar.className = "timeline-track-bar";
      bar.appendChild(fill);
      remove.type = "button";
      remove.className = "timeline-delete";
      remove.textContent = "×";
      function updateBar() {
        const startValue = Math.max(0, Number(track.start) || 0),
          durationValue = Math.max(50, Number(track.duration) || 300);
        fill.style.left = `${Math.min(95, (startValue / 2000) * 100)}%`;
        fill.style.width = `${Math.max(2, Math.min(100 - (startValue / 2000) * 100, (durationValue / 2000) * 100))}%`;
      }
      trigger.onchange = () => {
        track.trigger = trigger.value;
        scheduleHistory();
      };
      preset.onchange = () => {
        track.preset = preset.value;
        scheduleHistory();
      };
      direction.onchange = () => {
        track.direction = direction.value;
        scheduleHistory();
      };
      easing.onchange = () => {
        track.easing = easing.value;
        scheduleHistory();
      };
      start.oninput = () => {
        track.start = Math.max(0, Number(start.value) || 0);
        updateBar();
        scheduleHistory();
      };
      duration.oninput = () => {
        track.duration = Math.max(50, Number(duration.value) || 300);
        updateBar();
        scheduleHistory();
      };
      remove.onclick = () => {
        item.interactions.splice(index, 1);
        renderTimeline(item);
        commitHistory();
      };
      updateBar();
      row.append(
        trigger,
        preset,
        direction,
        start,
        duration,
        easing,
        bar,
        remove,
      );
      host.appendChild(row);
    });
  }
  function renderProperties(item) {
    const section = $("component-properties-section"),
      host = $("component-properties"),
      definition =
        item.componentId && window.ComposerRuntime.get(item.componentId),
      properties = ((definition && definition.properties) || []).filter(
        (property) => {
          if (property.signalSetting || property.key === "bindingMode") return false;
          if (!property.visibleWhen) return true;
          const actual = Number(item.properties?.[property.visibleWhen.key] ?? 0);
          return property.visibleWhen.gte == null || actual >= Number(property.visibleWhen.gte);
        },
      );
    section.hidden = !properties.length;
    host.innerHTML = "";
    const reusableDefinition = item.reusableId
        ? state.reusables.find((entry) => entry.id === item.reusableId)
        : null,
      reusableMaster = isReusableMaster(item);
    if (reusableDefinition) {
      const status = document.createElement("div");
      status.className = "reusable-inheritance-status";
      status.textContent = reusableMaster
        ? `Master of “${reusableDefinition.name}” — edits automatically update linked instances.`
        : `Linked to “${reusableDefinition.name}” — enable Override on properties that should differ here.`;
      host.appendChild(status);
    }
    function wireReusableOverride(label, controls, property) {
      if (!reusableDefinition || reusableMaster) return;
      const override = document.createElement("label"),
        checkbox = document.createElement("input"),
        keys = new Set(item.reusableOverrides || []);
      override.className = "reusable-property-override";
      checkbox.type = "checkbox";
      checkbox.checked = keys.has(property.key);
      controls.forEach((control) => (control.disabled = !checkbox.checked));
      override.append(checkbox, document.createTextNode("Override for this instance"));
      checkbox.onchange = () => {
        if (checkbox.checked) keys.add(property.key);
        else {
          keys.delete(property.key);
          const source = (reusableDefinition.items || []).find(
            (entry) => entry.reusableKey === item.reusableKey,
          );
          if (source?.properties && Object.prototype.hasOwnProperty.call(source.properties, property.key))
            item.properties[property.key] = structuredClone(source.properties[property.key]);
        }
        item.reusableOverrides = [...keys];
        renderItem(item);
        renderProperties(item);
        scheduleHistory();
      };
      label.appendChild(override);
    }
    let propertyGroup = "", propertyHost = host;
    properties.forEach((property) => {
      if (property.group && property.group !== propertyGroup) {
        const details = document.createElement("details"),
          heading = document.createElement("summary"),
          body = document.createElement("div"),
          storageKey = `crestron-ui-composer-property-group-${item.componentId}-${property.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          saved = localStorage.getItem(storageKey);
        details.className = "component-property-group";
        heading.textContent = property.group;
        body.className = "component-property-group-body";
        details.open = saved === null ? property.group === "Mode 0" : saved === "open";
        details.append(heading, body);
        details.addEventListener("toggle", () =>
          localStorage.setItem(storageKey, details.open ? "open" : "closed"),
        );
        host.appendChild(details);
        propertyHost = body;
        propertyGroup = property.group;
      } else if (!property.group) {
        propertyHost = host;
      }
      const label = document.createElement("label");
      label.textContent = property.name;
      if (property.type === "cip-text" || property.type === "text") {
        const editor = document.createElement("textarea"),
          actions = document.createElement("div");
        editor.className = "cip-text-editor";
        editor.value = String(item.properties?.[property.key] ?? property.defaultValue ?? "");
        actions.className = "cip-text-actions";
        function update(value) {
          item.properties = item.properties || {};
          item.properties[property.key] = value;
          renderItem(item);
          scheduleHistory();
        }
        function insertTag(type) {
          const address = prompt(`${type} contract name or join number:`, type === "Serial" ? "TextBlock.Status.Name" : type === "Digital" ? "TextBlock.State.Selected" : "TextBlock.Level.Feedback");
          if (!address) return;
          let tag;
          if (type === "Digital") {
            const whenTrue = prompt("Text when true:", "On") ?? "On",
              whenFalse = prompt("Text when false:", "Off") ?? "Off";
            tag = `<cipd>${address}?${whenTrue}:${whenFalse}</cipd>`;
          } else if (type === "Analog") {
            const format = prompt("Analog format (%r raw, %x hex, %t time, %65535.0p percent):", "%r") || "%r";
            tag = `<cipa>${address}?${format}</cipa>`;
          } else {
            const fallback = prompt("Design-time/default text:", "Unknown") ?? "";
            tag = `<cips>${address}:${fallback}</cips>`;
          }
          const start = editor.selectionStart, end = editor.selectionEnd;
          editor.value = editor.value.slice(0, start) + tag + editor.value.slice(end);
          editor.focus();
          editor.setSelectionRange(start + tag.length, start + tag.length);
          update(editor.value);
        }
        ["Digital", "Analog", "Serial"].forEach((type) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `+ ${type}`;
          button.onclick = () => insertTag(type);
          actions.appendChild(button);
        });
        editor.oninput = () => update(editor.value);
        label.append(editor, actions);
        propertyHost.appendChild(label);
        return;
      }
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
        wireReusableOverride(label, [...list.querySelectorAll("input")], property);
        label.appendChild(list);
        propertyHost.appendChild(label);
        return;
      }
      const input = document.createElement(
        property.type === "select" || property.type === "asset" ? "select" : "input",
      );
      if (property.type === "asset") {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "None";
        input.appendChild(empty);
        state.assets
          .filter((asset) => asset.type.startsWith("image/"))
          .forEach((asset) => {
            const option = document.createElement("option");
            option.value = asset.id;
            option.textContent = asset.name;
            input.appendChild(option);
          });
      } else if (property.type === "select")
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
              : property.type === "checkbox"
                ? "checkbox"
              : "text";
      if (property.type === "number") {
        if (property.min != null) input.min = String(property.min);
        if (property.max != null) input.max = String(property.max);
        if (property.step != null) input.step = String(property.step);
      }
      const propertyValue =
        (item.properties && item.properties[property.key]) ?? property.defaultValue ?? "";
      if (property.type === "checkbox")
        input.checked = propertyValue === true || propertyValue === 1 || propertyValue === "1" || String(propertyValue).toLowerCase() === "true";
      else input.value = propertyValue;
      if (property.type === "asset") {
        const selectedAsset = state.assets.find((asset) => asset.id === propertyValue);
        item.properties[`${property.key}Data`] = selectedAsset?.dataUrl || "";
      }
      input.oninput = () => {
        item.properties = item.properties || {};
        let nextValue =
          property.type === "checkbox"
            ? input.checked
            : property.type === "number"
              ? Number(input.value)
              : input.value;
        if (property.type === "number") {
          if (!Number.isFinite(nextValue))
            nextValue = Number(property.defaultValue) || 0;
          if (property.min != null)
            nextValue = Math.max(Number(property.min), nextValue);
          if (property.max != null)
            nextValue = Math.min(Number(property.max), nextValue);
          input.value = String(nextValue);
        }
        item.properties[property.key] = nextValue;
        if (property.type === "asset") {
          const selectedAsset = state.assets.find((asset) => asset.id === nextValue);
          item.properties[`${property.key}Data`] = selectedAsset?.dataUrl || "";
        }
        renderItem(item);
        if (property.affectsProperties) renderProperties(item);
        if (property.affectsBindings) renderBindings(item);
      };
      wireReusableOverride(label, [input], property);
      label.appendChild(input);
      propertyHost.appendChild(label);
    });
  }
  function renderAssetInspector(item) {
    const select = $("prop-asset"),
      selectedSelect = $("prop-asset-selected"),
      imageAssets = state.assets.filter((asset) => asset.type.startsWith("image/"));
    select.innerHTML = '<option value="">None</option>';
    selectedSelect.innerHTML = '<option value="">None</option>';
    imageAssets.forEach((asset) => {
      const option = document.createElement("option");
      option.value = asset.id;
      option.textContent = asset.name;
      select.appendChild(option);
      selectedSelect.appendChild(option.cloneNode(true));
    });
    select.value = item.graphicAsset || "";
    selectedSelect.value = item.selectedGraphicAsset || "";
    $("prop-asset-mode").value = item.graphicAssetMode || "none";
    const definition = item.componentId
      ? window.ComposerRuntime.get(item.componentId)
      : null;
    $("prop-asset-placement").value = item.graphicAssetPlacement || "widget";
    $("prop-asset-placement").disabled = !definition?.itemSelector;
    $("prop-asset-fit").value = item.graphicAssetFit || "contain";
    $("prop-asset-width").value = item.graphicAssetWidth ?? 35;
    $("prop-asset-height").value = item.graphicAssetHeight ?? 35;
    $("prop-asset-aspect-lock").checked = !!item.graphicAspectLocked;
    $("prop-asset-x").value = item.graphicAssetX ?? 50;
    $("prop-asset-y").value = item.graphicAssetY ?? 50;
    $("prop-asset-opacity").value = item.graphicAssetOpacity ?? 100;
    const overlay =
      Boolean(item.graphicAsset || item.selectedGraphicAsset) &&
      (item.graphicAssetMode || "none") === "overlay";
    ["prop-asset-width", "prop-asset-height", "prop-asset-opacity"].forEach(
      (id) => ($(id).disabled = !overlay),
    );
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
  function configuredRangeCount(item, range = {}) {
    const p = item?.properties || {},
      baseKey = String(range.baseKey || ""),
      countKeys = [
        range.countKey,
        /^primary/i.test(baseKey) ? "primaryCount" : "",
        /^submenu/i.test(baseKey) ? "submenuCount" : "",
        "defaultSlideCount",
        "defaultCount",
        "defaultItemCount",
        "itemCount",
        "slideCount",
        "cardCount",
        "buttonCount",
        "loadCount",
        "shadeCount",
      ].filter(Boolean),
      configured = countKeys
        .map((key) => Number(p[key]))
        .find((value) => Number.isFinite(value) && value > 0),
      labelCount = [
        p.localLabels,
        p.itemLabels,
        p.menuLabels,
        p.slideLabels,
        p.buttonLabels,
        p.displayLabels,
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.split("|").length)
        .find((value) => value > 0),
      capacity = [p.maxItems, p.maxCards, p.maxSlides, p.maxButtons, p.maxCount]
        .map(Number)
        .find((value) => Number.isFinite(value) && value > 0);
    return Math.max(
      1,
      Math.min(100, Math.round(configured || labelCount || capacity || 1)),
    );
  }
  function contractPageInstance(pageId) {
    if (!pageId) return "Global";
    const page = state.pages.find((entry) => entry.id === pageId),
      name = simplIdentifier(page?.name || "Page");
    return name || "Main";
  }
  function contractPageSelectionInstance(pageId) {
    const page = state.pages.find((entry) => entry.id === pageId),
      configured = String(page?.binding || page?.name || "Page")
        .trim()
        .replace(/\.Selected$/i, ""),
      name = simplIdentifier(configured);
    return name || "Main";
  }
  function contractWidgetInstance(item) {
    const base = simplIdentifier(item?.name || "Widget"),
      siblings = state.items.filter(
        (entry) =>
          entry.id !== item.id &&
          entry.pageId === item.pageId &&
          !!entry.master === !!item.master &&
          simplIdentifier(entry.name || "Widget") === base,
      ),
      ordered = [...siblings, item].sort(
        (a, b) => state.items.indexOf(a) - state.items.indexOf(b),
      ),
      number = ordered.indexOf(item) + 1;
    return `${base}${number > 1 ? number : ""}`;
  }
  function rebaseItemContractNames(item) {
    if (!item?.componentId || item.properties?.bindingMode !== "contract")
      return;
    const definition = window.ComposerRuntime.get(item.componentId),
      root = simplIdentifier(item.name || definition?.name || "Widget"),
      rebase = (value) => {
        const text = String(value || "");
        if (!text || /^\d+$/.test(text)) return text;
        const separator = text.search(/[.[]/);
        return separator < 0 ? `${root}.${text}` : root + text.slice(separator);
      },
      direct = (value, type, direction) => {
        const leaf =
          String(value || "")
            .split(".")
            .pop() || "Signal";
        return `${root}.${standardContractAttribute(type, direction, leaf)}`;
      };
    Object.entries(item.signalBindings || {}).forEach(([key, binding]) => {
      const signal = definition?.signals?.find((entry) => entry.key === key);
      if (binding.mode === "contract" && signal)
        binding.value = direct(binding.value, signal.type, signal.direction);
    });
    (definition?.addressBindings || []).forEach((entry) => {
      if (typeof item.properties?.[entry.key] === "string")
        item.properties[entry.key] = direct(
          item.properties[entry.key],
          entry.type,
          entry.direction,
        );
    });
    (definition?.rangeBindings || []).forEach((entry) => {
      if (typeof item.properties?.[entry.baseKey] === "string")
        item.properties[entry.baseKey] = rebase(item.properties[entry.baseKey]);
    });
  }
  function contractWidgetPrefix(item) {
    return `${contractPageInstance(item?.master ? "" : item?.pageId)}.${contractWidgetInstance(item)}`;
  }
  function parseCipTextSignals(text) {
    const signals = [], pattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi;
    let match;
    while ((match = pattern.exec(String(text || "")))) {
      const kind = match[1].toLowerCase(), content = match[2].trim(), delimiter = kind === "s" ? content.indexOf(":") : content.indexOf("?"),
        value = (delimiter >= 0 ? content.slice(0, delimiter) : content).trim();
      if (value) signals.push({ type: kind === "s" ? "serial" : kind === "d" ? "digital" : "analog", value });
    }
    return signals;
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
          if (
            signal.optionalProperty &&
            !item.properties?.[signal.optionalProperty]
          )
            return;
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
            rangeCount: configuredRangeCount(item, range),
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
        Object.entries(item.properties || {})
          .filter(
            ([, value]) =>
              typeof value === "string" && /<cip[sda]>/i.test(value),
          )
          .flatMap(([propertyKey, value]) =>
            parseCipTextSignals(value).map((signal) => ({
              ...signal,
              propertyKey,
            })),
          )
          .forEach((signal, index) =>
            rows.push({
              page,
              widget: item.name,
              name: `Inline ${signal.type} ${signal.propertyKey} ${index + 1}`,
              type: signal.type,
              direction: "input",
              mode: /^\d+$/.test(signal.value) ? "join" : overall,
              value: signal.value,
              owningItemId: item.id,
              cipInline: true,
              setMode() {},
              setValue() {},
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
  function openProjectSearch(initialQuery = "") {
    const dialog = $("project-search-dialog"),
      input = $("project-search-query");
    input.value = initialQuery;
    renderProjectSearch();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
  function navigateToSearchResult(result) {
    const item = result.itemId
        ? state.items.find((entry) => entry.id === result.itemId)
        : null,
      pageId = result.pageId || item?.pageId;
    if (pageId && state.pages.some((page) => page.id === pageId)) {
      state.activePage = pageId;
      renderPage();
    }
    if (item) select(item.id);
    $("project-search-dialog").close();
    setStatus(item ? `Found “${item.name}”` : `Opened ${result.title}`);
  }
  function renderProjectSearch() {
    const query = String($("project-search-query").value || "").trim(),
      needle = query.toLowerCase(),
      host = $("project-search-results"),
      results = [];
    host.innerHTML = "";
    if (!needle) {
      $("project-search-summary").textContent = "Type a value to search the entire project. Exact join numbers and full contract names are supported.";
      host.innerHTML = '<p class="hint" style="padding:14px">Tip: paste a contract name or join number here to answer “Where is this signal used?”</p>';
      return;
    }
    state.pages.forEach((page) => {
      const fields = [page.name, page.id, page.bindingMode, page.binding, page.background];
      if (fields.some((value) => String(value || "").toLowerCase().includes(needle)))
        results.push({ kind: "Page", title: page.name, detail: page.binding ? `${page.bindingMode}: ${page.binding}` : "Page definition", pageId: page.id });
    });
    state.items.forEach((item) => {
      const page = state.pages.find((entry) => entry.id === item.pageId),
        definition = item.componentId ? window.ComposerRuntime.get(item.componentId) : null,
        fields = {
          name: item.name,
          page: page?.name || (item.master ? "Global" : ""),
          type: definition?.name || item.componentId || "Custom HTML",
          category: definition?.category || "",
          text: JSON.stringify(item.properties || {}),
          bindings: JSON.stringify(item.signalBindings || {}),
          source: item.source || "",
        },
        matches = Object.entries(fields)
          .filter(([, value]) => String(value || "").toLowerCase().includes(needle))
          .map(([key]) => key);
      if (matches.length)
        results.push({
          kind: "Widget",
          title: item.name,
          detail: `${page?.name || "Global"} · ${definition?.name || item.componentId || "Custom HTML"} · matched ${matches.join(", ")}`,
          pageId: item.pageId,
          itemId: item.id,
        });
    });
    collectProjectSignals().forEach((signal) => {
      const haystack = [signal.value, signal.name, signal.widget, signal.page, signal.type, signal.direction, signal.mode]
        .map((value) => String(value || "").toLowerCase());
      if (!haystack.some((value) => value.includes(needle))) return;
      const item = signal.itemId ? state.items.find((entry) => entry.id === signal.itemId) : null,
        page = item ? state.pages.find((entry) => entry.id === item.pageId) : state.pages.find((entry) => entry.name === signal.page);
      results.push({
        kind: "Signal use",
        title: signal.value || "Unbound signal",
        detail: `${signal.page} · ${signal.widget} · ${signal.name} · ${signal.type} ${signal.direction} · ${signal.mode}`,
        pageId: signal.pageId || page?.id,
        itemId: signal.itemId,
      });
    });
    results.slice(0, 500).forEach((result) => {
      const button = document.createElement("button"),
        kind = document.createElement("span"),
        title = document.createElement("span"),
        detail = document.createElement("span");
      button.type = "button";
      button.className = "project-search-result";
      kind.className = "project-search-kind";
      title.className = "project-search-title";
      detail.className = "project-search-detail";
      kind.textContent = result.kind;
      title.textContent = result.title;
      detail.textContent = result.detail;
      button.title = `${result.title}\n${result.detail}`;
      button.onclick = () => navigateToSearchResult(result);
      button.append(kind, title, detail);
      host.appendChild(button);
    });
    $("project-search-summary").textContent = `${results.length} result${results.length === 1 ? "" : "s"}${results.length > 500 ? " · showing first 500" : ""} for “${query}”.`;
    if (!results.length) host.innerHTML = '<p class="hint" style="padding:14px">No pages, widgets, text, joins, contracts, or signal uses matched.</p>';
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
      const findUses = document.createElement("button");
      findUses.type = "button";
      findUses.className = "signal-find-uses";
      findUses.textContent = "Where used";
      findUses.disabled = missing;
      findUses.onclick = () => openProjectSearch(row.value);
      status.appendChild(findUses);
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
  function contractInstancePath(value) {
    return String(value || "")
      .split(".")
      .filter(Boolean)
      .map(simplIdentifier)
      .join(".");
  }
  function standardContractAttribute(type, direction, value) {
    if (/^Visibility$/i.test(simplIdentifier(value))) return "Visibility";
    const suffix =
        type === "digital"
          ? direction === "output"
            ? "Press"
            : "Selected"
          : type === "analog"
            ? direction === "output"
              ? "ValueSet"
              : "Feedback"
            : direction === "output"
              ? "Text"
              : "Name",
      patterns = {
        digital: /(?:_?(?:Press|Selected|Feedback|Value|Button|Btn))$/i,
        analog:
          direction === "output"
            ? /(?:_?(?:ValueSet|LevelSet|PositionSet|Set|Value))$/i
            : /(?:_?(?:Feedback|LevelValue|PositionValue|Value|Level))$/i,
        serial: /(?:_?(?:IndirectText|Label|Name|Text))$/i,
      },
      generic = /^(?:Level|Value|Position|Selected|Indirect|Signal)$/i;
    let prefix = simplIdentifier(value).replace(patterns[type], "");
    prefix = prefix.replace(/_+$/g, "");
    if (generic.test(prefix)) prefix = "";
    return `${prefix}${suffix}`;
  }
  function contractRangeCount(row) {
    if (!row.range || !row.itemId) return 1;
    const item = state.items.find((entry) => entry.id === row.itemId),
      definition = item?.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null,
      range = (definition?.rangeBindings || []).find(
        (entry) => String(item.properties?.[entry.baseKey] || "") === row.value,
      );
    return configuredRangeCount(item, range);
  }
  function expandContractSubItems(row) {
    if (!/\{source\}|\{sourceIndex\}/.test(String(row.value || "")))
      return [row];
    const item = state.items.find((entry) => entry.id === row.itemId),
      count = Math.max(
        1,
        Math.min(20, Math.round(Number(item?.properties?.sourceCount) || 1)),
      );
    return Array.from({ length: count }, (_, index) => ({
      ...row,
      value: String(row.value)
        .replace(/\{source\}/g, String(index + 1))
        .replace(/\{sourceIndex\}/g, String(index)),
    }));
  }
  function expandedContractSignals() {
    const rows = [];
    collectProjectSignals()
      .filter(
        (row) => row.mode === "contract" && String(row.value || "").trim(),
      )
      .flatMap(expandContractSubItems)
      .forEach((row) => {
        const count = /\{n\}|\{index\}/.test(row.value)
          ? contractRangeCount(row)
          : 1;
        for (let index = 0; index < count; index++)
          rows.push({
            ...row,
            contractIndex: index,
            value: String(row.value)
              .replace(/\{n\}/g, String(index + 1))
              .replace(/\{index\}/g, String(index)),
          });
      });
    return rows;
  }
  function contractSignalShape(row) {
    const value = String(row.value || "").trim(),
      item = row.itemId
        ? state.items.find((entry) => entry.id === row.itemId)
        : null,
      legacy = value.match(/^(.*)\.\{(?:n|index)\}\.(.+)$/),
      array = value.match(
        /^([A-Za-z_][A-Za-z0-9_.]*)\[\{(?:n|index)\}\]\.(.+)$/,
      );
    if (row.cipInline) {
      const inlineParts = value.split(".").filter(Boolean),
        instanceParts = inlineParts.slice(0, -1),
        instancePath = instanceParts.join(".");
      return {
        instancePath,
        parentPath: instanceParts.slice(0, -1).join("."),
        nestedInstanceName: instanceParts[instanceParts.length - 1] || "",
        attributePath: inlineParts[inlineParts.length - 1] || "Signal",
        instances: 1,
      };
    }
    if (item && row.range && Number.isInteger(row.contractIndex)) {
      const expandedArray = value.match(/^(.*)\[\d+\]\.(.+)$/),
        expandedLegacy = value.match(/^(.*)\.\d+\.(.+)$/),
        match = expandedArray || expandedLegacy;
      if (match) {
        const originalParts = match[1].split(".").filter(Boolean),
          childPath = originalParts.slice(1).join("_") || "Items",
          widgetPath = contractWidgetPrefix(item);
        return {
          instancePath: `${widgetPath}.${childPath}[${row.contractIndex}]`,
          parentPath: widgetPath,
          nestedInstanceName: childPath,
          attributePath: match[2],
          instances: 1,
        };
      }
    }
    if (item && row.range && (legacy || array)) {
      const match = legacy || array,
        originalParts = match[1].split(".").filter(Boolean),
        childPath = originalParts.slice(1).join("_") || "Items",
        widgetPath = contractWidgetPrefix(item),
        instancePath = `${widgetPath}.${childPath}`;
      return {
        instancePath,
        parentPath: widgetPath,
        nestedInstanceName: childPath,
        attributePath: match[2],
        instances: Math.max(1, Number(row.rangeCount) || 1),
      };
    }
    const parts = value.split(".").filter(Boolean);
    if (item) {
      const widgetPath = contractWidgetPrefix(item),
        widgetName = widgetPath.split(".").pop();
      return {
        instancePath: widgetPath,
        parentPath: widgetPath.slice(0, -(widgetName.length + 1)),
        nestedInstanceName: widgetName,
        attributePath: parts[parts.length - 1] || "Signal",
        instances: 1,
      };
    }
    if (row.pageId) {
      const pagePath = contractPageSelectionInstance(row.pageId);
      return {
        instancePath: pagePath,
        parentPath: "",
        nestedInstanceName: "",
        attributePath: "Selected",
        instances: 1,
      };
    }
    return {
      instancePath: parts[0] || "",
      parentPath: "",
      nestedInstanceName: "",
      attributePath: parts.slice(1).join("_") || "",
      instances: 1,
    };
  }
  function contractBuildData() {
    const sourceRows = collectProjectSignals()
        .filter(
          (row) => row.mode === "contract" && String(row.value || "").trim(),
        )
        .flatMap(expandContractSubItems),
      rows = expandedContractSignals(),
      errors = [],
      paths = new Map(),
      components = new Map();
    sourceRows.forEach((row) => {
      const value = row.value.trim(),
        shape = contractSignalShape(row);
      if (!shape.instancePath || !shape.attributePath) {
        errors.push(`“${value}” needs a component and signal name.`);
        return;
      }
      if (!/^[A-Za-z_][A-Za-z0-9_.{}\[\]-]*$/.test(value)) {
        errors.push(`“${value}” contains unsupported contract characters.`);
        return;
      }
      const instancePath = shape.instancePath,
        instanceName = contractInstancePath(instancePath),
        attributeName = standardContractAttribute(
          row.type,
          row.direction,
          shape.attributePath,
        ),
        key = instanceName,
        component = components.get(key) || {
          instanceName,
          instancePath,
          parentPath: shape.parentPath,
          nestedInstanceName: shape.nestedInstanceName,
          instances: shape.instances,
          rows: [],
        };
      const canonicalPath = `${instancePath}.${attributeName}`,
        prior = paths.get(canonicalPath);
      if (prior) {
        errors.push(
          `“${canonicalPath}” is assigned more than once (${prior.widget} and ${row.widget}).`,
        );
        return;
      }
      paths.set(canonicalPath, row);
      if (component.instancePath !== instancePath) {
        errors.push(
          `“${instancePath}” and “${component.instancePath}” both become the SIMPL name “${instanceName}”. Rename one of the contract paths.`,
        );
        return;
      }
      if (
        component.rows.some(
          (entry) =>
            entry.type === row.type &&
            entry.direction === row.direction &&
            entry.attributeName === attributeName,
        )
      ) {
        errors.push(
          `“${value}” becomes duplicate Contract attribute “${instanceName}.${attributeName}”.`,
        );
        return;
      }
      component.instances = Math.max(component.instances, shape.instances);
      component.rows.push({ ...row, attributeName });
      components.set(key, component);
    });
    let missingParents = true;
    while (missingParents) {
      missingParents = false;
      [...components.values()]
        .filter((component) => component.parentPath)
        .forEach((component) => {
          const parentName = contractInstancePath(component.parentPath);
          if (components.has(parentName)) return;
          const parts = component.parentPath.split(".").filter(Boolean),
            grandparentPath = parts.slice(0, -1).join(".");
          components.set(parentName, {
            instanceName: parentName,
            instancePath: component.parentPath,
            parentPath: grandparentPath,
            nestedInstanceName: parts[parts.length - 1] || parentName,
            instances: 1,
            rows: [],
          });
          missingParents = true;
        });
    }
    const contractId = stableContractId(`contract:${state.contract.name}`),
      cceComponents = [],
      specifications = [],
      nestedSpecifications = [];
    components.forEach((component) => {
      const componentId = stableContractId(
          `component:${component.instanceName}`,
        ),
        commands = [],
        feedbacks = [];
      ["digital", "analog", "serial"].forEach((type) => {
        const states = component.rows.filter(
            (row) => row.type === type && row.direction === "input",
          ),
          events = component.rows.filter(
            (row) => row.type === type && row.direction === "output",
          ),
          count = Math.max(states.length, events.length),
          dataType = type === "digital" ? 1 : type === "analog" ? 2 : 3;
        for (let index = 0; index < count; index++) {
          const stateRow = states[index],
            eventRow = events[index],
            stateId = stableContractId(
              `state:${component.instanceName}:${type}:${index}:${stateRow?.value || "empty"}`,
            ),
            eventId = stableContractId(
              `event:${component.instanceName}:${type}:${index}:${eventRow?.value || "empty"}`,
            ),
            makeEntry = (row, id, siblingId, attributeType) => ({
              Errors: [],
              name: row?.attributeName || "",
              siblingId,
              dataType,
              notes: row ? `${row.page} · ${row.widget} · ${row.name}` : "",
              id,
              parentId: componentId,
              attributeType,
            });
          commands.push(makeEntry(stateRow, stateId, eventId, 0));
          feedbacks.push(makeEntry(eventRow, eventId, stateId, 1));
        }
      });
      const isNested = !!component.parentPath,
        parentName = contractInstancePath(component.parentPath),
        exportedComponentName = component.instanceName
          .split(".")
          .map(simplIdentifier)
          .join("_"),
        exportedComponent = {
          Errors: [],
          parentId: contractId,
          id: componentId,
          name: exportedComponentName,
          description: `Generated from Crestron UI Composer (${component.rows[0]?.page || "Project"})`,
          commands,
          feedbacks,
          specifications: [],
        };
      cceComponents.push(exportedComponent);
      const specification = {
        Errors: [],
        parentId: isNested
          ? stableContractId(`component:${parentName}`)
          : contractId,
        id: stableContractId(`specification:${component.instanceName}`),
        componentId,
        instanceName: isNested
          ? simplIdentifier(component.nestedInstanceName)
          : component.instanceName,
        numberOfInstances: component.instances,
      };
      if (isNested)
        nestedSpecifications.push({
          parentId: stableContractId(`component:${parentName}`),
          specification,
        });
      else specifications.push(specification);
    });
    if (nestedSpecifications.length) {
      nestedSpecifications.forEach((entry) => {
        const parent = cceComponents.find(
          (component) => component.id === entry.parentId,
        );
        if (parent) parent.specifications.push(entry.specification);
        else
          errors.push("A repeated collection is missing its parent component.");
      });
    }
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
  let simulatorTimer = 0,
    simulatorItemFilter = null;
  const deploymentSettingsKey = "crestron-ui-composer-deployment-v1";
  const deploymentQueueStatus = new Map();
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
  function deploymentProfiles() {
    return deploymentSettings().profiles || [];
  }
  function defaultDeploymentType(deviceId) {
    return deviceId === "ipad-landscape" ? "mobile" : deviceId === "monitor-4k" ? "web" : "touchscreen";
  }
  function activeDeploymentProfile() {
    const id = $("deploy-profile")?.value || deploymentSettings().activeProfileId || "";
    return deploymentProfiles().find((profile) => profile.id === id) || null;
  }
  function renderDeploymentProfiles(selectedId = deploymentSettings().activeProfileId || "") {
    const profileSelect = $("deploy-profile"), deviceSelect = $("deploy-profile-device"),
      profiles = deploymentProfiles();
    profileSelect.innerHTML = '<option value="">Unsaved profile</option>';
    profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.name} — ${profile.host || "No host"}`;
      profileSelect.appendChild(option);
    });
    deviceSelect.innerHTML = "";
    deviceProfiles.filter((device) => device.id !== "custom").forEach((device) => {
      const option = document.createElement("option");
      option.value = device.id;
      option.textContent = device.name;
      deviceSelect.appendChild(option);
    });
    profileSelect.value = profiles.some((profile) => profile.id === selectedId) ? selectedId : "";
    loadDeploymentProfile(profileSelect.value);
    renderDeploymentQueue();
  }
  function renderDeploymentQueue() {
    const host = $("deployment-profile-list");
    if (!host) return;
    const hadEntries = host.querySelectorAll("input").length > 0,
      checked = new Set([...host.querySelectorAll("input:checked")].map((input) => input.value));
    host.innerHTML = "";
    deploymentProfiles().forEach((profile) => {
      const row = document.createElement("label"), select = document.createElement("input"),
        name = document.createElement("strong"), target = document.createElement("small"), stateLabel = document.createElement("span"),
        device = deviceProfiles.find((entry) => entry.id === profile.deviceId), queue = deploymentQueueStatus.get(profile.id);
      row.className = `deployment-queue-entry ${queue?.state || ""}`;
      select.type = "checkbox";
      select.value = profile.id;
      select.checked = hadEntries ? checked.has(profile.id) : true;
      name.textContent = profile.name;
      target.textContent = `${profile.host || "No host"} · ${device?.model || "Unknown model"} · ${profile.deploymentType || defaultDeploymentType(profile.deviceId)} · ${profile.packagePath ? profile.packagePath.split(/[\\/]/).pop() : "No package"}`;
      stateLabel.className = "deployment-queue-state";
      stateLabel.textContent = queue?.message || "Not checked";
      row.append(select, name, target, stateLabel);
      host.appendChild(row);
    });
    if (!deploymentProfiles().length) host.innerHTML = '<p class="hint">Create and save a deployment profile to use the queue.</p>';
  }
  function selectedDeploymentQueueProfiles() {
    const ids = new Set([...document.querySelectorAll("#deployment-profile-list input:checked")].map((input) => input.value));
    return deploymentProfiles().filter((profile) => ids.has(profile.id));
  }
  function setDeploymentQueueState(profileId, state, message, details = {}) {
    deploymentQueueStatus.set(profileId, { state, message, ...details });
    renderDeploymentQueue();
  }
  function loadDeploymentProfile(id) {
    const profile = deploymentProfiles().find((entry) => entry.id === id), settings = deploymentSettings();
    $("deploy-profile-name").value = profile?.name || "";
    $("deploy-profile-device").value = profile?.deviceId || state.targetDevice;
    $("deploy-target-type").value = profile?.deploymentType || defaultDeploymentType(profile?.deviceId || state.targetDevice);
    $("deploy-host").value = profile?.host || settings.host || "";
    $("deploy-username").value = profile?.username || "";
    $("deploy-package").value = profile?.packagePath || settings.packagePath || "";
    $("deploy-profile-delete").disabled = !profile;
    saveDeploymentSettings({ activeProfileId: profile?.id || "" });
  }
  function saveCurrentDeploymentProfile() {
    const settings = deploymentSettings(), profiles = deploymentProfiles(), selected = activeDeploymentProfile(),
      name = $("deploy-profile-name").value.trim(), host = $("deploy-host").value.trim();
    if (!name) { alert("Enter a deployment profile name."); return; }
    if (!host) { alert("Enter the panel IP address or host name."); return; }
    const profile = {
      id: selected?.id || uid("deploy-"), name, host,
      username: $("deploy-username").value.trim(),
      deviceId: $("deploy-profile-device").value,
      deploymentType: $("deploy-target-type").value,
      packagePath: $("deploy-package").value,
      slowMode: true,
      updatedAt: new Date().toISOString(),
      lastCheck: selected?.lastCheck || null,
    };
    const next = selected ? profiles.map((entry) => entry.id === selected.id ? profile : entry) : [...profiles, profile];
    saveDeploymentSettings({ ...settings, profiles: next, activeProfileId: profile.id, host, packagePath: profile.packagePath, slowMode: profile.slowMode });
    renderDeploymentProfiles(profile.id);
    $("deploy-status").textContent = `Saved deployment profile “${profile.name}”.`;
  }
  function updateActiveDeploymentProfile(patch) {
    const selected = activeDeploymentProfile();
    if (!selected) return;
    saveDeploymentSettings({
      profiles: deploymentProfiles().map((profile) => profile.id === selected.id
        ? { ...profile, ...patch, updatedAt: new Date().toISOString() } : profile),
    });
    renderDeploymentProfiles(selected.id);
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
      rollback.disabled = !entry.backupPath;
      rollback.onclick = () => {
        $("deploy-package").value = entry.backupPath;
        saveDeploymentSettings({ packagePath: entry.backupPath });
        $("deploy-status").textContent =
          `Rollback package selected: ${entry.backupPath}`;
      };
      title.textContent = `${entry.success === false ? "FAILED · " : entry.success === true ? "SUCCESS · " : ""}${entry.profileName ? `${entry.profileName} · ` : ""}${entry.host} · slow mode`;
      detail.textContent = `${new Date(entry.time).toLocaleString()} · ${entry.device || "Touchscreen"}${entry.deploymentType ? ` · ${entry.deploymentType}` : ""}${entry.resolution ? ` · ${entry.resolution}` : ""} · ${entry.packagePath}`;
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
    const address = simulatedSignalAddress(row);
    window.ComposerRuntime.simulator.set(
      signalTypeCode(row.type),
      address,
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
  function simulatedSignalAddress(row) {
    if (!row.itemId) return String(row.value || "");
    const item = state.items.find((candidate) => candidate.id === row.itemId);
    return window.ComposerRuntime.resolveAddress(
      String(row.value || ""),
      row.type,
      row.direction,
      item ? contractWidgetPrefix(item) : "",
    );
  }
  function simulatorSignalRows() {
    return collectProjectSignals().flatMap((row) => {
      if (!row.range) return [row];
      const count = Math.max(1, Math.min(100, Number(row.rangeCount) || 1));
      return Array.from({ length: count }, (_, index) => ({
        ...row,
        name: `${row.name} [${index}]`,
        range: false,
        contractIndex: index,
        value:
          row.mode === "join"
            ? String((Number(row.value) || 0) + index * (row.rangeIncrement || 1))
            : String(row.value || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index)),
      }));
    });
  }
  function renderSignalSimulator() {
    const query = String($("simulator-search").value || "")
        .trim()
        .toLowerCase(),
      rows = simulatorSignalRows().filter(
        (row) =>
          (!simulatorItemFilter || row.itemId === simulatorItemFilter) &&
          (!query ||
            `${row.page} ${row.widget} ${row.name} ${row.type} ${row.value}`
              .toLowerCase()
              .includes(query)),
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
        key = `${signalTypeCode(row.type)}:${simulatedSignalAddress(row)}`;
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
      } else if (row.type === "analog" && row.direction === "output") {
        const value = document.createElement("span");
        value.className = "simulator-output-value";
        value.dataset.simulatorKey = key;
        value.textContent = simulator.values.has(key)
          ? String(simulator.values.get(key))
          : "Interact with widget";
        controlCell.appendChild(value);
      } else {
        const input = document.createElement("input");
        input.type = row.type === "analog" ? "number" : "text";
        input.value = simulator.values.get(key) ?? "";
        input.placeholder =
          row.type === "analog"
            ? /count|number of|items/i.test(row.name)
              ? "Count"
              : "0–65535 (50% = 32768)"
            : row.direction === "output"
              ? "Publish serial"
              : "Serial value";
        if (row.type === "analog") {
          input.min = "0";
          input.max = "65535";
        }
        input.oninput = () =>
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
    document.querySelectorAll("[data-simulator-key]").forEach((element) => {
      const value = window.ComposerRuntime.simulator.values.get(
        element.dataset.simulatorKey,
      );
      if (value !== undefined) element.textContent = String(value);
    });
  }
  function clearSimulatorFocus() {
    document
      .querySelectorAll(".widget.simulator-focus")
      .forEach((element) => element.classList.remove("simulator-focus"));
  }
  function openSignalSimulator(itemId = null) {
    simulatorItemFilter = itemId;
    clearSimulatorFocus();
    const item = itemId
        ? state.items.find((candidate) => candidate.id === itemId)
        : null,
      title = $("simulator-title"),
      hint = $("simulator-hint");
    title.textContent = item ? `Simulate: ${item.name}` : "Signal Simulator";
    hint.textContent = item
      ? "Showing only this component’s inputs and outputs. The component is highlighted on the panel."
      : "Drive feedback inputs and observe widget output events without SIMPL.";
    $("simulator-search").value = "";
    renderSignalSimulator();
    if (item) {
      if (!item.master && item.pageId !== state.activePage) {
        state.activePage = item.pageId;
        renderPage();
      }
      requestAnimationFrame(() => {
        const element = stage.querySelector(`.widget[data-id="${CSS.escape(item.id)}"]`);
        if (element) {
          element.classList.add("simulator-focus");
          element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      });
    }
    const dialog = $("simulator-dialog");
    if (!dialog.open) {
      dialog.style.left = `${Math.max(20, (window.innerWidth - Math.min(1200, window.innerWidth * 0.88)) / 2)}px`;
      dialog.style.top = "72px";
      dialog.show();
    }
    clearInterval(simulatorTimer);
    simulatorTimer = setInterval(refreshSimulatorEvents, 250);
  }
  function renderBindings(item) {
    if (item.componentId) {
      renderStructuredBindings(item);
      return;
    }
    const host = $("signal-bindings"),
      bindings = findBindings(item.source);
    host.innerHTML = "";
    const reusableDefinition = item.reusableId
        ? state.reusables.find((entry) => entry.id === item.reusableId)
        : null,
      linkedInstance = !!reusableDefinition && !isReusableMaster(item),
      inheritedBindings = linkedInstance && !item.reusableBindingsOverride;
    if (reusableDefinition) {
      const panel = document.createElement("div");
      panel.className = "reusable-binding-control";
      if (linkedInstance) {
        const label = document.createElement("label"),
          checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!item.reusableBindingsOverride;
        label.append(checkbox, document.createTextNode("Use custom signal bindings for this instance"));
        checkbox.onchange = () => {
          item.reusableBindingsOverride = checkbox.checked;
          if (!checkbox.checked) {
            const source = (reusableDefinition.items || []).find(
              (entry) => entry.reusableKey === item.reusableKey,
            );
            if (source) item.source = source.source;
          }
          renderItem(item);
          renderBindings(item);
          scheduleHistory();
        };
        panel.appendChild(label);
      } else panel.textContent = `Master bindings for “${reusableDefinition.name}” — linked instances inherit these by default.`;
      host.appendChild(panel);
    }
    if (!bindings.length) {
      host.insertAdjacentHTML("beforeend", '<div class="signal-empty">No variables ending in “Signal” were detected.</div>');
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
    if (inheritedBindings)
      host
        .querySelectorAll(".signal-binding input,.signal-binding select")
        .forEach((control) => (control.disabled = true));
  }
  function renderStructuredBindings(item) {
    const host = $("signal-bindings"),
      definition = window.ComposerRuntime.get(item.componentId),
      overall = (definition.properties || []).some(
        (p) => p.key === "bindingMode",
      )
        ? (item.properties && item.properties.bindingMode) || "contract"
        : "";
    host.innerHTML = "";
    const reusableDefinition = item.reusableId
        ? state.reusables.find((entry) => entry.id === item.reusableId)
        : null,
      linkedInstance = !!reusableDefinition && !isReusableMaster(item),
      inheritedBindings = linkedInstance && !item.reusableBindingsOverride;
    if (reusableDefinition) {
      const panel = document.createElement("div");
      panel.className = "reusable-binding-control";
      if (linkedInstance) {
        const label = document.createElement("label"),
          checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!item.reusableBindingsOverride;
        label.append(checkbox, document.createTextNode("Use custom signal bindings for this instance"));
        panel.appendChild(label);
        checkbox.onchange = () => {
          item.reusableBindingsOverride = checkbox.checked;
          if (!checkbox.checked) {
            const source = (reusableDefinition.items || []).find(
              (entry) => entry.reusableKey === item.reusableKey,
            );
            if (source) {
              item.signalBindings = structuredClone(source.signalBindings || {});
              const signalKeys = new Set([
                "bindingMode",
                ...(definition.signals || [])
                  .map((signal) => signal.optionalProperty)
                  .filter(Boolean),
                ...(definition.properties || [])
                  .filter((property) => property.signalSetting)
                  .map((property) => property.key),
              ]);
              Object.entries(source.properties || {}).forEach(([key, value]) => {
                if (signalKeys.has(key)) item.properties[key] = structuredClone(value);
              });
            }
          }
          renderItem(item);
          renderBindings(item);
          scheduleHistory();
        };
      } else panel.textContent = `Master bindings for “${reusableDefinition.name}” — linked instances inherit these by default.`;
      host.appendChild(panel);
    }
    if ((definition.properties || []).some((property) => property.key === "bindingMode")) {
      const modeLabel = document.createElement("label"),
        modeSelect = document.createElement("select");
      modeLabel.className = "signal-binding-mode";
      modeLabel.appendChild(document.createTextNode("Crestron binding mode"));
      modeSelect.innerHTML =
        '<option value="contract">Contract names</option><option value="join">Join numbers</option>';
      modeSelect.value = overall || "contract";
      modeSelect.disabled = inheritedBindings;
      modeSelect.onchange = () => {
        item.properties = item.properties || {};
        item.properties.bindingMode = modeSelect.value;
        Object.values(item.signalBindings || {}).forEach(
          (binding) => (binding.mode = modeSelect.value),
        );
        renderItem(item);
        renderBindings(item);
        scheduleHistory();
      };
      modeLabel.appendChild(modeSelect);
      host.appendChild(modeLabel);
    }
    (definition.properties || [])
      .filter(
        (property) =>
          property.signalSetting &&
          property.key !== "bindingMode" &&
          property.key !== "visibilityEnabled",
      )
      .forEach((property) => {
        const label = document.createElement("label"),
          checkbox = document.createElement("input");
        label.className = "signal-optional-toggle";
        checkbox.type = "checkbox";
        checkbox.checked = !!item.properties?.[property.key];
        checkbox.disabled = inheritedBindings;
        checkbox.onchange = () => {
          item.properties = item.properties || {};
          item.properties[property.key] = checkbox.checked;
          if (checkbox.checked) {
            (definition.signals || [])
              .filter(
                (signal) =>
                  signal.optionalProperty === property.key &&
                  !item.signalBindings?.[signal.key]?.value,
              )
              .forEach((signal) => {
                item.signalBindings = item.signalBindings || {};
                item.signalBindings[signal.key] = {
                  mode: overall || "contract",
                  value:
                    (overall || "contract") === "contract"
                      ? signal.defaultValue || signal.name
                      : "",
                };
              });
          }
          renderBindings(item);
          renderItem(item);
          scheduleHistory();
        };
        label.append(checkbox, ` ${property.name}`);
        host.appendChild(label);
      });
    const visibilityEnabled = document.createElement("label"),
      visibilityCheckbox = document.createElement("input");
    visibilityEnabled.className = "signal-optional-toggle";
    visibilityCheckbox.type = "checkbox";
    visibilityCheckbox.checked = !!item.properties?.visibilityEnabled;
    visibilityCheckbox.onchange = () => {
      item.properties = item.properties || {};
      item.properties.visibilityEnabled = visibilityCheckbox.checked;
      const visibility = definition.signals.find(
        (signal) => signal.key === "visibility",
      );
      if (
        visibilityCheckbox.checked &&
        visibility &&
        !item.signalBindings.visibility?.value
      )
        item.signalBindings.visibility = {
          mode: overall || "contract",
          value:
            (overall || "contract") === "contract"
              ? visibility.defaultValue || "Visibility"
              : "",
        };
      renderBindings(item);
      renderItem(item);
      scheduleHistory();
    };
    visibilityEnabled.append(visibilityCheckbox, " Enable visibility signal");
    host.appendChild(visibilityEnabled);
    definition.signals.forEach((signal) => {
      if (
        signal.optionalProperty &&
        !item.properties?.[signal.optionalProperty]
      )
        return;
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
          : "Example: Carousel_Items[{index}].Press";
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
    if (inheritedBindings)
      host
        .querySelectorAll(".signal-binding input,.signal-binding select,.signal-optional-toggle input")
        .forEach((control) => (control.disabled = true));
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
      const pointerX = (ev.clientX - sx) / panelZoom,
        pointerY = (ev.clientY - sy) / panelZoom;
      if (resize) {
        if (movingItems.length === 1) {
          item.w = Math.max(20, snap(start.w + pointerX));
          item.h = Math.max(20, snap(start.h + pointerY));
        } else {
          const originalWidth = Math.max(1, bounds.right - bounds.left),
            originalHeight = Math.max(1, bounds.bottom - bounds.top),
            scaleX = Math.max(0.05, (originalWidth + pointerX) / originalWidth),
            scaleY = Math.max(
              0.05,
              (originalHeight + pointerY) / originalHeight,
            );
          starts.forEach((entry) => {
            entry.item.x = snap(bounds.left + (entry.x - bounds.left) * scaleX);
            entry.item.y = snap(bounds.top + (entry.y - bounds.top) * scaleY);
            entry.item.w = Math.max(20, snap(entry.w * scaleX));
            entry.item.h = Math.max(20, snap(entry.h * scaleY));
          });
        }
      } else {
        const dx = snap(pointerX),
          dy = snap(pointerY);
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
        checkAsset(item.graphicAsset, `Page template “${template.name}”`);
        checkAsset(item.selectedGraphicAsset, `Page template “${template.name}”`);
      });
    });
    state.reusables.forEach((reusable) =>
      (reusable.items || []).forEach((item) => {
        checkAsset(item.assetId, `Reusable “${reusable.name}”`);
        checkAsset(item.backgroundAsset, `Reusable “${reusable.name}”`);
        checkAsset(item.graphicAsset, `Reusable “${reusable.name}”`);
        checkAsset(item.selectedGraphicAsset, `Reusable “${reusable.name}”`);
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
      const safeMargin = Math.max(0, Number(item.layout?.safeMargin) || 0);
      if (safeMargin && !window.ComposerResponsiveLayout.fitsSafeArea(
        item, { width: state.width, height: state.height }, safeMargin,
      ))
        add("warning", `“${item.name}” crosses its ${safeMargin}px safe margin.`);
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
      (item.actions || []).forEach((action, actionIndex) => {
        const owner = `“${item.name}” action ${actionIndex + 1}`,
          widgetActions = new Set([
            "show",
            "hide",
            "animate",
            "text",
            "property",
            "enable",
            "disable",
            "select",
          ]);
        if (
          ![
            "press",
            "release",
            "hold",
            "page-enter",
            "timer",
            "signal-change",
          ].includes(action.event)
        )
          add("error", `${owner} has an unsupported event.`);
        if (action.event === "signal-change") {
          if (!String(action.triggerSignal || "").trim())
            add("error", `${owner} has no trigger signal.`);
          if (
            !["digital", "analog", "serial"].includes(
              action.triggerType || "digital",
            )
          )
            add("error", `${owner} has an invalid trigger signal type.`);
          if (
            [
              "equals",
              "not-equals",
              "greater",
              "greater-equal",
              "less",
              "less-equal",
            ].includes(action.condition) &&
            String(action.compareValue ?? "") === ""
          )
            add("error", `${owner} needs a comparison value.`);
        }
        if (action.type === "navigate" && !pageIds.has(action.target))
          add("error", `${owner} targets a missing page.`);
        if (
          widgetActions.has(action.type) &&
          !state.items.some((candidate) => candidate.id === action.target)
        )
          add("error", `${owner} targets a missing widget.`);
        if (
          /^signal-(digital|analog|serial)$/.test(action.type) &&
          !String(action.target || "").trim()
        )
          add("error", `${owner} has no output signal address.`);
        if (
          action.type === "property" &&
          !String(action.value || "").includes("=")
        )
          add("warning", `${owner} should use property=value syntax.`);
      });
      checkAsset(item.assetId, `“${item.name}”`);
      checkAsset(item.backgroundAsset, `“${item.name}”`);
      checkAsset(item.graphicAsset, `“${item.name}”`);
      checkAsset(item.selectedGraphicAsset, `“${item.name}”`);
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
    const pageEnterNavigation = new Map();
    state.items.forEach((item) =>
      (item.actions || [])
        .filter(
          (action) =>
            action.event === "page-enter" &&
            action.type === "navigate" &&
            pageIds.has(action.target),
        )
        .forEach((action) => {
          const sources = item.master
            ? state.pages.map((page) => page.id)
            : [item.pageId];
          sources.forEach((source) =>
            pageEnterNavigation.set(source, [
              ...(pageEnterNavigation.get(source) || []),
              action.target,
            ]),
          );
        }),
    );
    const visiting = new Set(),
      visitedPages = new Set();
    function findPageLoop(pageId, path = []) {
      if (visiting.has(pageId)) return [...path, pageId];
      if (visitedPages.has(pageId)) return null;
      visiting.add(pageId);
      for (const target of pageEnterNavigation.get(pageId) || []) {
        const loop = findPageLoop(target, [...path, pageId]);
        if (loop) return loop;
      }
      visiting.delete(pageId);
      visitedPages.add(pageId);
      return null;
    }
    for (const page of state.pages) {
      const loop = findPageLoop(page.id);
      if (loop) {
        add(
          "error",
          `Page-enter actions create a navigation loop: ${loop.map((id) => state.pages.find((page) => page.id === id)?.name || id).join(" → ")}.`,
        );
        break;
      }
    }

    const expandedSignals = [];
    collectProjectSignals()
      .flatMap(expandContractSubItems)
      .forEach((row) => {
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
          if (!/^[A-Za-z_][A-Za-z0-9_.{}\[\]-]*$/.test(value)) {
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
              contractIndex: index,
              value: value
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index)),
            });
        }
      });
    expandedSignals.forEach((row) => {
      const shape = row.mode === "contract" ? contractSignalShape(row) : null,
        canonicalValue = shape
          ? `${shape.instancePath}.${standardContractAttribute(row.type, row.direction, shape.attributePath)}`
          : row.value,
        signalKey = key(row.type, row.direction, canonicalValue),
        owner = `${row.page} · “${row.widget}” ${row.name}`;
      if (used.has(signalKey))
        add(
          "warning",
          `${owner} duplicates ${row.mode} signal ${canonicalValue} used by ${used.get(signalKey)}.`,
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
    lastHealthReport = [
      "CRESTRON UI COMPOSER — PROJECT HEALTH REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Project format: v${window.ComposerProjectMigrations.CURRENT_VERSION}`,
      `Target: ${selectedDevice().name} (${state.width} × ${state.height})`,
      `Pages: ${state.pages.length}   Widgets: ${state.items.length}   Assets: ${state.assets.length}`,
      "",
      issues.length ? validationReport(issues) : "0 error(s), 0 warning(s)\n\nValidation passed. No project issues were found.",
    ].join("\n");
    if (interactive) {
      $("health-title").textContent = "Project health report";
      $("compatibility-device").hidden = true;
      $("compatibility-preview").hidden = true;
      $("compatibility-autofit").hidden = true;
      $("health-summary").textContent = issues.length
        ? `${errors.length} error(s), ${issues.length - errors.length} warning(s)`
        : "No project issues were found.";
      $("health-report").textContent = lastHealthReport;
      $("health-dialog").showModal();
    }
    setStatus(
      issues.length
        ? `${errors.length} validation errors, ${issues.length - errors.length} warnings`
        : "Validation passed",
    );
    return { issues, errors };
  }
  async function runBuildSelfTest() {
    const dialog = $("health-dialog");
    $("health-title").textContent = "Export/build self-test";
    $("health-summary").textContent = "Running widget export and Crestron CLI package checks…";
    $("health-report").textContent = "Preparing the complete widget catalog. This can take several seconds.";
    $("compatibility-device").hidden = true;
    $("compatibility-preview").hidden = true;
    $("compatibility-autofit").hidden = true;
    if (!dialog.open) dialog.showModal();
    setStatus("Running export/build self-test…");
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try {
      await performBuildSelfTest();
    } catch (error) {
      lastHealthReport = `EXPORT/BUILD SELF-TEST — FAILED\n\n${error.stack || error.message || error}`;
      $("health-summary").textContent = "The self-test failed.";
      $("health-report").textContent = lastHealthReport;
      setStatus(`Export/build self-test failed: ${error.message || error}`);
    }
  }
  async function performBuildSelfTest() {
    const projectResult = runValidation(false),
      definitions = [...window.ComposerRuntime.definitions.values()],
      errors = projectResult.errors.map((issue) => `Current project: ${issue.message}`),
      validTypes = new Set(["digital", "analog", "serial"]),
      validDirections = new Set(["input", "output"]);
    definitions.forEach((definition) => {
      const properties = new Map((definition.properties || []).map((property) => [property.key, property]));
      (definition.signals || []).forEach((signal) => {
        if (!signal.key) errors.push(`${definition.name}: signal has no key`);
        if (!validTypes.has(signal.type)) errors.push(`${definition.name}.${signal.key}: invalid type ${signal.type}`);
        if (!validDirections.has(signal.direction)) errors.push(`${definition.name}.${signal.key}: invalid direction ${signal.direction}`);
        if (signal.defaultValue && !window.ComposerRuntime.resolveAddress(signal.defaultValue, signal.type, signal.direction, `SelfTest.${definition.id}`))
          errors.push(`${definition.name}.${signal.key}: address does not resolve`);
      });
      [...(definition.addressBindings || []).map((binding) => ({ ...binding, propertyKey: binding.key })),
        ...(definition.rangeBindings || []).map((binding) => ({ ...binding, propertyKey: binding.baseKey }))]
        .forEach((binding) => {
          const property = properties.get(binding.propertyKey);
          if (!property) errors.push(`${definition.name}: binding references missing property ${binding.propertyKey}`);
          else if (!String(property.defaultValue || "").trim()) errors.push(`${definition.name}.${binding.propertyKey}: binding has no default address`);
        });
    });
    if (errors.length) {
      lastHealthReport = ["EXPORT/BUILD SELF-TEST — FAILED", "", ...errors.map((error) => `- ${error}`)].join("\n");
      $("health-title").textContent = "Export/build self-test";
      $("health-summary").textContent = `${errors.length} blocking problem${errors.length === 1 ? "" : "s"} found.`;
      $("health-report").textContent = lastHealthReport;
      $("compatibility-device").hidden = true;
      $("compatibility-preview").hidden = true;
      $("compatibility-autofit").hidden = true;
      if (!$("health-dialog").open) $("health-dialog").showModal();
      setStatus("Export/build self-test failed");
      return;
    }
    const columns = 6,
      cellWidth = 330,
      cellHeight = 230,
      items = definitions.map((definition, index) => ({
        id: `self-test-${index}`,
        pageId: "self-test-page",
        name: definition.name,
        componentId: definition.id,
        x: (index % columns) * cellWidth,
        y: Math.floor(index / columns) * cellHeight,
        w: definition.defaultSize?.width || 280,
        h: definition.defaultSize?.height || 180,
        z: index + 1,
        properties: Object.fromEntries((definition.properties || []).map((property) => [property.key, property.defaultValue])),
        signalBindings: Object.fromEntries((definition.signals || []).map((signal) => [signal.key, {
          mode: /^\d+$/.test(String(signal.defaultValue || "")) ? "join" : "contract",
          value: signal.defaultValue || "",
        }])),
      })),
      catalog = {
        version: window.ComposerProjectMigrations.CURRENT_VERSION,
        width: columns * cellWidth,
        height: Math.ceil(items.length / columns) * cellHeight,
        targetDevice: "self-test",
        pages: [{ id: "self-test-page", name: "Widget Catalog", background: "#182126", bindingMode: "none" }],
        activePage: "self-test-page",
        items,
        assets: [],
        customComponents: state.customComponents,
      },
      html = window.ComposerExporter.exportProject(catalog);
    if (
      !html.includes('<script src="cr-com-lib.js">') ||
      !html.includes('id="self-test-page"') ||
      !html.includes('data-instance="self-test-0"')
    )
      throw new Error("The catalog export is missing its runtime or page markup.");
    if (!native) {
      alert("The HTML catalog passed. CH5 archive verification requires the Windows application.");
      return;
    }
    setStatus(`Testing export and CH5 build for ${definitions.length} widgets…`);
    try {
      const result = await nativeRequest("buildSelfTest", {
        html,
        device: { id: "self-test", width: catalog.width, height: catalog.height },
      });
      lastHealthReport = [
        "EXPORT/BUILD SELF-TEST — PASSED",
        `Generated: ${new Date().toLocaleString()}`,
        `Widgets exported: ${definitions.length}`,
        `Component scripts loaded: ${state.components.length}`,
        `Current project assets validated: ${state.assets.length}`,
        `Temporary CH5Z size: ${Math.ceil(result.size / 1024)} KB`,
        `Crestron CLI build time: ${result.elapsedMilliseconds} ms`,
        "",
        "The temporary archive contained a manifest, .ch5 payload, index.html, and CrComLib runtime.",
      ].join("\n");
      $("health-title").textContent = "Export/build self-test";
      $("health-summary").textContent = `PASS — ${definitions.length} widgets exported and a temporary CH5Z was validated.`;
      $("health-report").textContent = lastHealthReport;
      $("compatibility-device").hidden = true;
      $("compatibility-preview").hidden = true;
      $("compatibility-autofit").hidden = true;
      if (!$("health-dialog").open) $("health-dialog").showModal();
      setStatus("Export/build self-test passed");
    } catch (error) {
      throw error;
    }
  }
  function runPanelCompatibility() {
    const profiles = deviceProfiles.filter((device) => device.id !== "custom"),
      lines = [
        "CRESTRON UI COMPOSER — PANEL COMPATIBILITY REPORT",
        `Generated: ${new Date().toLocaleString()}`,
        `Source layout: ${selectedDevice().name} (${state.width} × ${state.height})`,
        `Pages: ${state.pages.length}   Widgets: ${state.items.length}`,
        "",
      ];
    let problemCount = 0;
    profiles.forEach((device) => {
      const key = panelLayoutKey(device.id, device.width, device.height), problems = [];
      state.items.forEach((item) => {
        const layout = layoutDefaults(item), saved = item.deviceOverrides[key],
          rect = saved || window.ComposerResponsiveLayout.adaptRect(
            item, { width: state.width, height: state.height },
            { width: device.width, height: device.height }, layout,
          ),
          margin = Math.max(0, Number(layout.safeMargin) || 0),
          page = state.pages.find((entry) => entry.id === item.pageId)?.name || "Unknown page";
        if (!window.ComposerResponsiveLayout.fitsSafeArea(
          rect, { width: device.width, height: device.height }, margin,
        )) problems.push(`${page} / ${item.name}: ${rect.x},${rect.y} ${rect.w}×${rect.h}${margin ? ` (safe margin ${margin}px)` : ""}`);
      });
      if (device.supportsCh5 === false) problems.unshift("This panel does not support CH5 projects.");
      problemCount += problems.length;
      lines.push(`${device.name} — ${device.width} × ${device.height}: ${problems.length ? `${problems.length} issue(s)` : "PASS"}`);
      problems.forEach((problem) => lines.push(`  - ${problem}`));
      lines.push("");
    });
    lastHealthReport = lines.join("\n");
    $("health-title").textContent = "Panel compatibility report";
    const profileSelect = $("compatibility-device");
    profileSelect.innerHTML = profiles.map((device) =>
      `<option value="${device.id}">${device.name} — ${device.width} × ${device.height}</option>`,
    ).join("");
    profileSelect.value = profiles.some((device) => device.id === state.targetDevice)
      ? state.targetDevice : profiles[0]?.id || "";
    profileSelect.hidden = false;
    $("compatibility-preview").hidden = false;
    $("compatibility-autofit").hidden = false;
    $("health-summary").textContent = problemCount
      ? `${problemCount} layout issue(s) across ${profiles.length} panel profiles.`
      : `All ${profiles.length} panel profiles fit.`;
    $("health-report").textContent = lastHealthReport;
    $("health-dialog").showModal();
    setStatus(problemCount ? `${problemCount} panel fit issues found` : "All panel profiles fit");
  }
  async function createProjectBackup(reason = "manual") {
    if (!native) throw new Error("Project backups are available in the Windows application.");
    return nativeRequest("createProjectBackup", {
      contents: JSON.stringify(project(), null, 2),
      name: state.contract.name || "CrestronUiProject",
      reason,
    });
  }
  async function renderProjectBackups() {
    const host = $("backup-list");
    host.innerHTML = '<p class="hint" style="padding:14px">Loading backups…</p>';
    try {
      const backups = await nativeRequest("listProjectBackups");
      host.innerHTML = "";
      backups.forEach((backup) => {
        const row = document.createElement("div"),
          info = document.createElement("div"),
          meta = document.createElement("span"),
          restore = document.createElement("button"),
          remove = document.createElement("button");
        row.className = "backup-entry";
        info.className = "backup-entry-name";
        info.textContent = backup.name;
        info.title = backup.path;
        meta.className = "backup-entry-meta";
        meta.textContent = `${new Date(backup.modifiedUtc).toLocaleString()} · ${Math.ceil(backup.size / 1024)} KB`;
        restore.type = remove.type = "button";
        restore.textContent = "Restore";
        remove.textContent = "Delete";
        remove.className = "danger";
        restore.onclick = async () => {
          if (!confirm(`Restore “${backup.name}”? The current project will be backed up first.`)) return;
          try {
            await createProjectBackup("before-restore");
            const result = await nativeRequest("readProjectBackup", { path: backup.path });
            await loadProjectText(result.contents, false, result.path);
            projectDirty = true;
            setAutosaveState("Restored · unsaved", "dirty");
            $("backup-dialog").close();
            setStatus(`Restored backup ${backup.name}`);
          } catch (error) {
            alert(`The backup could not be restored.\n\n${error.message}`);
          }
        };
        remove.onclick = async () => {
          if (!confirm(`Permanently delete backup “${backup.name}”?`)) return;
          try {
            await nativeRequest("deleteProjectBackup", { path: backup.path });
            await renderProjectBackups();
          } catch (error) {
            alert(`The backup could not be deleted.\n\n${error.message}`);
          }
        };
        row.append(info, meta, restore, remove);
        host.appendChild(row);
      });
      if (!backups.length) host.innerHTML = '<p class="hint" style="padding:14px">No project backups have been created yet.</p>';
    } catch (error) {
      host.innerHTML = `<p class="hint" style="padding:14px"></p>`;
      host.firstElementChild.textContent = error.message;
    }
  }
  const storageLabels = {
    projects: "Projects",
    packages: "Portable packages",
    exports: "Exports / CH5Z",
    backups: "Backups",
    assets: "Asset library",
    templates: "Components / templates",
  };
  async function renderStorageSettings() {
    const host = $("storage-location-list"), settings = await nativeRequest("getStorageSettings");
    host.innerHTML = "";
    Object.entries(storageLabels).forEach(([key, label]) => {
      const row = document.createElement("div"), name = document.createElement("strong"),
        path = document.createElement("div"), choose = document.createElement("button"), open = document.createElement("button");
      row.className = "storage-location-row";
      name.textContent = label;
      path.className = "storage-location-path";
      path.textContent = settings[key];
      path.title = settings[key];
      choose.type = open.type = "button";
      choose.textContent = "Choose…";
      open.textContent = "Open";
      choose.onclick = async () => {
        try {
          await nativeRequest("selectStorageFolder", { key });
          await renderStorageSettings();
        } catch (error) { if (error.message !== "cancelled") alert(error.message); }
      };
      open.onclick = () => nativeRequest("openStorageFolder", { key }).catch((error) => alert(error.message));
      row.append(name, path, choose, open);
      host.appendChild(row);
    });
  }
  async function checkForUpdates() {
    const dialog = $("update-dialog"), downloadButton = $("update-download");
    $("update-summary").textContent = "Checking the public GitHub repository…";
    $("update-current-version").textContent = "—";
    $("update-latest-version").textContent = "—";
    $("update-notes").textContent = "";
    downloadButton.hidden = true;
    if (!dialog.open) dialog.showModal();
    if (!native) {
      $("update-summary").textContent = "Update checking is available in the Windows application.";
      return;
    }
    try {
      const result = await nativeRequest("checkForUpdates");
      $("update-current-version").textContent = result.currentVersion;
      $("update-latest-version").textContent = result.latestVersion || "No published release";
      $("update-notes").textContent = result.releaseNotes || "No GitHub release has been published yet.";
      $("update-summary").textContent = result.updateAvailable
        ? `Version ${result.latestVersion} is available.`
        : result.latestVersion ? "You have the latest published version." : "No published releases were found.";
      if (result.downloadUrl || result.releaseUrl) {
        downloadButton.hidden = !result.updateAvailable;
        downloadButton.onclick = () => nativeRequest("openExternalUrl", result.downloadUrl || result.releaseUrl)
          .catch((error) => alert(error.message));
      }
    } catch (error) {
      $("update-summary").textContent = "The update check failed.";
      $("update-notes").textContent = error.message;
    }
  }
  function selectedCompatibilityDevice() {
    return deviceProfiles.find((device) => device.id === $("compatibility-device").value);
  }
  function previewCompatibilityDevice() {
    const device = selectedCompatibilityDevice();
    if (!device) return;
    $("target-device").value = device.id;
    applyDevice(device.id);
    $("health-dialog").close();
    commitHistory();
  }
  function autoFitCompatibilityPage() {
    const device = selectedCompatibilityDevice();
    if (!device) return;
    if (state.targetDevice !== device.id) {
      $("target-device").value = device.id;
      applyDevice(device.id);
    }
    const key = panelLayoutKey(device.id, device.width, device.height),
      items = state.items.filter((item) => item.master || item.pageId === state.activePage);
    let changed = 0;
    items.forEach((item) => {
      const margin = Math.max(0, Number(layoutDefaults(item).safeMargin) || 0),
        availableWidth = Math.max(20, state.width - margin * 2),
        availableHeight = Math.max(20, state.height - margin * 2),
        before = `${item.x},${item.y},${item.w},${item.h}`;
      item.w = Math.min(item.w, availableWidth);
      item.h = Math.min(item.h, availableHeight);
      item.x = Math.max(margin, Math.min(item.x, state.width - margin - item.w));
      item.y = Math.max(margin, Math.min(item.y, state.height - margin - item.h));
      item.deviceOverrides[key] = {
        x: item.x, y: item.y, w: item.w, h: item.h,
        panelWidth: state.width, panelHeight: state.height,
      };
      if (before !== `${item.x},${item.y},${item.w},${item.h}`) changed++;
    });
    renderPage();
    commitHistory();
    runPanelCompatibility();
    setStatus(`Auto-fit ${changed} widget${changed === 1 ? "" : "s"} on ${currentPage().name} for ${device.name}`);
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
      version: window.ComposerProjectMigrations.CURRENT_VERSION,
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
      customComponents: state.customComponents,
      contract: state.contract,
    };
  }
  function exportHtml() {
    return window.ComposerExporter.exportProject(project());
  }
  function projectForDevice(device) {
    const output = structuredClone(project()),
      key = panelLayoutKey(device.id, device.width, device.height),
      currentKey = panelLayoutKey();
    output.width = device.width;
    output.height = device.height;
    output.targetDevice = device.id;
    output.targetDeviceProfile = { ...device };
    output.items = state.items.map((item) => {
      const copy = structuredClone(item),
        saved = key === currentKey ? item : item.deviceOverrides?.[key],
        rect = saved || window.ComposerResponsiveLayout.adaptRect(
          item, { width: state.width, height: state.height },
          { width: device.width, height: device.height }, layoutDefaults(item),
        );
      Object.assign(copy, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      return copy;
    });
    return output;
  }
  function renderBuildPanelList() {
    const host = $("build-panel-list");
    host.innerHTML = "";
    deviceProfiles.filter((device) => device.id !== "custom").forEach((device) => {
      const label = document.createElement("label"), input = document.createElement("input"),
        name = document.createElement("span"), size = document.createElement("small");
      label.className = "build-panel-option";
      input.type = "checkbox";
      input.value = device.id;
      input.checked = device.id === state.targetDevice;
      input.disabled = device.supportsCh5 === false;
      name.textContent = device.name;
      size.textContent = `${device.width}×${device.height}`;
      label.append(input, name, size);
      host.appendChild(label);
    });
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
      startX = (e.clientX - rect.left) / panelZoom,
      startY = (e.clientY - rect.top) / panelZoom,
      prior = e.shiftKey ? (state.selectedIds || []).slice() : [],
      marquee = document.createElement("div");
    marquee.className = "selection-marquee";
    marquee.style.left = `${startX}px`;
    marquee.style.top = `${startY}px`;
    stage.appendChild(marquee);
    if (!e.shiftKey) select(null);
    function move(event) {
      const x = (event.clientX - rect.left) / panelZoom,
        y = (event.clientY - rect.top) / panelZoom,
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
      createAssetItem(
        assetId,
        (e.clientX - r.left) / panelZoom,
        (e.clientY - r.top) / panelZoom,
      );
      return;
    }
    createItem(
      e.dataTransfer.getData("text/component"),
      (e.clientX - r.left) / panelZoom,
      (e.clientY - r.top) / panelZoom,
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
  $("asset-library-import").onclick = async () => {
    if (!native) return $("asset-files").click();
    try {
      const files = await nativeRequest("importAssets");
      state.assets.push(...files.map((file) => ({ ...file, id: uid("asset-") })));
      renderAssets();
      commitHistory();
      setStatus(`Imported ${files.length} asset${files.length === 1 ? "" : "s"} from the asset library`);
    } catch (error) { if (error.message !== "cancelled") setStatus(error.message); }
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
      .filter(
        (item) =>
          item.assetId === asset.id ||
          item.backgroundAsset === asset.id ||
          item.graphicAsset === asset.id ||
          item.selectedGraphicAsset === asset.id,
      )
      .forEach((item) => {
        if (item.assetId === asset.id) {
          item.name = asset.name;
          item.source = assetSource(asset);
        }
        renderItem(item);
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
      [
        item.assetId,
        item.backgroundAsset,
        item.graphicAsset,
        item.selectedGraphicAsset,
      ]
        .filter(Boolean)
        .forEach((id) => {
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
        if (k === "name") rebaseItemContractNames(i);
        renderItem(i);
        if (k === "name") renderBindings(i);
        if (k === "name" || k === "z") renderLayers();
        if (["x", "y", "w", "h"].includes(k)) {
          const key = panelLayoutKey();
          layoutDefaults(i);
          i.deviceOverrides[key] = { x: i.x, y: i.y, w: i.w, h: i.h, panelWidth: state.width, panelHeight: state.height };
          renderResponsiveEditor(i);
        }
      }),
  );
  function updateSelectedGraphic() {
    const item = current();
    if (!item) return;
    item.graphicAsset = $("prop-asset").value;
    item.selectedGraphicAsset = $("prop-asset-selected").value;
    item.graphicAssetMode = item.graphicAsset || item.selectedGraphicAsset
      ? $("prop-asset-mode").value
      : "none";
    item.graphicAssetPlacement = $("prop-asset-placement").value;
    item.graphicAssetFit = $("prop-asset-fit").value;
    item.graphicAssetWidth = Math.max(
      1,
      Math.min(200, Number($("prop-asset-width").value) || 35),
    );
    item.graphicAssetHeight = Math.max(
      1,
      Math.min(200, Number($("prop-asset-height").value) || 35),
    );
    item.graphicAspectLocked = $("prop-asset-aspect-lock").checked;
    item.graphicAssetX = Math.max(
      0,
      Math.min(100, Number($("prop-asset-x").value) || 0),
    );
    item.graphicAssetY = Math.max(
      0,
      Math.min(100, Number($("prop-asset-y").value) || 0),
    );
    item.graphicAssetOpacity = Math.max(
      0,
      Math.min(100, Number($("prop-asset-opacity").value) || 0),
    );
    renderItem(item);
    renderAssetInspector(item);
    scheduleHistory();
  }
  $("prop-asset").onchange = () => {
    if ($("prop-asset").value && $("prop-asset-mode").value === "none")
      $("prop-asset-mode").value = "overlay";
    updateSelectedGraphic();
  };
  $("prop-asset-selected").onchange = () => {
    if ($("prop-asset-selected").value && $("prop-asset-mode").value === "none")
      $("prop-asset-mode").value = "overlay";
    updateSelectedGraphic();
  };
  [
    "prop-asset-mode",
    "prop-asset-placement",
    "prop-asset-fit",
    "prop-asset-width",
    "prop-asset-height",
    "prop-asset-aspect-lock",
    "prop-asset-x",
    "prop-asset-y",
    "prop-asset-opacity",
  ].forEach((id) => ($(id).oninput = updateSelectedGraphic));
  $("prop-asset-clear").onclick = () => {
    const item = current();
    if (!item) return;
    delete item.graphicAsset;
    delete item.selectedGraphicAsset;
    delete item.graphicAssetMode;
    delete item.graphicAssetPlacement;
    delete item.graphicAssetFit;
    delete item.graphicAssetWidth;
    delete item.graphicAssetHeight;
    delete item.graphicAspectLocked;
    delete item.graphicAssetX;
    delete item.graphicAssetY;
    delete item.graphicAssetOpacity;
    renderItem(item);
    renderAssetInspector(item);
    commitHistory();
    setStatus(`Cleared the graphic from “${item.name}”`);
  };
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
  function alignSelected(mode) {
    const items = selectedItems(),
      item = current();
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
  }
  function changeSelectedLayer(mode) {
    const item = current(),
      selection = selectedItems();
    if (!item || !mode || selection.length !== 1) return;
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
  }
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
    $("context-simulate").disabled = selection.length !== 1;
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
    const contextAlign = $("context-align"), contextLayer = $("context-layer");
    contextAlign.value = "";
    contextLayer.value = "";
    contextAlign.disabled = !selection.length || selection.some((entry) => entry.locked);
    [...contextAlign.options].forEach((option) => {
      if (option.value.startsWith("distribute")) option.disabled = selection.length < 3;
    });
    contextLayer.disabled = selection.length !== 1 || selection.some((entry) => entry.locked);
    $("context-save-reusable").disabled = !selection.length;
    $("context-update-reusable").disabled =
      !selection.length || !selection[0]?.reusableId;
    $("context-detach-reusable").disabled =
      !selection.length || !selection[0]?.linkedInstanceId;
    $("context-reusable-master").disabled =
      !selection.length || !selection[0]?.linkedInstanceId || isReusableMaster(selection[0]);
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
  $("context-simulate").onclick = () => {
    const item = current();
    hideContextMenu();
    if (item) openSignalSimulator(item.id);
  };
  $("context-align").onchange = (event) => {
    const mode = event.target.value;
    if (mode) alignSelected(mode);
    event.target.value = "";
    hideContextMenu();
  };
  $("context-layer").onchange = (event) => {
    const mode = event.target.value;
    if (mode) changeSelectedLayer(mode);
    event.target.value = "";
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
  $("context-reusable-master").onclick = () => {
    makeReusableMaster(current());
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
    const item = current();
    if (item) {
      const definition = item.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null;
      sourceEditingComponent = !!definition;
      $("source-editor").value = definition
        ? `<style>${item.componentStyles || definition.styles || ""}</style>\n${item.componentTemplate || definition.template || ""}`
        : item.source;
      $("source-dialog").showModal();
    }
  };
  function splitCustomSource(source) {
    const documentValue = new DOMParser().parseFromString(
        String(source || ""),
        "text/html",
      ),
      css = [...documentValue.querySelectorAll("style")]
        .map((element) => element.textContent)
        .join("\n"),
      javascript = [...documentValue.querySelectorAll("script")]
        .map((element) => element.textContent)
        .join("\n");
    documentValue
      .querySelectorAll("style,script")
      .forEach((element) => element.remove());
    return { html: documentValue.body.innerHTML, css, javascript };
  }
  function composeCustomSource(runtime = false) {
    const html = $("custom-source-html").value,
      css = $("custom-source-css").value,
      javascript = $("custom-source-javascript").value;
    return `${css ? `<style>${css}</style>` : ""}${html}${javascript ? runtime ? customJavascriptRuntime(javascript) : `<script>${javascript}<\/script>` : ""}`;
  }
  function prepareCustomSource(source) {
    if (String(source || "").includes("window.ComposerSignals=signals")) return source;
    const parts = splitCustomSource(source);
    return `${parts.css ? `<style>${parts.css}</style>` : ""}${parts.html}${parts.javascript ? customJavascriptRuntime(parts.javascript) : ""}`;
  }
  function customJavascriptRuntime(javascript) {
    return `<script>(function(){
var callbacks={};
var signals={
  publish:function(key,value){parent.postMessage({type:'composer-custom-publish',key:key,value:value},'*')},
  subscribe:function(key,callback){
    (callbacks[key]||(callbacks[key]=[])).push(callback);
    return function(){callbacks[key]=(callbacks[key]||[]).filter(function(entry){return entry!==callback})};
  }
};
window.ComposerSignals=signals;
window.ComposerComponent={publish:signals.publish};
window.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='composer-signal')return;
  (callbacks[event.data.key]||[]).slice().forEach(function(callback){callback(event.data.value)});
});
var cleanup=(new Function('root','signals',${JSON.stringify(String(javascript || ""))}))(document,signals);
if(typeof cleanup==='function')window.addEventListener('unload',cleanup,{once:true});
})();<\/script>`;
  }
  function addCustomPropertyRow(property = {}) {
    const row = document.createElement("div");
    row.className = "custom-property-row";
    row.innerHTML =
      '<input data-field="key" placeholder="key"><input data-field="name" placeholder="Label"><select data-field="type"><option>text</option><option>number</option><option>color</option><option>select</option></select><input data-field="defaultValue" placeholder="Default"><button type="button" class="custom-row-delete">×</button>';
    row.querySelector('[data-field="key"]').value = property.key || "";
    row.querySelector('[data-field="name"]').value = property.name || "";
    row.querySelector('[data-field="type"]').value = property.type || "text";
    row.querySelector('[data-field="defaultValue"]').value =
      property.type === "select"
        ? (property.options || []).map((option) => option.value).join(",")
        : (property.defaultValue ?? "");
    row.querySelector("button").onclick = () => {
      row.remove();
      refreshCustomPreview();
    };
    row
      .querySelectorAll("input,select")
      .forEach((input) => (input.oninput = refreshCustomPreview));
    $("custom-property-list").appendChild(row);
  }
  function addCustomSignalRow(signal = {}) {
    const row = document.createElement("div");
    row.className = "custom-signal-row";
    row.innerHTML =
      '<input data-field="key" placeholder="key"><input data-field="name" placeholder="Label"><select data-field="type"><option>digital</option><option>analog</option><option>serial</option></select><select data-field="direction"><option>output</option><option>input</option></select><input data-field="defaultValue" placeholder="Join / contract"><button type="button" class="custom-row-delete">×</button>';
    ["key", "name", "type", "direction", "defaultValue"].forEach((key) => {
      row.querySelector(`[data-field="${key}"]`).value = signal[key] || "";
    });
    row.querySelector("button").onclick = () => {
      row.remove();
      refreshCustomPreview();
    };
    row
      .querySelectorAll("input,select")
      .forEach((input) => (input.oninput = refreshCustomPreview));
    $("custom-signal-list").appendChild(row);
  }
  function collectCustomProperties() {
    return [...$("custom-property-list").children]
      .map((row) => {
        const value = (key) => row.querySelector(`[data-field="${key}"]`).value,
          key = value("key").replace(/[^A-Za-z0-9_$]/g, "_"),
          type = value("type"),
          rawDefault = value("defaultValue");
        if (!key) return null;
        return {
          key,
          name: value("name") || key,
          type,
          defaultValue:
            type === "number"
              ? Number(rawDefault) || 0
              : type === "select"
                ? rawDefault.split(",")[0] || ""
                : rawDefault,
          ...(type === "select"
            ? {
                options: rawDefault
                  .split(",")
                  .map((option) => option.trim())
                  .filter(Boolean)
                  .map((option) => ({ value: option, label: option })),
              }
            : {}),
        };
      })
      .filter(Boolean);
  }
  function collectCustomSignals() {
    return [...$("custom-signal-list").children]
      .map((row) => {
        const value = (key) => row.querySelector(`[data-field="${key}"]`).value,
          key = value("key").replace(/[^A-Za-z0-9_$]/g, "_");
        return key
          ? {
              key,
              name: value("name") || key,
              type: value("type"),
              direction: value("direction"),
              defaultValue: value("defaultValue").trim(),
            }
          : null;
      })
      .filter(Boolean);
  }
  function validateCustomComponent() {
    const name = $("custom-component-name").value.trim(),
      version = $("custom-component-version").value.trim(),
      html = $("custom-source-html").value,
      javascript = $("custom-source-javascript").value,
      properties = collectCustomProperties(),
      signals = collectCustomSignals(),
      errors = [],
      warnings = [],
      duplicateKeys = (values) => [
        ...new Set(
          values.filter((value, index) => values.indexOf(value) !== index),
        ),
      ];
    if (!name) errors.push("Component name is required.");
    if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version))
      errors.push("Version must use semantic versioning, such as 1.0.0.");
    if (!html.trim()) errors.push("HTML cannot be empty.");
    duplicateKeys(properties.map((entry) => entry.key)).forEach((key) =>
      errors.push(`Duplicate property key: ${key}.`),
    );
    duplicateKeys(signals.map((entry) => entry.key)).forEach((key) =>
      errors.push(`Duplicate signal key: ${key}.`),
    );
    const knownProperties = new Set(properties.map((entry) => entry.key));
    [...html.matchAll(/\{\{([^}]+)\}\}/g)].forEach((match) => {
      if (!knownProperties.has(match[1]))
        errors.push(`HTML uses undefined property token {{${match[1]}}}.`);
    });
    const runtimeProperties = new Set(["bindingMode", "visibilityEnabled"]);
    properties.forEach((property) => {
      if (!runtimeProperties.has(property.key) && !html.includes(`{{${property.key}}}`))
        warnings.push(`Property “${property.key}” is not used in the HTML.`);
    });
    try {
      new Function("root", "signals", javascript);
    } catch (error) {
      errors.push(`JavaScript syntax: ${error.message}`);
    }
    const result = {
        errors: [...new Set(errors)],
        warnings: [...new Set(warnings)],
      },
      panel = $("custom-validation");
    panel.classList.toggle("invalid", !!result.errors.length);
    panel.innerHTML = result.errors.length
      ? `<strong>${result.errors.length} error(s)</strong><br>${result.errors.map((value) => `• ${value}`).join("<br>")}`
      : result.warnings.length
        ? `<strong>Valid with ${result.warnings.length} warning(s)</strong><br>${result.warnings.map((value) => `• ${value}`).join("<br>")}`
        : "Component validation passed.";
    return result;
  }
  function refreshCustomSignalTester() {
    const selected = $("custom-preview-signal").value,
      signals = collectCustomSignals().filter(
        (signal) => signal.direction === "input",
      );
    $("custom-preview-signal").innerHTML = signals.length
      ? signals
          .map(
            (signal) =>
              `<option value="${signal.key}">${signal.name} (${signal.type})</option>`,
          )
          .join("")
      : '<option value="">No input signals</option>';
    if (signals.some((signal) => signal.key === selected))
      $("custom-preview-signal").value = selected;
    $("custom-preview-send").disabled = !signals.length;
  }
  function refreshCustomPreview() {
    let source = composeCustomSource(true);
    collectCustomProperties().forEach((property) => {
      source = source.replaceAll(
        `{{${property.key}}}`,
        String(property.defaultValue ?? ""),
      );
    });
    const previewBridge = `<script>window.ComposerComponent={publish:function(key,value){parent.postMessage({type:'composer-custom-publish',key:key,value:value},'*')}};window.addEventListener('error',function(e){parent.postMessage({type:'composer-preview-error',message:e.message},'*')});<\/script>`;
    $("custom-component-preview").srcdoc = safeDoc(
      '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;box-sizing:border-box}body{padding:10px}body>*{box-sizing:border-box}</style>' +
        previewBridge +
        source,
      "",
    );
    refreshCustomSignalTester();
    validateCustomComponent();
  }
  function openCustomBuilder(item = null, entry = null) {
    customEditingId = entry?.id || "";
    customBuilderSourceItemId = item?.id || "";
    const definition = item?.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null,
      initialSource = entry?.html
        ? entry.html
        : definition
          ? `<style>${item.componentStyles || definition.styles || ""}</style>${item.componentTemplate || definition.template || ""}`
          : item?.source || `<div class="custom-component">Custom component</div>
<style>
.custom-component {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: 1px solid #04dcb9;
  border-radius: 8px;
  background: #253436;
  color: #ffffff;
  font: 18px "Segoe UI", sans-serif;
}
</style>`,
      source = splitCustomSource(initialSource),
      properties = entry?.properties || [],
      signals = entry?.signals || [];
    $("custom-component-title").textContent = entry
      ? "Edit palette component"
      : "Create palette component";
    $("custom-component-save").textContent = entry
      ? "Update component"
      : "Create component";
    $("custom-component-export").hidden = !entry;
    $("custom-component-delete").hidden = !entry;
    $("custom-component-name").value =
      entry?.name || item?.name || "Custom component";
    $("custom-component-category").value = entry?.category || "Custom";
    $("custom-component-icon").value = entry?.icon || "🧩";
    $("custom-component-version").value = entry?.version || "1.0.0";
    $("custom-component-author").value = entry?.author || "";
    $("custom-component-description").value = entry?.description || "";
    $("custom-source-html").value = source.html;
    $("custom-source-css").value = source.css;
    $("custom-source-javascript").value = source.javascript;
    $("custom-property-list").innerHTML = "";
    $("custom-signal-list").innerHTML = "";
    $("custom-preview-log").textContent =
      "Preview signal activity appears here.";
    properties.forEach(addCustomPropertyRow);
    signals.forEach(addCustomSignalRow);
    refreshCustomPreview();
    $("custom-component-dialog").showModal();
  }
  $("create-custom-component").onclick = () => {
    const item = current();
    if (!item) return;
    const entry = state.customComponents.find(
      (candidate) => candidate.id === item.componentId,
    );
    openCustomBuilder(item, entry || null);
  };
  $("new-custom-component").onclick = () => openCustomBuilder();
  $("custom-property-add").onclick = () => addCustomPropertyRow();
  $("custom-signal-add").onclick = () => addCustomSignalRow();
  $("custom-preview-refresh").onclick = refreshCustomPreview;
  $("custom-preview-send").onclick = () => {
    const key = $("custom-preview-signal").value,
      raw = $("custom-preview-value").value,
      signal = collectCustomSignals().find((entry) => entry.key === key);
    if (!signal) return;
    const value =
      signal.type === "digital"
        ? /^(true|1|on)$/i.test(raw)
        : signal.type === "analog"
          ? Number(raw) || 0
          : raw;
    $("custom-component-preview").contentWindow?.postMessage(
      { type: "composer-signal", key, value },
      "*",
    );
    $("custom-preview-log").textContent +=
      `\nFeedback ${key} = ${JSON.stringify(value)}`;
  };
  window.addEventListener("message", (event) => {
    if (event.source !== $("custom-component-preview").contentWindow) return;
    if (event.data?.type === "composer-custom-publish")
      $("custom-preview-log").textContent +=
        `\nPublish ${event.data.key} = ${JSON.stringify(event.data.value)}`;
    if (event.data?.type === "composer-preview-error")
      $("custom-preview-log").textContent += `\nERROR: ${event.data.message}`;
    $("custom-preview-log").scrollTop = $("custom-preview-log").scrollHeight;
  });
  $("custom-component-export").onclick = () => {
    const entry = state.customComponents.find(
      (candidate) => candidate.id === customEditingId,
    );
    if (!entry) return;
    const packageValue = {
      format: "crestron-ui-composer-component",
      version: 2,
      exportedAt: new Date().toISOString(),
      component: structuredClone(entry),
    };
    download(
      `${entry.name.replace(/[^A-Za-z0-9_-]+/g, "-") || "component"}.cuicomponent`,
      JSON.stringify(packageValue, null, 2),
      "application/json",
    );
    setStatus(`Exported component package “${entry.name}”`);
  };
  $("custom-component-delete").onclick = () => {
    const entry = state.customComponents.find(
      (candidate) => candidate.id === customEditingId,
    );
    if (!entry) return;
    const instances = state.items.filter(
      (item) => item.componentId === entry.id,
    );
    if (
      !confirm(
        `Delete “${entry.name}” from the palette${instances.length ? ` and remove its ${instances.length} canvas instance${instances.length === 1 ? "" : "s"}` : ""}?`,
      )
    )
      return;
    state.customComponents = state.customComponents.filter(
      (candidate) => candidate.id !== entry.id,
    );
    state.components = state.components.filter(
      (component) => component.componentId !== entry.id,
    );
    state.items = state.items.filter((item) => item.componentId !== entry.id);
    $("custom-component-dialog").close();
    customEditingId = "";
    renderComponentLibrary();
    renderPage();
    commitHistory();
    setStatus(`Deleted custom component “${entry.name}”`);
  };
  [
    "custom-source-html",
    "custom-source-css",
    "custom-source-javascript",
  ].forEach((id) => ($(id).oninput = refreshCustomPreview));
  [
    "custom-component-name",
    "custom-component-category",
    "custom-component-version",
    "custom-component-author",
    "custom-component-description",
  ].forEach((id) => ($(id).oninput = validateCustomComponent));
  document.querySelectorAll("[data-custom-tab]").forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll("[data-custom-tab]")
        .forEach((entry) => entry.classList.toggle("active", entry === button));
      ["html", "css", "javascript"].forEach(
        (name) =>
          ($("custom-source-" + name).hidden =
            button.dataset.customTab !== name),
      );
    };
  });
  $("custom-component-save").onclick = () => {
    const item = state.items.find((candidate) => candidate.id === customBuilderSourceItemId) || null,
      name = $("custom-component-name").value.trim();
    if (!name) return;
    const validation = validateCustomComponent();
    if (validation.errors.length) {
      alert("Fix the custom component validation errors before saving.");
      return;
    }
    let entry = state.customComponents.find(
      (candidate) => candidate.id === customEditingId,
    );
    if (!entry) {
      const id = `custom-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${uid().slice(-6)}`;
      entry = { id };
      state.customComponents.push(entry);
    }
    Object.assign(entry, {
      name,
      category: $("custom-component-category").value.trim() || "Custom",
      icon: $("custom-component-icon").value || "🧩",
      version: $("custom-component-version").value.trim() || "1.0.0",
      author: $("custom-component-author").value.trim(),
      description: $("custom-component-description").value.trim(),
      html: composeCustomSource(),
      defaultSize: entry.defaultSize || {
        width: item?.w || 240,
        height: item?.h || 140,
      },
      properties: collectCustomProperties(),
      signals: collectCustomSignals(),
    });
    const libraryEntry = state.components.find(
      (component) => component.componentId === entry.id,
    );
    if (libraryEntry) {
      libraryEntry.displayName = entry.name;
      libraryEntry.category = entry.category;
      libraryEntry.icon = entry.icon;
    }
    registerCustomComponent(entry);
    state.items
      .filter((candidate) => candidate.componentId === entry.id)
      .forEach(renderItem);
    renderComponentLibrary();
    commitHistory();
    setStatus(
      `${customEditingId ? "Updated" : "Created"} palette component “${name}”`,
    );
  };
  $("custom-package-file").onchange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const packageValue = JSON.parse(await file.text()),
        imported = packageValue.component;
      if (
        packageValue.format !== "crestron-ui-composer-component" ||
        ![1, 2].includes(packageValue.version) ||
        !imported?.id ||
        !imported?.name ||
        typeof imported.html !== "string" ||
        !Array.isArray(imported.properties) ||
        !Array.isArray(imported.signals)
      )
        throw new Error(
          "This is not a valid Crestron UI Composer component package.",
        );
      const existingIndex = state.customComponents.findIndex(
        (entry) => entry.id === imported.id,
      );
      if (
        existingIndex >= 0 &&
        !confirm(
          `Replace the existing “${state.customComponents[existingIndex].name}” component?`,
        )
      )
        return;
      const entry = structuredClone(imported);
      if (existingIndex >= 0) state.customComponents[existingIndex] = entry;
      else state.customComponents.push(entry);
      const libraryEntry = state.components.find(
        (component) => component.componentId === entry.id,
      );
      if (libraryEntry) {
        libraryEntry.displayName = entry.name;
        libraryEntry.category = entry.category || "Custom";
        libraryEntry.icon = entry.icon || "🧩";
      }
      registerCustomComponent(entry);
      state.items
        .filter((item) => item.componentId === entry.id)
        .forEach(renderItem);
      renderComponentLibrary();
      commitHistory();
      setStatus(`Imported component package “${entry.name}”`);
    } catch (error) {
      alert(`Component package import failed.\n\n${error.message}`);
    }
  };
  $("apply-source").onclick = () => {
    if (current()) {
      if (sourceEditingComponent) {
        const source = splitCustomSource($("source-editor").value);
        current().componentTemplate = source.html;
        current().componentStyles = source.css;
      } else current().source = $("source-editor").value;
      renderItem(current());
      scheduleHistory();
    }
  };
  $("add-page").onclick = addPage;
  $("save-reusable").onclick = saveReusableSelection;
  $("save-page-template").onclick = savePageTemplate;
  $("theme-selection").onclick = () => applyTheme("selection");
  $("theme-component-type").onclick = () => applyTheme("component-type");
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
  [
    "page", "surface", "accent", "text", "glow", "border", "font-size",
    "corner-radius", "glow-strength", "animation-duration", "animation-easing",
  ].forEach((key) => {
    const checkbox = $("theme-" + key + "-enabled"), control = $("theme-" + key);
    const sync = () => {
      control.disabled = !checkbox.checked;
      control.closest("label")?.classList.toggle("theme-token-disabled", !checkbox.checked);
    };
    checkbox.onchange = sync;
    sync();
  });
  $("page-name").oninput = (e) => {
    currentPage().name = e.target.value;
    renderPages();
  };
  $("page-background").oninput = (e) => {
    currentPage().background = e.target.value;
    stage.style.backgroundColor = e.target.value;
  };
  function updatePageBackgroundAsset() {
    const page = currentPage();
    page.backgroundAsset = $("page-background-asset").value;
    page.backgroundAssetFit = $("page-background-fit").value;
    page.backgroundAssetX = Math.max(
      0,
      Math.min(100, Number($("page-background-x").value) || 0),
    );
    page.backgroundAssetY = Math.max(
      0,
      Math.min(100, Number($("page-background-y").value) || 0),
    );
    renderPage();
    scheduleHistory();
  }
  $("page-background-asset").onchange = updatePageBackgroundAsset;
  $("page-background-fit").onchange = updatePageBackgroundAsset;
  $("page-background-x").oninput = updatePageBackgroundAsset;
  $("page-background-y").oninput = updatePageBackgroundAsset;
  $("page-background-clear").onclick = () => {
    const page = currentPage();
    delete page.backgroundAsset;
    delete page.backgroundAssetFit;
    delete page.backgroundAssetX;
    delete page.backgroundAssetY;
    renderPage();
    commitHistory();
    setStatus(`Cleared the background image from “${page.name}”`);
  };
  $("page-binding-mode").onchange = (e) => {
    currentPage().bindingMode = e.target.value;
    syncPageBinding();
  };
  $("page-binding").oninput = (e) =>
    (currentPage().binding = e.target.value.trim());
  $("page-transition").onchange = (e) => {
    currentPage().transition = e.target.value;
    playPageTransition();
    scheduleHistory();
  };
  $("page-transition-duration").oninput = (e) => {
    currentPage().transitionDuration = Math.max(
      50,
      Number(e.target.value) || 350,
    );
    scheduleHistory();
  };
  function resize(w, h) {
    state.width = w;
    state.height = h;
    stage.style.width = w + "px";
    stage.style.height = h + "px";
  }
  $("target-device").onchange = (e) => applyDevice(e.target.value);
  ["width", "height"].forEach(
    (k) =>
      ($("panel-" + k).oninput = (e) => {
        const width = k === "width" ? +e.target.value : state.width,
          height = k === "height" ? +e.target.value : state.height;
        savePanelLayouts(state.targetDevice, state.width, state.height);
        applyResponsiveSize(width, height, panelLayoutKey(state.targetDevice, width, height));
      }),
  );
  async function loadProjectText(text, markClean = true, sourcePath = "") {
    const parsed = JSON.parse(text),
      migration = window.ComposerProjectMigrations.migrate(parsed),
      p = migration.project;
    if (migration.migrated) {
      let backupName = "";
      if (native && sourcePath) {
        try {
          backupName = await nativeRequest("backupProject", { path: sourcePath });
        } catch (error) {
          throw new Error(`The project needs migration, but its backup could not be created: ${error.message}`);
        }
      } else {
        const baseName = sourcePath ? sourcePath.split(/[\\/]/).pop() : "crestron-ui-project.cuiproj";
        backupName = baseName.replace(/(\.[^.]+)?$/, `.pre-migration-v${migration.fromVersion}$1`);
        download(backupName, text, "application/json");
      }
      setStatus(`Migrated project v${migration.fromVersion} → v${migration.toVersion}; backup: ${backupName}`);
    }
    state.items = normalizeItemStates(p.items);
    state.assets = p.assets || [];
    state.reusables = p.reusables || [];
    state.pageTemplates = p.pageTemplates || [];
    state.themes = p.themes || [];
    state.customComponents = p.customComponents || [];
    state.customComponents.forEach(registerCustomComponent);
    state.contract = { ...state.contract, ...(p.contract || {}) };
    state.pages = p.pages || [
      { ...firstPage, background: p.background || firstPage.background },
    ];
    state.activePage = p.activePage || state.pages[0].id;
    state.targetDevice =
      p.targetDevice ||
      (p.width === 1280 && p.height === 800 ? "tsw-1070" : "custom");
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
    history.length = 0;
    historyIndex = -1;
    commitHistory(false);
    if (markClean) markProjectSaved();
    if (!migration.migrated) setStatus("Project opened for " + selectedDevice().name);
  }
  $("save-project").onclick = async () => {
    const text = JSON.stringify(project(), null, 2);
    if (native) {
      try {
        const path = await nativeRequest("saveProject", text);
        await createProjectBackup("manual-save");
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
  $("save-project-package").onclick = async () => {
    if (!native) {
      alert("Portable project packages are available in the Windows application.");
      return;
    }
    try {
      const result = await nativeRequest("saveProjectPackage", JSON.stringify(project()));
      await createProjectBackup("portable-save");
      markProjectSaved();
      setStatus(`Saved portable package to ${result.path}`);
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("open-project-package").onclick = async () => {
    if (!native) {
      alert("Portable project packages are available in the Windows application.");
      return;
    }
    try {
      const result = await nativeRequest("openProjectPackage");
      await loadProjectText(result.contents, true, result.path);
      setStatus(`Opened portable package ${result.path}`);
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("validate-project").onclick = () => runValidation(true);
  $("build-self-test").onclick = runBuildSelfTest;
  $("project-backups").onclick = async () => {
    if (!native) return alert("Project backups are available in the Windows application.");
    if (!$("backup-dialog").open) $("backup-dialog").showModal();
    await renderProjectBackups();
  };
  $("storage-settings").onclick = async () => {
    if (!native) return alert("Storage settings are available in the Windows application.");
    if (!$("storage-dialog").open) $("storage-dialog").showModal();
    await renderStorageSettings();
  };
  $("check-updates").onclick = checkForUpdates;
  $("backup-refresh").onclick = renderProjectBackups;
  $("backup-create").onclick = async () => {
    try {
      const result = await createProjectBackup("manual");
      setStatus(`Created backup ${result.name}`);
      await renderProjectBackups();
    } catch (error) {
      alert(`The backup could not be created.\n\n${error.message}`);
    }
  };
  $("panel-compatibility").onclick = runPanelCompatibility;
  $("compatibility-preview").onclick = previewCompatibilityDevice;
  $("compatibility-autofit").onclick = autoFitCompatibilityPage;
  $("health-export").onclick = () =>
    download("crestron-ui-project-health.txt", lastHealthReport || "No report has been generated.", "text/plain");
  $("signal-manager").onclick = () => {
    $("signal-search").value = "";
    renderSignalManager();
    $("signal-dialog").showModal();
  };
  $("signal-search").oninput = renderSignalManager;
  $("project-search").onclick = () => openProjectSearch();
  $("project-search-query").oninput = renderProjectSearch;
  $("signal-export-csv").onclick = () =>
    download("crestron-signal-map.csv", signalCsv(), "text/csv");
  $("signal-simulator").onclick = () => openSignalSimulator();
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
    simulatorItemFilter = null;
    clearSimulatorFocus();
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
    renderBuildPanelList();
    $("build-signal-diagnostics").checked = state.diagnostics;
    $("build-project-dialog").showModal();
  };
  $("build-signal-diagnostics").onchange = (event) => {
    state.diagnostics = event.target.checked;
    scheduleHistory();
  };
  $("build-project-multi").onclick = async () => {
    if (!native) { alert("CH5 packaging is available in the Windows application."); return; }
    if (!approveExport()) return;
    syncContractMetadata();
    const projectName = state.contract.name.trim(),
      selectedIds = [...document.querySelectorAll("#build-panel-list input:checked")].map((input) => input.value),
      devices = selectedIds.map((id) => deviceProfiles.find((device) => device.id === id)).filter(Boolean);
    if (!projectName) { alert("Enter a project / contract name."); return; }
    if (!devices.length) { alert("Select at least one panel package."); return; }
    const packages = [], buildProblems = [];
    devices.forEach((device) => {
      if (device.supportsCh5 === false) {
        buildProblems.push(`${device.name} does not support CH5 projects.`);
        return;
      }
      const targetProject = projectForDevice(device),
        html = window.ComposerExporter.exportProject(targetProject);
      targetProject.items.forEach((item) => {
        const margin = Math.max(0, Number(item.layout?.safeMargin) || 0);
        if (!window.ComposerResponsiveLayout.fitsSafeArea(
          item, { width: device.width, height: device.height }, margin,
        )) buildProblems.push(`${device.name}: “${item.name}” does not fit${margin ? ` its ${margin}px safe margin` : " the panel"}.`);
      });
      if (device.maximumProjectSizeMb && new TextEncoder().encode(html).length > device.maximumProjectSizeMb * 1024 * 1024)
        buildProblems.push(`${device.name}: generated project exceeds the ${device.maximumProjectSizeMb} MB limit.`);
      packages.push({ projectName: `${projectName}-${device.model}`, device, html });
    });
    if (buildProblems.length) {
      alert(`Multi-panel build cannot continue:\n\n${buildProblems.join("\n")}`);
      return;
    }
    const usesContracts = state.pages.some((page) => page.bindingMode === "contract") ||
      state.items.some((item) => Object.values(item.signalBindings || {}).some((binding) => binding.mode === "contract") ||
        Object.entries(item.properties || {}).some(([key, value]) => /bindingmode$/i.test(key) && value === "contract"));
    $("contract-status").textContent = `Building ${packages.length} panel packages…`;
    setStatus(`Building ${packages.length} panel packages…`);
    try {
      const result = await nativeRequest("buildCh5Packages", { packages, usesContracts });
      const builtByDevice = new Map(packages.map((entry, index) => [entry.device.id, result.paths?.[index] || ""]));
      if (result.paths?.length) saveDeploymentSettings({
        profiles: deploymentProfiles().map((profile) => builtByDevice.get(profile.deviceId)
          ? { ...profile, packagePath: builtByDevice.get(profile.deviceId), updatedAt: new Date().toISOString() }
          : profile),
      });
      if (result.paths?.length) {
        $("deploy-package").value = result.paths[0];
        saveDeploymentSettings({ packagePath: result.paths[0] });
        updateActiveDeploymentProfile({ packagePath: result.paths[0] });
      }
      $("contract-status").textContent = `Built ${result.paths.length} packages in ${result.folder}`;
      setStatus(`Built ${result.paths.length} panel packages`);
    } catch (error) {
      if (error.message !== "cancelled") { setStatus("Multi-panel build failed"); alert(error.message); }
    }
  };
  $("build-project-deploy").onclick = () => {
    if (!native) {
      alert("Panel deployment is available in the Windows application.");
      return;
    }
    $("build-project-dialog").close();
    $("deploy-panel").click();
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
      updateActiveDeploymentProfile({ packagePath: result.path });
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
    renderDeploymentProfiles();
    $("deploy-status").textContent = "Ready. Check the panel, then deploy.";
    renderDeploymentHistory();
    $("deployment-dialog").showModal();
  };
  $("deploy-profile").onchange = (event) => loadDeploymentProfile(event.target.value);
  $("deploy-profile-device").onchange = (event) => {
    $("deploy-target-type").value = defaultDeploymentType(event.target.value);
  };
  $("deploy-profile-new").onclick = () => {
    $("deploy-profile").value = "";
    $("deploy-profile-name").value = "";
    $("deploy-profile-device").value = state.targetDevice;
    $("deploy-target-type").value = defaultDeploymentType(state.targetDevice);
    $("deploy-host").value = "";
    $("deploy-username").value = "";
    $("deploy-package").value = "";
    $("deploy-profile-delete").disabled = true;
    saveDeploymentSettings({ activeProfileId: "" });
    $("deploy-profile-name").focus();
  };
  $("deploy-profile-save").onclick = saveCurrentDeploymentProfile;
  $("deploy-profile-delete").onclick = () => {
    const selected = activeDeploymentProfile();
    if (!selected || !confirm(`Delete deployment profile “${selected.name}”?`)) return;
    saveDeploymentSettings({
      profiles: deploymentProfiles().filter((profile) => profile.id !== selected.id),
      activeProfileId: "",
    });
    renderDeploymentProfiles("");
    $("deploy-status").textContent = `Deleted deployment profile “${selected.name}”.`;
  };
  $("deploy-host").onchange = () =>
    saveDeploymentSettings({ host: $("deploy-host").value.trim() });
  $("deploy-check").onclick = async () => {
    const host = $("deploy-host").value.trim();
    $("deploy-status").textContent = `Checking ${host || "panel"}…`;
    try {
      const result = await nativeRequest("checkPanel", host);
      $("deploy-status").textContent = result.reachable
        ? `${host} is reachable · ${result.roundtripMs} ms`
        : `${host} did not respond · ${result.status}`;
      saveDeploymentSettings({ host });
      updateActiveDeploymentProfile({
        host,
        lastCheck: { time: new Date().toISOString(), reachable: result.reachable, roundtripMs: result.roundtripMs, status: result.status },
      });
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
      updateActiveDeploymentProfile({ packagePath: result.path });
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
      slowMode = true;
    if (!host || !packagePath) {
      $("deploy-status").textContent =
        "Enter a panel host and select or build a .ch5z package.";
      return;
    }
    if (
      !confirm(
        `Deploy ${packagePath}\n\nto ${$("deploy-target-type").selectedOptions[0]?.textContent || "CH5 target"} at ${host}?\n\nA terminal will request the device credentials.`,
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
        deploymentType: activeDeploymentProfile()?.deploymentType || defaultDeploymentType(activeDeploymentProfile()?.deviceId || state.targetDevice),
      });
      const settings = deploymentSettings(),
        profile = activeDeploymentProfile(),
        history = [
          {
            time: new Date().toISOString(),
            host,
            packagePath,
            backupPath: result.backupPath,
            slowMode,
            profileId: profile?.id || "",
            profileName: profile?.name || "",
            deploymentType: result.deploymentType || profile?.deploymentType || "touchscreen",
            device: deviceProfiles.find((device) => device.id === profile?.deviceId)?.name || selectedDevice().name,
            resolution: `${state.width} × ${state.height}`,
          },
          ...(settings.history || []),
        ].slice(0, 20);
      saveDeploymentSettings({ host, packagePath, slowMode, history });
      updateActiveDeploymentProfile({ host, packagePath, slowMode, deploymentType: result.deploymentType });
      renderDeploymentHistory();
      $("deploy-status").textContent =
        "Deployment terminal opened. Enter credentials there and watch for “Success. Restarting UI”.";
    } catch (error) {
      $("deploy-status").textContent =
        `Deployment failed to start: ${error.message}`;
    }
  };
  async function checkDeploymentQueue(profiles = selectedDeploymentQueueProfiles()) {
    if (!profiles.length) { $("deploy-status").textContent = "Select at least one deployment profile."; return []; }
    const ready = [];
    for (const profile of profiles) {
      setDeploymentQueueState(profile.id, "running", "Checking…");
      try {
        const result = await nativeRequest("checkDeploymentProfile", {
          host: profile.host, packagePath: profile.packagePath, deviceId: profile.deviceId,
        });
        const mismatch = result.targetDeviceId && result.targetDeviceId !== profile.deviceId;
        if (result.reachable && result.packageValid && !mismatch) {
          const message = `Ready · ${result.roundtripMs} ms · ${(result.size / 1024 / 1024).toFixed(2)} MB${result.targetDeviceId ? "" : " · target untagged"}`;
          setDeploymentQueueState(profile.id, "ready", message, result);
          ready.push(profile);
        } else {
          const message = mismatch ? `Package targets ${result.targetDeviceId}` : !result.packageValid ? result.packageStatus : `Unreachable · ${result.status}`;
          setDeploymentQueueState(profile.id, "failed", message, result);
        }
      } catch (error) {
        setDeploymentQueueState(profile.id, "failed", error.message);
      }
    }
    const checkedAt = new Date().toISOString();
    saveDeploymentSettings({ profiles: deploymentProfiles().map((profile) => {
      const status = deploymentQueueStatus.get(profile.id);
      return profiles.some((entry) => entry.id === profile.id)
        ? { ...profile, lastCheck: { time: checkedAt, state: status?.state, message: status?.message } }
        : profile;
    }) });
    $("deploy-status").textContent = `${ready.length} of ${profiles.length} selected profiles are ready.`;
    return ready;
  }
  function appendDeploymentHistory(profile, result, success, message) {
    const settings = deploymentSettings(), device = deviceProfiles.find((entry) => entry.id === profile.deviceId),
      history = [{
        time: new Date().toISOString(), host: profile.host, packagePath: profile.packagePath,
        backupPath: result?.backupPath || "", slowMode: true,
        profileId: profile.id, profileName: profile.name, device: device?.name || profile.deviceId,
        deploymentType: profile.deploymentType || defaultDeploymentType(profile.deviceId),
        resolution: device ? `${device.width} × ${device.height}` : "", success, message,
      }, ...(settings.history || [])].slice(0, 50);
    saveDeploymentSettings({ history });
    renderDeploymentHistory();
  }
  async function deployProfileQueue(profiles) {
    const ready = await checkDeploymentQueue(profiles);
    if (!ready.length) return;
    if (!confirm(`Deploy ${ready.length} ready profile${ready.length === 1 ? "" : "s"} sequentially?\n\nEach panel opens a Crestron terminal for its credential prompt.`)) return;
    let successes = 0;
    for (const profile of ready) {
      setDeploymentQueueState(profile.id, "running", "Deploying — complete the terminal prompt…");
      try {
        const result = await nativeRequest("deployCh5PackageWait", {
          host: profile.host, packagePath: profile.packagePath, slowMode: true,
          deploymentType: profile.deploymentType || defaultDeploymentType(profile.deviceId),
        });
        if (result.success) {
          successes++;
          setDeploymentQueueState(profile.id, "ready", "Deployment succeeded", result);
          appendDeploymentHistory(profile, result, true, "Deployment succeeded");
        } else {
          setDeploymentQueueState(profile.id, "failed", `Deployment failed · exit ${result.exitCode}`, result);
          appendDeploymentHistory(profile, result, false, `CLI exit code ${result.exitCode}`);
        }
      } catch (error) {
        setDeploymentQueueState(profile.id, "failed", error.message);
        appendDeploymentHistory(profile, null, false, error.message);
      }
    }
    $("deploy-status").textContent = `${successes} of ${ready.length} deployments succeeded.`;
  }
  $("deploy-check-all").onclick = () => checkDeploymentQueue();
  $("deploy-start-selected").onclick = () => deployProfileQueue(selectedDeploymentQueueProfiles());
  $("deploy-retry-failed").onclick = () => {
    const failedIds = new Set([...deploymentQueueStatus].filter(([, status]) => status.state === "failed").map(([id]) => id));
    document.querySelectorAll("#deployment-profile-list input").forEach((input) => { input.checked = failedIds.has(input.value); });
    const failed = deploymentProfiles().filter((profile) => failedIds.has(profile.id));
    if (!failed.length) { $("deploy-status").textContent = "There are no failed deployments to retry."; return; }
    deployProfileQueue(failed);
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
  const appMenus = [...document.querySelectorAll(".app-menu")];
  appMenus.forEach((menu) => {
    menu.querySelector("summary").addEventListener("click", () =>
      appMenus.forEach((other) => {
        if (other !== menu) other.open = false;
      }),
    );
    menu.querySelector(".app-menu-popup").addEventListener("click", (event) => {
      if (event.target.closest("button,.menu-file-button")) menu.open = false;
    });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".app-menu"))
      appMenus.forEach((menu) => (menu.open = false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") appMenus.forEach((menu) => (menu.open = false));
  });
  $("preview").onclick = () => {
    const w = open();
    w.document.write(exportHtml());
    w.document.close();
  };
  $("open-project").onchange = async (e) =>
    loadProjectText(await e.target.files[0].text(), true, e.target.files[0].name);
  $("open-project-label").onclick = async (e) => {
    if (!native) return;
    e.preventDefault();
    try {
      const result = await nativeRequest("openProject");
      await loadProjectText(result.contents, true, result.path);
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
    state.customComponents = [];
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
  $("timeline-add").onclick = () => {
    const item = current();
    if (!item) return;
    item.interactions = item.interactions || [];
    item.interactions.push({
      trigger: "press",
      preset: "fade",
      direction: "left",
      start: 0,
      duration: 300,
      easing: "ease-out",
    });
    renderTimeline(item);
    commitHistory();
  };
  $("timeline-play").onclick = () => {
    const item = current();
    if (item) playItemTimeline(item);
  };
  $("timeline-reset").onclick = () => {
    const item = current();
    if (item) resetItemInteraction(item);
  };
  $("action-add").onclick = () => {
    const item = current();
    if (!item) return;
    item.actions = item.actions || [];
    item.actions.push({
      event: "press",
      triggerSignal: "",
      triggerType: "digital",
      type: "navigate",
      target:
        state.pages.find((page) => page.id !== state.activePage)?.id ||
        state.activePage,
      value: "",
      delay: 0,
      timing: "parallel",
    });
    renderActionEditor(item);
    commitHistory();
  };
  $("action-preview").onclick = () => {
    const item = current(),
      eventName = $("action-preview-event").value,
      matching = item?.actions?.find((action) => action.event === eventName);
    if (item && matching)
      runItemActions(
        item,
        eventName,
        matching.triggerSignal || "",
        parseActionValue(matching.compareValue || "true", matching.triggerType),
      );
  };
  $("action-copy").onclick = () => {
    const item = current();
    actionClipboard = structuredClone(item?.actions || []);
    $("action-paste").disabled = !actionClipboard.length;
    setStatus(
      `Copied ${actionClipboard.length} action${actionClipboard.length === 1 ? "" : "s"}`,
    );
  };
  $("action-paste").onclick = () => {
    const item = current();
    if (!item || !actionClipboard.length) return;
    item.actions = structuredClone(actionClipboard);
    renderActionEditor(item);
    commitHistory();
    setStatus(
      `Pasted ${item.actions.length} action${item.actions.length === 1 ? "" : "s"}`,
    );
  };
  $("action-paste").disabled = true;
  initializeCollapsibleSidePanels();
  wirePaneResizer("sidebar-resizer", "sidebar-width", 1, 220);
  wirePaneResizer("inspector-resizer", "inspector-width", -1, 230);
  $("zoom-out").onclick = () => setPanelZoom(panelZoom - 0.1);
  $("zoom-in").onclick = () => setPanelZoom(panelZoom + 0.1);
  $("zoom-level").onclick = () => setPanelZoom(1);
  $("zoom-fit").onclick = fitPanel;
  document.querySelector(".stage-wrap").addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setPanelZoom(panelZoom + (event.deltaY < 0 ? 0.1 : -0.1));
    },
    { passive: false },
  );
  document.querySelectorAll("dialog").forEach((dialog) => {
    const form = dialog.querySelector("form");
    if (!form || form.querySelector(":scope > .dialog-close")) return;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "dialog-close";
    close.setAttribute("aria-label", "Close");
    close.title = "Close";
    close.textContent = "×";
    close.onclick = () => dialog.close();
    form.prepend(close);
    if (dialog.id === "simulator-dialog") return;
    const handle = form.querySelector("h2");
    if (!handle) return;
    handle.classList.add("dialog-drag-handle");
    handle.title = "Drag to move";
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,input,select,textarea,a")) return;
      const rect = dialog.getBoundingClientRect(),
        startX = event.clientX,
        startY = event.clientY;
      dialog.style.margin = "0";
      dialog.style.right = "auto";
      dialog.style.bottom = "auto";
      dialog.style.left = `${rect.left}px`;
      dialog.style.top = `${rect.top}px`;
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      function move(moveEvent) {
        const width = dialog.offsetWidth,
          height = dialog.offsetHeight,
          left = Math.max(0, Math.min(window.innerWidth - Math.min(80, width), rect.left + moveEvent.clientX - startX)),
          top = Math.max(0, Math.min(window.innerHeight - Math.min(48, height), rect.top + moveEvent.clientY - startY));
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
  });
  document
    .querySelectorAll(".color-swatches [data-color]")
    .forEach((button) => {
      button.style.setProperty("--swatch", button.dataset.color);
      button.onclick = () => setColorDialogValue(button.dataset.color);
    });
  ["red", "green", "blue"].forEach((channel) => {
    $("color-" + channel).oninput = () => {
      const toHex = (value) => Number(value).toString(16).padStart(2, "0");
      setColorDialogValue(
        `#${toHex($("color-red").value)}${toHex($("color-green").value)}${toHex($("color-blue").value)}`,
      );
    };
  });
  $("color-hex").oninput = (event) => {
    const value = normalizeHexColor(event.target.value);
    if (value) setColorDialogValue(value);
  };
  $("color-native-open").onclick = () => $("color-native-input").click();
  $("color-native-input").oninput = (event) =>
    setColorDialogValue(event.target.value);
  $("color-dialog").addEventListener("close", () => {
    activeColorInput = null;
  });
  document.addEventListener(
    "click",
    (event) => {
      const input = event.target.closest('input[type="color"]');
      if (!input || input.hasAttribute("data-native-color-picker")) return;
      event.preventDefault();
      openColorDialog(input);
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (
      event.target.matches?.(
        'input[type="color"]:not([data-native-color-picker])',
      ) &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openColorDialog(event.target);
    }
  });
  addEventListener("keydown", (e) => {
    const editing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName),
      key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "f") {
      e.preventDefault();
      openProjectSearch();
      return;
    }
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
  setPanelZoom(
    Number(localStorage.getItem("crestron-ui-composer-panel-zoom")) || 1,
  );
  renderPages();
  renderPageInspector();
  commitHistory(false);
  Promise.all([loadDevices(), loadKnown()]).then(recoverAutosave);
})();
