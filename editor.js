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
    subpages: [],
    themes: [],
    customComponents: [],
    acceptance: { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} },
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
  const sessionKey = "crestron-ui-composer-session-v1";
  const autosaveLimit = 10;
  const autosaveInterval = 30000;
  let previousSessionWasUnclean = false;
  try {
    previousSessionWasUnclean =
      JSON.parse(localStorage.getItem(sessionKey) || "null")?.active === true;
    localStorage.setItem(
      sessionKey,
      JSON.stringify({ active: true, startedAt: new Date().toISOString() }),
    );
  } catch (_) {}
  let autosaveEnabled = false,
    autosaveTimer = 0,
    projectDirty = false,
    lastManualFingerprint = "";
  let componentClipboard = "";
  let actionClipboard = [];
  let lastHealthReport = "";
  let lastHealthIssues = [];
  let healthIssueFilter = "all";
  let lastPerformanceMetrics = null;
  let lastUsabilityMetrics = null;
  let lastApprovedPreflightFingerprint = "";
  let signalViewMode = "table",
    importedContractComparison = null;
  let joinAllocationPlan = [];
  let contractNamingPlan = [];
  let activeColorInput = null;
  let panelZoom = 1;
  let lastRenderedPageId = "";
  let customEditingId = "";
  let editingSubpagePagesId = "";
  let editingSubpagePropertiesId = "";
  let creatingSubpageMode = "";
  let selectedSubpageInstanceKey = "";
  let contextSubpageId = "", contextSubpagePageId = "";
  let simulatorSubpageKey = "";
  const hiddenSubpageInstances = new Set(), highlightedSubpageInstances = new Set();
  let customBehaviorRules = [];
  let customElementPickerActive = false;
  let customBuilderSourceItemId = "";
  let customPreviewEvents = [];
  let customSelfTestResolve = null;
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
    requestAnimationFrame(centerSubpageMasterCanvas);
  }
  function centerSubpageMasterCanvas(scroll = false) {
    const viewport = document.querySelector(".stage-wrap"),
      isMaster = stage.classList.contains("subpage-master-canvas");
    $("center-subpage-master").hidden = !isMaster;
    if (!isMaster) {
      stage.style.marginLeft = "";
      stage.style.marginTop = "";
      return;
    }
    const canvasWidth = Math.max(1, parseFloat(stage.style.width) || state.width),
      canvasHeight = Math.max(1, parseFloat(stage.style.height) || state.height),
      horizontalSpace = Math.max(0, viewport.clientWidth - canvasWidth * panelZoom - 64),
      verticalSpace = Math.max(0, viewport.clientHeight - canvasHeight * panelZoom - 105);
    stage.style.marginLeft = `${Math.max(0, horizontalSpace / 2 / panelZoom)}px`;
    stage.style.marginTop = `${Math.max(20, verticalSpace / 2 / panelZoom)}px`;
    if (scroll) viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }
  function fitPanel() {
    const viewport = document.querySelector(".stage-wrap"),
      horizontalPadding = 64,
      verticalPadding = 82,
      canvasWidth = Math.max(1, parseFloat(stage.style.width) || state.width),
      canvasHeight = Math.max(1, parseFloat(stage.style.height) || state.height),
      widthZoom = (viewport.clientWidth - horizontalPadding) / canvasWidth,
      heightZoom = (viewport.clientHeight - verticalPadding) / canvasHeight;
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
  function collapsiblePanelSection(
    title,
    nodes,
    key,
    open = true,
    anchor = nodes[0],
  ) {
    if (!anchor || !nodes.length) return null;
    const details = document.createElement("details"),
      summary = document.createElement("summary"),
      body = document.createElement("div"),
      saved = localStorage.getItem(`crestron-ui-composer-section-${key}`);
    details.className = "side-panel-section";
    details.id = key;
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
      const stop = headings[index + 1],
        nodes = [];
      for (let node = heading.nextElementSibling; node && node !== stop; ) {
        const next = node.nextElementSibling;
        nodes.push(node);
        node = next;
      }
      const title = heading.textContent.trim(),
        key = `library-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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
    if (basicNodes.length)
      collapsiblePanelSection("Widget", basicNodes, "inspector-widget", true);
    [...form.querySelectorAll(":scope > section")].forEach((section) => {
      const headerRow = section.querySelector(":scope > .section-header-row"),
        heading = section.querySelector(":scope > h2, :scope > .section-header-row > h2"),
        title = heading?.textContent.trim() || "Section",
        children = [...section.children].filter(
          (child) => child !== heading && child !== headerRow,
        ),
        details = collapsiblePanelSection(
          title,
          children,
          `inspector-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title === "Component properties" || title === "Signal bindings",
          section,
        );
      if (details) {
        if (section.id) details.id = section.id;
        details.classList.add(
          ...[...section.classList].filter((name) => name !== "signal-section"),
        );
        details.hidden = section.hidden;
        const summary = details.querySelector(":scope > summary");
        if (summary && headerRow) {
          [...headerRow.children]
            .filter((child) => child !== heading)
            .forEach((child) => {
              child.addEventListener("click", (event) => event.stopPropagation());
              summary.appendChild(child);
            });
        }
      }
      heading?.remove();
      headerRow?.remove();
      section.remove();
    });
    const widgetBody = form.querySelector(
        ":scope > .side-panel-section > .side-panel-section-body",
      ),
      navigation = $("prop-target")?.closest("label"),
      pageVisibility = $("prop-hide-on-page-wrap");
    if (widgetBody && navigation) widgetBody.appendChild(navigation);
    if (widgetBody && pageVisibility) widgetBody.appendChild(pageVisibility);

    const sectionOrder = [
      "inspector-widget",
      "component-properties-section",
      "asset-inspector-section",
      "inspector-interaction-animation",
      "inspector-signal-bindings",
      "inspector-responsive-layout",
    ];
    sectionOrder.forEach((id) => {
      const section = $(id);
      if (section && section.parentNode === form) form.appendChild(section);
    });
    const pageHeading = [...inspector.querySelectorAll(":scope > h2")].find(
      (heading) => heading.textContent.trim() === "Page",
    );
    if (pageHeading) {
      const pageNodes = [];
      for (let node = pageHeading.nextElementSibling; node; ) {
        const next = node.nextElementSibling;
        pageNodes.push(node);
        node = next;
      }
      collapsiblePanelSection("Page", pageNodes, "inspector-page", true);
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
  function projectSnapshot() {
    return {
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
      subpages: state.subpages,
      themes: state.themes,
      customComponents: state.customComponents,
      acceptance: state.acceptance,
      contract: state.contract,
    };
  }
  function historyState() {
    return JSON.stringify(projectSnapshot());
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
      if (
        JSON.stringify(old.deviceOverrides) !==
        JSON.stringify(item.deviceOverrides)
      )
        return `Changed ${item.name} responsive layout`;
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
    if (previous.targetDevice !== next.targetDevice)
      return "Changed target panel";
    if (previous.width !== next.width || previous.height !== next.height)
      return "Changed panel size";
    if (JSON.stringify(previous.assets) !== JSON.stringify(next.assets))
      return "Changed project assets";
    if (JSON.stringify(previous.reusables) !== JSON.stringify(next.reusables))
      return "Changed reusable designs";
    if (
      JSON.stringify(previous.pageTemplates) !==
      JSON.stringify(next.pageTemplates)
    )
      return "Changed page templates";
    if (JSON.stringify(previous.themes) !== JSON.stringify(next.themes))
      return "Changed themes";
    if (
      JSON.stringify(previous.customComponents) !==
      JSON.stringify(next.customComponents)
    )
      return "Changed custom components";
    if (JSON.stringify(previous.acceptance) !== JSON.stringify(next.acceptance))
      return "Updated acceptance test";
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
        label = document.createElement("span"),
        time = document.createElement("time");
      button.type = "button";
      button.className = `history-entry${index === historyIndex ? " current" : ""}${index > historyIndex ? " future" : ""}`;
      button.title = `${entry.label} · ${new Date(entry.time).toLocaleTimeString()}`;
      marker.className = "history-entry-index";
      marker.textContent =
        index === historyIndex ? "●" : index > historyIndex ? "○" : "✓";
      label.className = "history-entry-label";
      label.textContent = entry.label;
      time.className = "history-entry-time";
      time.dateTime = entry.time;
      time.textContent = new Date(entry.time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
      button.append(marker, label, time);
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
  function projectIntegrityErrors(value) {
    const errors = [];
    if (!value || typeof value !== "object") return ["Project data is not an object."];
    if (!Number.isFinite(Number(value.width)) || Number(value.width) <= 0)
      errors.push("Panel width is invalid.");
    if (!Number.isFinite(Number(value.height)) || Number(value.height) <= 0)
      errors.push("Panel height is invalid.");
    if (!Array.isArray(value.pages) || !value.pages.length)
      errors.push("The project has no pages.");
    if (!Array.isArray(value.items)) errors.push("The widget collection is missing.");
    const pages = Array.isArray(value.pages) ? value.pages : [],
      items = Array.isArray(value.items) ? value.items : [],
      pageIds = pages.map((page) => String(page?.id || "")),
      itemIds = items.map((item) => String(item?.id || ""));
    if (pageIds.some((id) => !id)) errors.push("A page has no ID.");
    if (new Set(pageIds).size !== pageIds.length)
      errors.push("Two or more pages have the same ID.");
    if (value.activePage && !pageIds.includes(String(value.activePage)))
      errors.push("The active page does not exist.");
    if (itemIds.some((id) => !id)) errors.push("A widget has no ID.");
    if (new Set(itemIds).size !== itemIds.length)
      errors.push("Two or more widgets have the same ID.");
    const orphaned = items.filter(
      (item) => item?.pageId && !pageIds.includes(String(item.pageId)),
    );
    if (orphaned.length)
      errors.push(`${orphaned.length} widget${orphaned.length === 1 ? " references" : "s reference"} a missing page.`);
    ["assets", "customComponents", "reusables", "pageTemplates", "themes"].forEach(
      (key) => {
        if (value[key] != null && !Array.isArray(value[key]))
          errors.push(`${key} is not a valid collection.`);
      },
    );
    try {
      JSON.stringify(value);
    } catch (error) {
      errors.push(`Project data cannot be serialized: ${error.message}`);
    }
    return errors;
  }
  function recoveryFingerprint(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }
  function recoveryIntegrity(snapshot) {
    const errors = projectIntegrityErrors(snapshot?.project);
    if (
      snapshot?.fingerprint &&
      snapshot.fingerprint !== recoveryFingerprint(snapshot.project)
    )
      errors.push("Snapshot checksum does not match its project data.");
    return { valid: !errors.length, errors };
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
        integrityErrors = projectIntegrityErrors(parsed),
        snapshot = {
          savedAt: now.toISOString(),
          project: parsed,
          fingerprint: recoveryFingerprint(parsed),
        };
      if (integrityErrors.length)
        throw new Error(`Recovery snapshot rejected: ${integrityErrors.join(" ")}`);
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
    state.subpages = saved.subpages || [];
    state.themes = saved.themes || [];
    state.customComponents = saved.customComponents || [];
    state.acceptance = saved.acceptance || { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} };
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
    state.subpages = p.subpages || [];
    state.themes = p.themes || [];
    state.customComponents = p.customComponents || [];
    state.acceptance = p.acceptance || { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} };
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
    const snapshots = store.snapshots
      .filter((entry) => entry && entry.project && entry.savedAt)
      .map((entry) => ({ ...entry, integrity: recoveryIntegrity(entry) })),
      validSnapshots = snapshots.filter((entry) => entry.integrity.valid);
    if (!snapshots.length) {
      autosaveEnabled = true;
      lastManualFingerprint = historyState();
      setAutosaveState("Saved");
      return;
    }
    const list = $("recovery-list");
    $("recovery-context").textContent = previousSessionWasUnclean
      ? "The previous Composer session did not close normally. Choose a verified recovery snapshot, or discard the recovery history."
      : "Composer found unsaved work from an earlier session. Choose a verified recovery snapshot, or discard the recovery history.";
    list.innerHTML = snapshots
      .map(
        (entry, index) =>
          `<label class="recovery-entry${entry.integrity.valid ? "" : " invalid"}"><input type="radio" name="recovery-snapshot" value="${index}" ${entry.integrity.valid && entry === validSnapshots[0] ? "checked" : ""} ${entry.integrity.valid ? "" : "disabled"}><span><strong>${new Date(entry.savedAt).toLocaleString()}${index === 0 ? " · Latest" : ""} · ${entry.integrity.valid ? "Verified" : "Invalid"}</strong><small>${entry.integrity.valid ? recoveryDescription(entry) : entry.integrity.errors.join(" ")}</small></span></label>`,
      )
      .join("");
    $("recovery-restore").disabled = !validSnapshots.length;
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
    "Visual Only",
  ];
  // Category expansion is deliberately session-only. A fresh application
  // launch always begins with a compact, fully collapsed component palette.
  const openComponentCategories = new Set();
  const native = window.chrome && window.chrome.webview,
    nativePending = new Map();
  if (native)
    native.addEventListener("message", (event) => {
      const m = event.data;
      if (m && m.type === "openProjectFile") {
        loadProjectText(m.contents, true, m.path).then(() =>
          setStatus("Opened " + m.path),
        );
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
  topToolbar.addEventListener(
    "wheel",
    (event) => {
      if (
        topToolbar.scrollWidth <= topToolbar.clientWidth ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      )
        return;
      topToolbar.scrollLeft += event.deltaY;
      event.preventDefault();
    },
    { passive: false },
  );
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
    if (/text|label|scroll|keyboard|password|input/.test(n))
      return "Text & Input";
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
        {
          key: "appearanceEnabled",
          name: "Override custom appearance",
          type: "checkbox",
          defaultValue: false,
        },
        {
          key: "localText",
          name: "Local text",
          type: "text",
          defaultValue: "",
        },
        {
          key: "backgroundColor",
          name: "Background color",
          type: "color",
          defaultValue: "#253436",
        },
        {
          key: "textColor",
          name: "Text color",
          type: "color",
          defaultValue: "#ffffff",
        },
        {
          key: "borderColor",
          name: "Border color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "glowColor",
          name: "Glow color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "fontSize",
          name: "Text size",
          type: "number",
          defaultValue: 18,
        },
        {
          key: "cornerRadius",
          name: "Corner radius",
          type: "number",
          defaultValue: 8,
        },
        {
          key: "glowStrength",
          name: "Glow strength",
          type: "number",
          defaultValue: 12,
        },
        {
          key: "contentInset",
          name: "Glow-safe inset",
          type: "number",
          defaultValue: 10,
        },
      ],
      declaredKeys = new Set(
        (entry.properties || []).map((property) => property.key),
      ),
      properties = [
        ...(entry.properties || []),
        ...appearanceProperties.filter(
          (property) => !declaredKeys.has(property.key),
        ),
      ];
    window.ComposerRuntime.register({
      id: entry.id,
      name: entry.name,
      category: entry.category || "Custom",
      icon: entry.icon || "🧩",
      defaultSize: entry.defaultSize || { width: 320, height: 180 },
      properties,
      signals: entry.signals || [],
      rangeBindings:
        entry.rangeBindings || repeatedItemRanges(entry.repeatedItems),
      template: '<div class="custom-component-host"></div>',
      styles:
        "[data-component] .custom-component-host,[data-component] .custom-component-host iframe{display:block;width:100%;height:100%;border:0}",
      data: {
        html: prepareCustomSource(entry.html),
        signals: entry.signals || [],
        repeatedItems: entry.repeatedItems || null,
        repeatRuntime: customRepeatedFrameRuntime(entry.repeatedItems || null),
        behaviorRuntime: customBehaviorRuntime(
          entry.behaviors || [],
          Object.fromEntries(
            (entry.properties || []).map((property) => [
              property.key,
              property.type === "asset"
                ? `{{${property.key}Data}}`
                : `{{${property.key}}}`,
            ]),
          ),
        ),
        behaviorCss: customBehaviorCss(entry.behaviors || []),
        stateCss: customStateCss(entry.stateStyles || null),
        stateRuntime: customStateRuntime(entry.stateStyles || null),
      },
      mount(root, context) {
        const host = root.querySelector(".custom-component-host"),
          frame = document.createElement("iframe"),
          latestFeedback = new Map(),
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
          customFontStyle = properties.fontAsset && properties.fontAssetData
            ? `<style>@font-face{font-family:"${String(properties.fontAsset).replace(/["<>]/g, "")}";src:url("${String(properties.fontAssetData).replace(/["<>]/g, "")}");font-display:swap}html,body,button,input,textarea,select,option,[data-custom-text],.label,.text,.name,.value,.title{font-family:"${String(properties.fontAsset).replace(/["<>]/g, "")}"!important}</style>`
            : "",
          localText = String(properties.localText || ""),
          localTextScript = localText
            ? `<script>document.addEventListener('DOMContentLoaded',function(){var target=document.querySelector('[data-custom-text],.button-label');if(target)target.textContent=${JSON.stringify(localText)}});<\/script>`
            : "",
          frameBaseStyle = `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;box-sizing:border-box}body{padding:${properties.contentInset == null || properties.contentInset === "" ? 10 : Math.max(0, Number(properties.contentInset) || 0)}px}body>*{box-sizing:border-box}</style>`,
          bridge = `<script>(function(){if(!window.ComposerSignals){var callbacks={};window.ComposerSignals={publish:function(key,value){parent.postMessage({type:'composer-custom-publish',key:key,value:value},'*')},subscribe:function(key,callback){(callbacks[key]||(callbacks[key]=[])).push(callback);return function(){callbacks[key]=(callbacks[key]||[]).filter(function(entry){return entry!==callback)}}};window.addEventListener('message',function(event){if(!event.data||event.data.type!=='composer-signal')return;(callbacks[event.data.key]||[]).slice().forEach(function(callback){callback(event.data.value)})})}window.ComposerComponent={publish:window.ComposerSignals.publish};window.addEventListener('error',function(e){parent.postMessage({type:'composer-custom-error',message:e.message},'*')});document.addEventListener('pointerdown',function(){parent.postMessage({type:'composer-interaction',phase:'press'},'*')});document.addEventListener('pointerup',function(){parent.postMessage({type:'composer-interaction',phase:'release'},'*')})})();<\/script>`,
          repeatRuntime = context.options.definitionData.repeatRuntime || "",
          behaviorRuntime = String(
            context.options.definitionData.behaviorRuntime || "",
          ).replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_, key) =>
            String(properties[key] ?? ""),
          ),
          behaviorCss = String(
            context.options.definitionData.behaviorCss || "",
          ).replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_, key) =>
            String(properties[key] ?? ""),
          ),
          behaviorStyle = behaviorCss
            ? `<style data-composer-generated>${behaviorCss}</style>`
            : "",
          stateCss = String(context.options.definitionData.stateCss || "").replace(
            /\{\{([A-Za-z_$][\w$]*)\}\}/g,
            (_, key) => String(properties[key] ?? ""),
          ),
          stateStyle = stateCss
            ? `<style data-composer-states>${stateCss}</style>`
            : "",
          stateRuntime = String(
            context.options.definitionData.stateRuntime || "",
          ).replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_, key) =>
            String(properties[key] ?? ""),
          ),
          documentText = /<\/body>/i.test(resolved)
            ? resolved.replace(
                /<\/body>/i,
                frameBaseStyle +
                  customFontStyle +
                  appearance +
                  localTextScript +
                  bridge +
                  repeatRuntime +
                  stateStyle +
                  stateRuntime +
                  behaviorStyle +
                  behaviorRuntime +
                  "</body>",
              )
            : resolved +
              frameBaseStyle +
              customFontStyle +
              appearance +
              localTextScript +
              bridge +
              repeatRuntime +
              stateStyle +
              stateRuntime +
              behaviorStyle +
              behaviorRuntime;
        let frameReady = false;
        function sendFeedback(key, value) {
          latestFeedback.set(key, value);
          if (frameReady)
            frame.contentWindow?.postMessage(
              { type: "composer-signal", key, value },
              "*",
            );
        }
        function replayFeedback() {
          frameReady = true;
          latestFeedback.forEach((value, key) =>
            frame.contentWindow?.postMessage(
              { type: "composer-signal", key, value },
              "*",
            ),
          );
        }
        frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
        frame.addEventListener("load", replayFeedback);
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
          ) {
            const repeated = context.options.definitionData.repeatedItems,
              match =
                repeated &&
                String(event.data.key || "").match(/^__repeatPress:(\d+)$/);
            if (match) {
              const index = Number(match[1]),
                base =
                  properties.pressBase ||
                  `${repeated.namespace}.Items[{index}].Press`,
                increment = Math.max(
                  1,
                  Number(properties.signalIncrement) || 1,
                ),
                address = /^\d+$/.test(String(base))
                  ? String(Number(base) + index * increment)
                  : String(base)
                      .replaceAll("{index}", String(index))
                      .replaceAll("{n}", String(index));
              context.signals.publishAddress(
                "digital",
                address,
                event.data.value,
              );
            } else context.signals.publish(event.data.key, event.data.value);
          }
        }
        addEventListener("message", receive);
        signals
          .filter((signal) => signal.direction === "input")
          .forEach((signal) =>
            context.signals.subscribe(signal.key, (value) =>
              sendFeedback(signal.key, value),
            ),
          );
        const repeated = context.options.definitionData.repeatedItems;
        if (repeated) {
          const increment = Math.max(
              1,
              Number(properties.signalIncrement) || 1,
            ),
            addressAt = (base, index) =>
              /^\d+$/.test(String(base))
                ? String(Number(base) + index * increment)
                : String(base)
                    .replaceAll("{index}", String(index))
                    .replaceAll("{n}", String(index));
          for (let index = 0; index < repeated.maxCount; index++) {
            context.signals.subscribeAddress(
              "digital",
              addressAt(
                properties.feedbackBase ||
                  `${repeated.namespace}.Items[{index}].Selected`,
                index,
              ),
              (value) => sendFeedback(`__repeatSelected:${index}`, value),
            );
            context.signals.subscribeAddress(
              "serial",
              addressAt(
                properties.labelBase ||
                  `${repeated.namespace}.Items[{index}].Name`,
                index,
              ),
              (value) => sendFeedback(`__repeatName:${index}`, value),
            );
          }
        }
        return () => {
          frame.removeEventListener("load", replayFeedback);
          removeEventListener("message", receive);
        };
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
      group.open = !!query || openComponentCategories.has(category);
      group.addEventListener("toggle", () => {
        if (query) return;
        if (group.open) openComponentCategories.add(category);
        else openComponentCategories.delete(category);
      });
      summary.innerHTML =
        category +
        '<span class="category-count">' +
        components.length +
        "</span>";
      items.className = "category-items";
      components.forEach((c) => {
        const el = document.createElement("div"),
          customEntry = state.customComponents.find(
            (entry) => entry.id === c.componentId,
          );
        el.className = "component";
        if (c.icon) {
          const icon = document.createElement("span");
          icon.className = "component-icon";
          const name = document.createElement("span");
          icon.textContent = c.icon;
          name.className = "component-name";
          name.textContent = c.displayName;
          el.append(icon, name);
        } else {
          const name = document.createElement("span");
          name.className = "component-name";
          name.textContent = c.displayName;
          el.appendChild(name);
        }
        if (customEntry) {
          const remove = document.createElement("button");
          el.classList.add("custom-component");
          remove.type = "button";
          remove.className = "component-remove";
          remove.title = `Delete ${customEntry.name}`;
          remove.setAttribute("aria-label", `Delete ${customEntry.name}`);
          remove.textContent = "×";
          remove.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteCustomComponent(customEntry);
          };
          remove.onpointerdown = (event) => event.stopPropagation();
          el.appendChild(remove);
        }
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
        : "No manifest components loaded",
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
  function panelLayoutKey(
    id = state.targetDevice,
    width = state.width,
    height = state.height,
  ) {
    return id === "custom" ? `custom:${width}x${height}` : id;
  }
  const widgetListResponsiveKeys = [
    "orientation", "defaultCount", "useWidgetDefaultSize", "itemWidth", "itemHeight", "itemGap", "itemPadding", "alignItems",
    "scrollReturnEnabled", "scrollReturnThreshold", "scrollReturnSize", "includedGraphicWidth", "includedGraphicHeight", "includedGraphicX", "includedGraphicY", "includedGraphicOpacity", "includedMaxEffects"
  ];
  function widgetListResponsiveSnapshot(item) {
    if (item?.componentId !== "widget-list") return null;
    return Object.fromEntries(widgetListResponsiveKeys.filter(key => Object.prototype.hasOwnProperty.call(item.properties || {}, key)).map(key => [key, structuredClone(item.properties[key])]));
  }
  function applyWidgetListResponsiveSnapshot(item, snapshot) {
    if (item?.componentId !== "widget-list" || !snapshot) return;
    item.properties = { ...(item.properties || {}), ...structuredClone(snapshot) };
  }
  function widgetListVisibleCount(item, rect = item) {
    if (item?.componentId !== "widget-list") return 0;
    const p = item.properties || {}, horizontal = p.orientation !== "vertical", padding = Math.max(0, Number(p.itemPadding) || 0), gap = Math.max(0, Number(p.itemGap) || 0),
      definition = window.ComposerRuntime.get(p.widgetType || "standard-button"), useDefault = p.useWidgetDefaultSize === true || p.useWidgetDefaultSize === 1 || p.useWidgetDefaultSize === "1" || String(p.useWidgetDefaultSize).toLowerCase() === "true",
      rawSize = horizontal ? (useDefault ? Number(definition?.defaultSize?.width) || 220 : Number(p.itemWidth) || 220) : (useDefault ? Number(definition?.defaultSize?.height) || 120 : Number(p.itemHeight) || 120),
      itemSize = Math.max(1, rawSize + padding * 2), available = Math.max(1, Number(horizontal ? rect.w : rect.h) - 8);
    return Math.max(1, Math.floor((available + gap) / (itemSize + gap)));
  }
  function fitWidgetListItems(item, rect = item) {
    if (item?.componentId !== "widget-list") return;
    const p = item.properties ||= {}, horizontal = p.orientation !== "vertical", count = Math.max(1, Math.min(20, Number(p.defaultCount) || 1)), gap = Math.max(0, Number(p.itemGap) || 0), padding = Math.max(0, Number(p.itemPadding) || 0),
      available = Math.max(44, Number(horizontal ? rect.w : rect.h) - 8), fitted = Math.max(44, Math.floor((available - gap * (count - 1)) / count) - padding * 2);
    p.useWidgetDefaultSize = false;
    if (horizontal) p.itemWidth = fitted; else p.itemHeight = fitted;
  }
  function savePanelLayouts(
    id = state.targetDevice,
    width = state.width,
    height = state.height,
  ) {
    const key = panelLayoutKey(id, width, height);
    state.items.forEach((item) => {
      layoutDefaults(item);
      item.deviceOverrides[key] = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        panelWidth: width,
        panelHeight: height,
        widgetListProperties: widgetListResponsiveSnapshot(item),
      };
    });
    state.subpages.forEach((entry) => {
      entry.deviceOverrides ||= {};
      const baseWidth = Math.max(1, Number(entry.basePanelWidth) || width),
        baseHeight = Math.max(1, Number(entry.basePanelHeight) || height);
      entry.deviceOverrides[key] = {
        placement: entry.placement,
        width: Math.max(1, Math.round((Number(entry.width) || width) * width / baseWidth)),
        height: Math.max(1, Math.round((Number(entry.height) || 100) * height / baseHeight)),
        z: Number(entry.z) || 9000,
        panelWidth: width,
        panelHeight: height,
      };
      state.pages.filter((page) => subpageApplies(entry, page.id)).forEach((page) => {
        const override = (entry.instanceOverrides ||= {})[page.id];
        if (!override) return;
        const resolved = subpageResolved(entry, page.id), offset = subpageOffset(entry, page.id);
        (override.deviceOverrides ||= {})[key] = {
          x: offset.x, y: offset.y, width: resolved.width, height: resolved.height,
          placement: resolved.placement, z: Number(resolved.z) || 9000,
          panelWidth: width, panelHeight: height,
        };
      });
    });
  }
  function applyResponsiveSize(width, height, destinationKey) {
    const from = { width: state.width, height: state.height };
    state.items.forEach((item) => {
      const layout = layoutDefaults(item),
        saved = item.deviceOverrides[destinationKey];
      const rect =
        saved ||
        window.ComposerResponsiveLayout.adaptRect(
          item,
          from,
          { width, height },
          layout,
        );
      Object.assign(item, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      if (saved?.widgetListProperties) applyWidgetListResponsiveSnapshot(item, saved.widgetListProperties);
    });
    resize(width, height);
    renderPage();
  }
  function applyDevice(id) {
    const previousId = state.targetDevice,
      previousWidth = state.width,
      previousHeight = state.height;
    savePanelLayouts(previousId, previousWidth, previousHeight);
    state.targetDevice = id;
    const device = selectedDevice(),
      custom = id === "custom";
    $("custom-size").hidden = !custom;
    if (!custom) {
      applyResponsiveSize(
        device.width,
        device.height,
        panelLayoutKey(id, device.width, device.height),
      );
      $("panel-width").value = device.width;
      $("panel-height").value = device.height;
      setStatus(`${device.name}: ${device.width} × ${device.height}`);
    } else {
      const returningToCustom = previousId === "custom",
        width = returningToCustom
          ? Number($("panel-width").value) || device.width
          : device.width,
        height = returningToCustom
          ? Number($("panel-height").value) || device.height
          : device.height;
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
        layout: {
          anchorX: "left",
          anchorY: "top",
          scaleMode: "fixed",
          safeMargin: 0,
        },
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
                : preset === "shake"
                  ? [
                      { transform: "translateX(0)" },
                      { transform: "translateX(-4px)" },
                      { transform: "translateX(7px)" },
                      { transform: "translateX(-7px)" },
                      { transform: "translateX(5px)" },
                      { transform: "translateX(-3px)" },
                      { transform: "translateX(0)" },
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
  function playGlassCrackEffect(element, interaction, clientX, clientY, pressedTarget) {
    let target = pressedTarget?.closest?.("button,[role='button'],.button,.btn");
    if (!target || !element.contains(target))
      target = element.querySelector("button,[role='button'],.button,.btn,.scoped-preview") || element;
    const rect = target.getBoundingClientRect();
    const x = Number.isFinite(clientX) ? clientX - rect.left : rect.width / 2;
    const y = Number.isFinite(clientY) ? clientY - rect.top : rect.height / 2;
    const duration = Math.max(180, Number(interaction.effectDuration) || 650);
    const color = interaction.effectColor || "#eaf8ff";
    const canvas = document.createElement("canvas");
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    Object.assign(canvas.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", borderRadius: "inherit", zIndex: "9999",
    });
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const size = Math.max(25, Number(interaction.effectSize) || 125) / 100;
    const radius = Math.min(rect.width, rect.height) * 0.5 * size;
    const count = 16;
    const spokes = [];
    const strokePath = (points, width = .72, alpha = .88) => {
      if (points.length < 2) return;
      const draw = (strokeStyle, lineWidth, offsetX, offsetY) => {
        ctx.beginPath();
        points.forEach((point, index) =>
          index ? ctx.lineTo(point.x + offsetX, point.y + offsetY) : ctx.moveTo(point.x + offsetX, point.y + offsetY));
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };
      draw(`rgba(0,0,0,${alpha * .6})`, width + .75, .55, .7);
      ctx.shadowColor = color;
      ctx.shadowBlur = 1.1;
      draw(color, width, 0, 0);
      ctx.shadowBlur = 0;
      draw(`rgba(255,255,255,${alpha * .62})`, Math.max(.22, width * .28), -.28, -.32);
    };
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2 + (Math.random() - .5) * .19;
      const length = radius * (.52 + Math.random() * .56);
      const steps = 6 + Math.floor(Math.random() * 4);
      const points = [{ x, y }];
      for (let step = 1; step <= steps; step += 1) {
        const distance = length * step / steps;
        const jitter = step === steps ? 0 : (Math.random() - .5) * 5.5;
        points.push({
          x: x + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * jitter,
          y: y + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * jitter,
        });
      }
      spokes.push(points);
      strokePath(points, .48 + Math.random() * .5, .78 + Math.random() * .2);
      if (index % 2 === 0) {
        const origin = points[3 + Math.floor(Math.random() * Math.max(1, points.length - 4))];
        const branchAngle = angle + (Math.random() > .5 ? 1 : -1) * (.38 + Math.random() * .42);
        const branchLength = length * (.16 + Math.random() * .18);
        strokePath([
          origin,
          { x: origin.x + Math.cos(branchAngle) * branchLength * .45 + (Math.random() - .5) * 3,
            y: origin.y + Math.sin(branchAngle) * branchLength * .45 + (Math.random() - .5) * 3 },
          { x: origin.x + Math.cos(branchAngle) * branchLength,
            y: origin.y + Math.sin(branchAngle) * branchLength },
        ], .42, .72);
      }
    }
    [.16, .29, .43, .58].forEach((fraction, ringIndex) => {
      for (let index = 0; index < count; index += 1) {
        if (Math.random() < .18 + ringIndex * .04) continue;
        const first = spokes[index], second = spokes[(index + 1) % count];
        const a = first[Math.min(first.length - 1, Math.max(1, Math.round((first.length - 1) * fraction)))];
        const b = second[Math.min(second.length - 1, Math.max(1, Math.round((second.length - 1) * fraction)))];
        strokePath([a, { x: (a.x + b.x) / 2 + (Math.random() - .5) * 4, y: (a.y + b.y) / 2 + (Math.random() - .5) * 4 }, b], .34, .5);
      }
    });
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();
    target.appendChild(canvas);
    canvas.animate([{ opacity: 1 }, { opacity: .9, offset: .65 }, { opacity: 0 }], { duration, easing: "ease-out" });
    setTimeout(() => canvas.remove(), duration + 40);
  }
  function playPressEffect(element, interaction, clientX, clientY, pressedTarget) {
    const effect = interaction?.pressEffect || "none";
    if (!element || effect === "none") return;
    const rect = element.getBoundingClientRect();
    const host = element.closest("#stage") || element.parentElement || element;
    const hostRect = host.getBoundingClientRect();
    const scaleX = host.offsetWidth / hostRect.width || 1;
    const scaleY = host.offsetHeight / hostRect.height || 1;
    const x = Number.isFinite(clientX)
      ? (clientX - hostRect.left) * scaleX
      : (rect.left + rect.width / 2 - hostRect.left) * scaleX;
    const y = Number.isFinite(clientY)
      ? (clientY - hostRect.top) * scaleY
      : (rect.top + rect.height / 2 - hostRect.top) * scaleY;
    const duration = Math.max(100, Number(interaction.effectDuration) || 650);
    const size = Math.max(25, Number(interaction.effectSize) || 125) / 100;
    const color = interaction.effectColor || "#04dcb9";
    if (effect === "glass-crack") {
      playGlassCrackEffect(element, interaction, clientX, clientY, pressedTarget);
      return;
    }
    if (effect === "shake") {
      const target = element.querySelector(".scoped-preview") || element;
      const distance = Math.max(2, 6 * size);
      target.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${-0.65 * distance}px)` },
          { transform: `translateX(${distance}px)` },
          { transform: `translateX(${-distance}px)` },
          { transform: `translateX(${0.72 * distance}px)` },
          { transform: `translateX(${-0.42 * distance}px)` },
          { transform: "translateX(0)" },
        ],
        { duration, easing: "ease-out" },
      );
      return;
    }
    if (effect === "particle-burst") {
      const glowColor =
        getComputedStyle(element).getPropertyValue("--glow-color").trim() ||
        getComputedStyle(element.querySelector(".scoped-preview") || element)
          .getPropertyValue("--glow-color")
          .trim() ||
        "#04dcb9";
      const layer = document.createElement("span");
      Object.assign(layer.style, {
        position: "absolute",
        inset: "0",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: "9999",
      });
      const particleDuration = duration * 2.5;
      const travel =
        Math.max(element.offsetWidth, element.offsetHeight) * 0.42 * size;
      for (let index = 0; index < 28; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = travel * (0.42 + Math.random() * 0.58);
        const particle = document.createElement("span");
        const particleSize = 3 + Math.random() * 4;
        Object.assign(particle.style, {
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: `${particleSize}px`,
          height: `${particleSize}px`,
          margin: `${-particleSize / 2}px`,
          borderRadius: "50%",
          background: glowColor,
          boxShadow: `0 0 ${particleSize * 2}px ${glowColor}`,
          pointerEvents: "none",
        });
        layer.appendChild(particle);
        particle.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            {
              transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.15)`,
              opacity: 0,
            },
          ],
          {
            duration: particleDuration * (0.72 + Math.random() * 0.28),
            easing: "cubic-bezier(.1,.7,.2,1)",
          },
        );
      }
      host.appendChild(layer);
      setTimeout(() => layer.remove(), particleDuration + 50);
      return;
    }
    const layer = document.createElement("span");
    layer.className = `composer-press-effect composer-press-effect-${effect}`;
    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      overflow: "visible",
      pointerEvents: "none",
      borderRadius: "inherit",
      zIndex: "9999",
    });
    const count = effect === "wave" ? 3 : 2;
    const diameter =
      Math.max(element.offsetWidth, element.offsetHeight) * 1.15 * size;
    for (let index = 0; index < count; index += 1) {
      const ring = document.createElement("span");
      Object.assign(ring.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: "50%",
        pointerEvents: "none",
        transform: "translate(-50%,-50%) scale(0)",
        border: effect === "water-ripple" ? `2px solid ${color}` : "0",
        background: effect === "wave" ? color : "transparent",
        opacity: effect === "wave" ? ".24" : ".9",
      });
      layer.appendChild(ring);
      ring.animate(
        [
          {
            transform: "translate(-50%,-50%) scale(0)",
            opacity: effect === "wave" ? 0.28 : 0.95,
          },
          { transform: "translate(-50%,-50%) scale(1)", opacity: 0 },
        ],
        {
          duration,
          delay: index * Math.round(duration * 0.16),
          easing: "ease-out",
        },
      );
    }
    host.appendChild(layer);
    setTimeout(() => layer.remove(), duration + count * duration * 0.16 + 40);
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
    const allInteractions = interactionList(item);
    const interactions = allInteractions.filter(
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
      (event) => {
        const effectInteraction =
          allInteractions.find(
            (interaction) =>
              interaction.pressEffect && interaction.pressEffect !== "none",
          ) || item.interaction;
        playPressEffect(
          element,
          effectInteraction,
          event.clientX,
          event.clientY,
          event.target,
        );
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
  function itemVisibleOnPage(item, pageId) {
    if (!item.master) return item.pageId === pageId;
    return !(item.excludedPages || []).includes(pageId);
  }
  function ensureToastQueueItem() {
    let item = state.items.find(
      (entry) => entry.componentId === "toast-queue" && entry.systemManaged,
    );
    if (!item) {
      item = {
        id: uid(),
        componentId: "toast-queue",
        name: "Toast Notifications",
        master: true,
        systemManaged: true,
        pageId: state.pages[0].id,
        x: 0,
        y: 0,
        w: 240,
        h: 140,
        z: 0,
        properties: {},
        signalBindings: {},
        excludedPages: [],
        actions: [],
        locked: false,
        hidden: false,
      };
      state.items.push(item);
    }
    return item;
  }
  function renderItem(item) {
    let el = stage.querySelector('.widget[data-id="' + item.id + '"]');
    if (!itemVisibleOnPage(item, state.activePage)) {
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
    el.classList.toggle("system-managed", !!item.systemManaged);
    if (el.runtimeDispose) {
      el.runtimeDispose();
      el.runtimeDispose = null;
    }
    el.innerHTML = item.componentId
      ? '<div class="scoped-preview"></div><i class="handle"></i>'
      : '<iframe sandbox="allow-scripts allow-same-origin"></iframe><i class="handle"></i>';
    el.querySelector(".handle")?.addEventListener("pointerdown", startResize);
    el.style.cssText = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z};display:${item.hidden || item.systemManaged ? "none" : "block"}`;
    el.style.pointerEvents = item.actionDisabled || item.systemManaged ? "none" : "";
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
        (asset) =>
          asset.id === item.graphicAsset && asset.type.startsWith("image/"),
      ),
      selectedSameAsStandard =
        item.properties?.selectedSameAsStandard == null ||
        item.properties?.selectedSameAsStandard === true ||
        item.properties?.selectedSameAsStandard === 1 ||
        item.properties?.selectedSameAsStandard === "1" ||
        String(item.properties?.selectedSameAsStandard).toLowerCase() ===
          "true",
      selectedGraphicAsset = state.assets.find(
        (asset) =>
          asset.id ===
            (selectedSameAsStandard
              ? item.graphicAsset
              : item.selectedGraphicAsset) && asset.type.startsWith("image/"),
      ),
      graphicMode = item.graphicAssetMode || "none",
      definition = item.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null,
      repeatGraphic =
        item.graphicAssetPlacement === "items" && !!definition?.itemSelector;
    if (definition) {
      item.properties = item.properties || {};
      if (item.componentId === "countdown-auto-fire") {
        if (item.properties.text === "ARM") item.properties.text = "Shutdown";
        if (item.properties.completedText === "FIRED")
          item.properties.completedText = "Shutting Down...";
        if (String(item.properties.faceColor || "").toLowerCase() === "#203332")
          item.properties.faceColor = "#04aa8e";
      }
      definition.properties.forEach((property) => {
        if (
          !Object.prototype.hasOwnProperty.call(item.properties, property.key)
        )
          item.properties[property.key] = structuredClone(
            property.defaultValue,
          );
      });
      item.signalBindings = item.signalBindings || {};
      definition.signals.forEach((signal) => {
        if (
          !Object.prototype.hasOwnProperty.call(item.signalBindings, signal.key)
        )
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
        opacity: String(
          Math.max(0, Math.min(100, Number(item.graphicAssetOpacity ?? 100))) /
            100,
        ),
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
    const assetListProperty = definition?.itemSelector
      ? (definition.properties || []).find((prop) => prop.type === "asset-list")
      : null;
    if (assetListProperty) {
      const ids = String(item.properties?.[assetListProperty.key] || "").split(
        "|",
      );
      if (ids.some((id) => id)) {
        const root = el.querySelector(".scoped-preview"),
          style = document.createElement("style"),
          selector = definition.itemSelector,
          rules = ids
            .map((id, index) => {
              const asset = id && state.assets.find((entry) => entry.id === id);
              return asset
                ? `${selector}:nth-of-type(${index + 1}){background-image:url("${asset.dataUrl}")!important;background-repeat:no-repeat;background-position:center;background-size:contain}`
                : "";
            })
            .filter(Boolean)
            .join("");
        style.textContent = rules;
        root.appendChild(style);
      }
    }
    wireItemInteraction(el, item);
  }
  function renderPage() {
    refreshProjectFonts();
    ensureToastQueueItem();
    stage.innerHTML = "";
    const page = currentPage(),
      masterSubpage = state.subpages.find((entry) => entry.sourcePageId === page.id),
      masterBounds = masterSubpage ? subpageResolved(masterSubpage, page.id) : null,
      backgroundAsset = state.assets.find(
        (asset) => asset.id === page.backgroundAsset,
      );
    stage.style.width = `${masterBounds?.width || state.width}px`;
    stage.style.height = `${masterBounds?.height || state.height}px`;
    stage.classList.toggle("subpage-master-canvas", !!masterSubpage);
    stage.dataset.masterPlacement = masterSubpage?.placement || "";
    requestAnimationFrame(centerSubpageMasterCanvas);
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
    renderSubpageInstances();
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
      open.textContent = p.subpageMasterId ? `${p.name} [Subpage]` : p.name;
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
        .filter(
          (item) =>
            (item.pageId === state.activePage || item.master) &&
            !item.systemManaged,
        )
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
    const asset = state.assets.find((entry) => entry.id === assetId),
      fontFamily = asset && fontAssetFamily(asset);
    return (
      state.pages.filter((page) => page.backgroundAsset === assetId).length +
      state.items.filter(
        (item) =>
          item.assetId === assetId ||
          item.backgroundAsset === assetId ||
          item.graphicAsset === assetId ||
          item.selectedGraphicAsset === assetId ||
          Object.values(item.properties || {}).includes(assetId) ||
          (fontFamily && Object.values(item.properties || {}).includes(fontFamily)),
      ).length
    );
  }
  function fontAssetFamily(asset) {
    return asset
      ? `ComposerFont_${String(asset.id || "font").replace(/[^A-Za-z0-9_]/g, "_")}`
      : "";
  }
  function fontFaceCss(assets = state.assets) {
    return assets
      .filter((asset) => String(asset.type || "").includes("font"))
      .map((asset) => `@font-face{font-family:"${fontAssetFamily(asset)}";src:url("${asset.dataUrl}");font-display:swap}`)
      .join("\n");
  }
  function refreshProjectFonts() {
    let style = $("composer-project-fonts");
    if (!style) {
      style = document.createElement("style");
      style.id = "composer-project-fonts";
      document.head.appendChild(style);
    }
    style.textContent = fontFaceCss();
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
    refreshProjectFonts();
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
            if (item.properties)
              Object.keys(item.properties).forEach((key) => {
                if (item.properties[key] === fontAssetFamily(asset))
                  item.properties[key] = "";
              });
          });
          state.items = state.items.filter((item) => item.assetId !== asset.id);
          state.assets = state.assets.filter((entry) => entry.id !== asset.id);
          refreshProjectFonts();
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
        .filter(
          (item) => item.reusableId === definition.id && item.linkedInstanceId,
        )
        .map((item) => item.linkedInstanceId);
      if (!instanceIds.includes(definition.masterInstanceId))
        definition.masterInstanceId = instanceIds[0] || "";
    });
  }
  function isReusableMaster(item) {
    if (!item?.reusableId || !item.linkedInstanceId) return false;
    const definition = state.reusables.find(
      (entry) => entry.id === item.reusableId,
    );
    return (
      !!definition && definition.masterInstanceId === item.linkedInstanceId
    );
  }
  function synchronizeReusableMasters(forceDefinitionId = "") {
    ensureReusableMasters();
    state.reusables.forEach((definition) => {
      if (forceDefinitionId && definition.id !== forceDefinitionId) return;
      const masterItems = state.items.filter(
        (item) =>
          item.reusableId === definition.id &&
          item.linkedInstanceId === definition.masterInstanceId,
      );
      if (!masterItems.length) return;
      const snapshot = reusableSnapshot(masterItems),
        changed =
          forceDefinitionId === definition.id ||
          JSON.stringify(snapshot) !== JSON.stringify(definition.items || []);
      if (!changed) return;
      definition.items = snapshot;
      const instanceIds = [
        ...new Set(
          state.items
            .filter(
              (item) =>
                item.reusableId === definition.id &&
                item.linkedInstanceId !== definition.masterInstanceId,
            )
            .map((item) => item.linkedInstanceId),
        ),
      ];
      instanceIds.forEach((instanceId) => {
        const items = state.items.filter(
            (item) => item.linkedInstanceId === instanceId,
          ),
          left = Math.min(...items.map((item) => item.x)),
          top = Math.min(...items.map((item) => item.y));
        items.forEach((item) => {
          const source = snapshot.find(
            (entry) => entry.reusableKey === item.reusableKey,
          );
          if (!source) return;
          const overrideKeys = [...new Set(item.reusableOverrides || [])],
            overridden = Object.fromEntries(
              overrideKeys
                .filter((key) =>
                  Object.prototype.hasOwnProperty.call(
                    item.properties || {},
                    key,
                  ),
                )
                .map((key) => [key, structuredClone(item.properties[key])]),
            ),
            customBindings = !!item.reusableBindingsOverride,
            preservedBindings = customBindings
              ? structuredClone(item.signalBindings || {})
              : null,
            preservedSource =
              customBindings && !item.componentId ? item.source : null,
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
                  Object.entries(item.properties || {}).filter(([key]) =>
                    signalPropertyKeys.has(key),
                  ),
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
            item.properties = {
              ...item.properties,
              ...preservedSignalProperties,
            };
            if (!item.componentId) item.source = preservedSource;
          }
          renderItem(item);
        });
      });
    });
  }
  function makeReusableMaster(item) {
    if (!item?.reusableId || !item.linkedInstanceId) return;
    const definition = state.reusables.find(
      (entry) => entry.id === item.reusableId,
    );
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
        version: "1.0.0",
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
      version: "1.0.0",
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
  function subpageInstanceOverride(entry, pageId) {
    return entry?.instanceOverrides?.[pageId] || {};
  }
  function subpageResolved(entry, pageId) {
    const override = subpageInstanceOverride(entry, pageId), key = panelLayoutKey(),
      targetOverride = override.deviceOverrides?.[key] || entry.deviceOverrides?.[key] || {},
      baseWidth = Math.max(1, Number(entry.basePanelWidth) || state.width),
      baseHeight = Math.max(1, Number(entry.basePanelHeight) || state.height),
      scaleX = state.width / baseWidth, scaleY = state.height / baseHeight,
      responsiveFallback = key === (entry.basePanelKey || key) ? {} : {
        width: Math.round((Number(override.width ?? entry.width) || baseWidth) * scaleX),
        height: Math.round((Number(override.height ?? entry.height) || 100) * scaleY),
      };
    return {
      ...entry,
      ...override,
      ...responsiveFallback,
      ...targetOverride,
      width: Math.max(1, Number(targetOverride.width ?? responsiveFallback.width ?? override.width ?? entry.width) || state.width),
      height: Math.max(1, Number(targetOverride.height ?? responsiveFallback.height ?? override.height ?? entry.height) || 100),
      itemOverrides: override.itemOverrides || {},
    };
  }
  function subpageOffset(entry, pageId) {
    const resolved = subpageResolved(entry, pageId), width = resolved.width,
      height = resolved.height;
    if (Number.isFinite(Number(resolved.x)) && Number.isFinite(Number(resolved.y)))
      return { x: Number(resolved.x), y: Number(resolved.y) };
    if (resolved.placement === "bottom") return { x: 0, y: Math.max(0, state.height - height) };
    if (resolved.placement === "right") return { x: Math.max(0, state.width - width), y: 0 };
    if (resolved.placement === "overlay") return { x: Math.round((state.width - width) / 2), y: Math.round((state.height - height) / 2) };
    return { x: 0, y: 0 };
  }
  function subpageApplies(entry, pageId) {
    if (!entry || entry.sourcePageId === pageId) return false;
    const targetPage = state.pages.find((page) => page.id === pageId);
    // Subpage masters are intentionally isolated. Allowing another subpage to
    // render on a master creates an implicit nested/circular dependency that is
    // difficult to see in the editor and cannot be represented reliably in CCE.
    if (!targetPage || targetPage.subpageMasterId) return false;
    if ((entry.excludedPages || []).includes(pageId)) return false;
    return entry.includedPages?.length ? entry.includedPages.includes(pageId) : true;
  }

  function duplicateSubpage(entry) {
    const sourcePage = state.pages.find((page) => page.id === entry.sourcePageId);
    if (!sourcePage) return setStatus(`Cannot duplicate “${entry.name}”: its master page is missing.`);
    const id = uid("subpage-"), pageId = uid("page-"), name = `${entry.name} Copy`,
      page = structuredClone(sourcePage), itemIds = new Map();
    page.id = pageId; page.name = `${name} Master`; page.subpageMasterId = id;
    state.pages.push(page);
    const sources = state.items.filter((item) => item.pageId === sourcePage.id && !item.master);
    sources.forEach((source) => itemIds.set(source.id, uid("item-")));
    sources.forEach((source) => {
      const item = remapLibraryReferences(structuredClone(source), itemIds);
      item.id = itemIds.get(source.id); item.pageId = pageId; state.items.push(item);
    });
    state.subpages.push({ ...structuredClone(entry), id, name, sourcePageId: pageId,
      includedPages: [], excludedPages: [pageId], z: Math.max(1, ...state.subpages.map((item) => Number(item.z) || 9000)) + 1 });
    state.activePage = pageId; renderPage(); commitHistory(); setStatus(`Duplicated subpage “${entry.name}”`);
  }

  function materializeSubpageInstance(entry, pageId) {
    const resolved = subpageResolved(entry, pageId), offset = subpageOffset(entry, pageId),
      sources = state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master), idMap = new Map(), created = [];
    sources.forEach((source) => idMap.set(source.id, uid("item-")));
    sources.forEach((source) => {
      if (source.x >= resolved.width || source.y >= resolved.height) return;
      const item = remapLibraryReferences(structuredClone(source), idMap), itemOverride = resolved.itemOverrides?.[source.id] || {};
      item.id = idMap.get(source.id); item.pageId = pageId; item.master = false;
      item.x = source.x + offset.x; item.y = source.y + offset.y; item.z = (Number(resolved.z) || 9000) + (Number(source.z) || 0);
      item.properties = { ...(item.properties || {}), ...(itemOverride.properties || {}) };
      item.signalBindings = { ...(item.signalBindings || {}), ...(itemOverride.signalBindings || {}) };
      if (resolved.visibilityEnabled && item.componentId) {
        item.properties.visibilityEnabled = true;
        item.signalBindings.visibility = { mode: resolved.bindingMode || "contract", value: resolved.visibility || "" };
      }
      delete item.contractSourcePageId; delete item.subpageId; delete item.subpageBounds; delete item.subpagePageId;
      item.contractNamespace = resolved.contractNamespace || entry.contractNamespace || "";
      state.items.push(item); created.push(item);
    });
    entry.excludedPages = [...new Set([...(entry.excludedPages || []), pageId])];
    entry.includedPages = (entry.includedPages || []).filter((id) => id !== pageId);
    if (entry.instanceOverrides) delete entry.instanceOverrides[pageId];
    return created;
  }
  function detachSubpageInstance(entry, pageId) {
    if (!entry || !subpageApplies(entry, pageId)) return;
    const page = state.pages.find((candidate) => candidate.id === pageId), created = materializeSubpageInstance(entry, pageId);
    renderPage(); renderReusableLibrary(); commitHistory();
    setStatus(`Detached “${entry.name}” on ${page?.name || "page"} into ${created.length} independent widgets`);
  }
  function convertSubpageToNormalContent(entry) {
    if (!entry) return;
    const assignedPages = state.pages.filter((page) => subpageApplies(entry, page.id));
    if (!confirm(`Convert “${entry.name}” into independent normal widgets on all ${assignedPages.length} assigned page(s)? The linked master will be removed.`)) return;
    let count = 0; assignedPages.forEach((page) => { count += materializeSubpageInstance(entry, page.id).length; });
    state.items = state.items.filter((item) => item.pageId !== entry.sourcePageId);
    state.pages = state.pages.filter((page) => page.id !== entry.sourcePageId);
    state.subpages = state.subpages.filter((subpage) => subpage.id !== entry.id);
    if (!state.pages.some((page) => page.id === state.activePage)) state.activePage = state.pages.find((page) => !page.subpageMasterId)?.id || state.pages[0]?.id;
    renderPages(); renderPage(); renderReusableLibrary(); commitHistory(); setStatus(`Converted “${entry.name}” into ${count} normal widgets`);
  }
  function refactorSubpageNamespace(entry) {
    if (!entry) return;
    const oldNamespace = prompt("Existing contract namespace", entry.contractNamespace || contractPageInstance(entry.sourcePageId));
    if (!oldNamespace?.trim()) return;
    const nextNamespace = prompt("New contract namespace", oldNamespace.trim());
    if (!nextNamespace?.trim() || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(nextNamespace.trim())) return alert("Use a SIMPL-safe namespace beginning with a letter or underscore and containing only letters, numbers, and underscores.");
    const oldValue = oldNamespace.trim(), nextValue = nextNamespace.trim(), rewrite = (value) => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child)]));
      if (typeof value !== "string") return value;
      return value === oldValue ? nextValue : value.startsWith(`${oldValue}.`) || value.startsWith(`${oldValue}[`) ? nextValue + value.slice(oldValue.length) : value;
    };
    entry.visibility = rewrite(entry.visibility);
    entry.contractNamespace = nextValue;
    entry.instanceOverrides = rewrite(entry.instanceOverrides || {});
    state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master).forEach((item) => {
      item.properties = rewrite(item.properties || {}); item.signalBindings = rewrite(item.signalBindings || {}); item.actions = rewrite(item.actions || []);
    });
    renderPage(); renderReusableLibrary(); commitHistory(); setStatus(`Refactored “${entry.name}” contract namespace from ${oldValue} to ${nextValue}`);
  }

  function moveSubpageLayer(entry, direction) {
    const ordered = [...state.subpages].sort((a, b) => (Number(a.z) || 9000) - (Number(b.z) || 9000)),
      index = ordered.indexOf(entry), other = ordered[index + direction];
    if (!other) return setStatus(direction < 0 ? "Subpage is already at the back." : "Subpage is already at the front.");
    const currentZ = Number(entry.z) || 9000; entry.z = Number(other.z) || 9000; other.z = currentZ;
    renderPage(); renderReusableLibrary(); commitHistory();
    setStatus(`Moved “${entry.name}” ${direction < 0 ? "back" : "forward"}`);
  }
  function createSubpageFromCurrentPage(name, placement, width, height) {
    const page = currentPage();
    const subpageId = uid("subpage-");
    page.subpageMasterId = subpageId;
    state.subpages.push({
      id: subpageId, name, sourcePageId: page.id, placement, width, height,
      includedPages: [], excludedPages: [page.id], visibilityEnabled: false,
      bindingMode: "contract", bindingScope: "shared", visibility: `${name.replace(/[^A-Za-z0-9_]/g, "_")}.Visibility`, z: 9000, instanceOverrides: {}, deviceOverrides: {},
      basePanelKey: panelLayoutKey(), basePanelWidth: state.width, basePanelHeight: state.height,
    });
    renderPage(); commitHistory(); setStatus(`Created linked subpage “${name}”`);
  }
  function createBlankSubpage(name, placement, width, height) {
    const id = uid("subpage-"),
      page = {
        id: uid("page-"), name: `${name} Master`, background: currentPage()?.background || "#182126",
        bindingMode: "none", binding: "", transition: "none", transitionDuration: 350,
        subpageMasterId: id,
      };
    state.pages.push(page);
    state.subpages.push({
      id, name, sourcePageId: page.id, placement,
      width, height, includedPages: [], excludedPages: [page.id], visibilityEnabled: false,
      bindingMode: "contract", bindingScope: "shared", visibility: `${name.replace(/[^A-Za-z0-9_]/g, "_")}.Visibility`, z: 9000, instanceOverrides: {}, deviceOverrides: {},
      basePanelKey: panelLayoutKey(), basePanelWidth: state.width, basePanelHeight: state.height,
    });
    state.activePage = page.id;
    renderPage(); commitHistory(); setStatus(`Created blank subpage “${name}”`);
  }
  function selectedCreateSubpagePlacement() {
    return document.querySelector('input[name="create-subpage-placement"]:checked')?.value || "top";
  }
  function syncCreateSubpageDimensions(reset = false) {
    const placement = selectedCreateSubpagePlacement(), horizontal = placement === "top" || placement === "bottom",
      width = $("create-subpage-width"), height = $("create-subpage-height");
    width.disabled = horizontal; height.disabled = !horizontal;
    if (reset || horizontal) width.value = state.width;
    if (reset || !horizontal) height.value = state.height;
    if (reset) {
      if (horizontal) height.value = 100;
      else width.value = 100;
    }
  }
  function openCreateSubpage(mode) {
    creatingSubpageMode = mode;
    const fromCurrent = mode === "current", page = currentPage();
    $("create-subpage-description").textContent = fromCurrent
      ? `Use “${page.name}” as the linked subpage master.`
      : "Create a new blank linked master page.";
    $("create-subpage-name").value = fromCurrent && page.name !== "Home" ? page.name : "Header";
    document.querySelector('input[name="create-subpage-placement"][value="top"]').checked = true;
    syncCreateSubpageDimensions(true);
    $("create-subpage-dialog").showModal();
    $("create-subpage-name").select();
  }
  function confirmCreateSubpage(event) {
    const name = $("create-subpage-name").value.trim(), placement = selectedCreateSubpagePlacement(),
      horizontal = placement === "top" || placement === "bottom",
      width = horizontal ? state.width : Math.max(1, Number($("create-subpage-width").value) || 100),
      height = horizontal ? Math.max(1, Number($("create-subpage-height").value) || 100) : state.height;
    if (!name) { event.preventDefault(); return $("create-subpage-name").focus(); }
    if (creatingSubpageMode === "current") createSubpageFromCurrentPage(name, placement, width, height);
    else createBlankSubpage(name, placement, width, height);
  }
  function activeSubpagePropertyLayer(entry, create = false) {
    const pageId = $("subpage-property-page").value, targetKey = $("subpage-property-target").value;
    let container = entry;
    if (pageId) {
      entry.instanceOverrides ||= {};
      container = entry.instanceOverrides[pageId];
      if (!container && create) container = entry.instanceOverrides[pageId] = {};
      if (!container) container = {};
    }
    if (!targetKey) return { layer: container, container, pageId, targetKey };
    if (create) container.deviceOverrides ||= {};
    return { layer: container.deviceOverrides?.[targetKey] || (create ? container.deviceOverrides[targetKey] = {} : {}), container, pageId, targetKey };
  }
  function refreshSubpagePropertyFields() {
    const entry = state.subpages.find((subpage) => subpage.id === editingSubpagePropertiesId);
    if (!entry) return;
    const { layer, pageId, targetKey } = activeSubpagePropertyLayer(entry),
      base = pageId ? { ...entry, ...(entry.instanceOverrides?.[pageId] || {}) } : entry,
      effective = { ...base, ...layer };
    $("subpage-property-name").value = entry.name || "";
    $("subpage-property-name").disabled = !!pageId || !!targetKey;
    $("subpage-property-placement").value = effective.placement || "top";
    $("subpage-property-x").value = Number.isFinite(Number(layer.x ?? base.x)) ? Number(layer.x ?? base.x) : "";
    $("subpage-property-y").value = Number.isFinite(Number(layer.y ?? base.y)) ? Number(layer.y ?? base.y) : "";
    $("subpage-property-width").value = Math.max(1, Number(effective.width) || state.width);
    $("subpage-property-height").value = Math.max(1, Number(effective.height) || 100);
    $("subpage-property-z").value = Number(effective.z) || 9000;
    $("subpage-property-scope").value = effective.bindingScope === "per-page" ? "per-page" : "shared";
    $("subpage-property-visibility-enabled").checked = !!effective.visibilityEnabled;
    $("subpage-property-binding-mode").value = effective.bindingMode === "join" ? "join" : "contract";
    $("subpage-property-visibility").value = effective.visibility || "";
    const widgetHost = $("subpage-property-widget"), sources = state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master), previous = widgetHost.value;
    widgetHost.innerHTML = '<option value="">No widget override</option>';
    sources.forEach((item) => widgetHost.add(new Option(item.name, item.id)));
    widgetHost.value = sources.some((item) => item.id === previous) ? previous : "";
    $("subpage-widget-overrides").hidden = !pageId;
    refreshSubpageWidgetOverride();
  }
  function refreshSubpageWidgetOverride() {
    const entry = state.subpages.find((subpage) => subpage.id === editingSubpagePropertiesId), pageId = $("subpage-property-page").value,
      sourceId = $("subpage-property-widget").value, override = entry?.instanceOverrides?.[pageId]?.itemOverrides?.[sourceId] || {};
    $("subpage-property-widget-properties").value = JSON.stringify(override.properties || {}, null, 2);
    $("subpage-property-widget-signals").value = JSON.stringify(override.signalBindings || {}, null, 2);
    $("subpage-property-widget-properties").disabled = !sourceId;
    $("subpage-property-widget-signals").disabled = !sourceId;
  }
  function openSubpageProperties(entry) {
    editingSubpagePropertiesId = entry.id;
    const pageSelect = $("subpage-property-page"), targetSelect = $("subpage-property-target");
    pageSelect.innerHTML = '<option value="">Master defaults</option>';
    state.pages.filter((page) => subpageApplies(entry, page.id)).forEach((page) => pageSelect.add(new Option(`Instance: ${page.name}`, page.id)));
    targetSelect.innerHTML = '<option value="">Base layout</option>';
    deviceProfiles.filter((device) => device.id !== "custom").forEach((device) => targetSelect.add(new Option(`${device.name} — ${device.width}×${device.height}`, panelLayoutKey(device.id, device.width, device.height))));
    pageSelect.value = subpageApplies(entry, state.activePage) ? state.activePage : "";
    targetSelect.value = "";
    refreshSubpagePropertyFields(); $("subpage-properties-dialog").showModal();
  }
  function saveSubpageProperties(event) {
    const entry = state.subpages.find((subpage) => subpage.id === editingSubpagePropertiesId);
    if (!entry) return;
    try {
      const selection = activeSubpagePropertyLayer(entry, true), layer = selection.layer,
        optionalNumber = (id) => $(id).value.trim() === "" ? undefined : Number($(id).value);
      if (!selection.pageId && !selection.targetKey) entry.name = $("subpage-property-name").value.trim() || entry.name;
      Object.assign(layer, {
        placement: $("subpage-property-placement").value,
        width: Math.max(1, Number($("subpage-property-width").value) || 1),
        height: Math.max(1, Number($("subpage-property-height").value) || 1),
        z: Number($("subpage-property-z").value) || 9000,
        bindingScope: $("subpage-property-scope").value,
        visibilityEnabled: $("subpage-property-visibility-enabled").checked,
        bindingMode: $("subpage-property-binding-mode").value,
        visibility: $("subpage-property-visibility").value.trim(),
      });
      const x = optionalNumber("subpage-property-x"), y = optionalNumber("subpage-property-y");
      if (x == null) delete layer.x; else layer.x = x;
      if (y == null) delete layer.y; else layer.y = y;
      if (selection.targetKey) {
        const profile = deviceProfiles.find((device) => panelLayoutKey(device.id, device.width, device.height) === selection.targetKey);
        layer.panelWidth = profile?.width || state.width; layer.panelHeight = profile?.height || state.height;
      }
      const sourceId = $("subpage-property-widget").value;
      if (selection.pageId && sourceId) {
        const properties = JSON.parse($("subpage-property-widget-properties").value || "{}"),
          signalBindings = JSON.parse($("subpage-property-widget-signals").value || "{}");
        selection.container.itemOverrides ||= {};
        if (Object.keys(properties).length || Object.keys(signalBindings).length) selection.container.itemOverrides[sourceId] = { properties, signalBindings };
        else delete selection.container.itemOverrides[sourceId];
      }
      renderPage(); renderReusableLibrary(); commitHistory(); setStatus(`Updated subpage “${entry.name}” properties`);
    } catch (error) {
      event?.preventDefault(); alert(`Subpage properties were not saved.\n\n${error.message}`);
    }
  }
  function resetSubpagePropertyOverride() {
    const entry = state.subpages.find((subpage) => subpage.id === editingSubpagePropertiesId), pageId = $("subpage-property-page").value,
      targetKey = $("subpage-property-target").value;
    if (!entry || (!pageId && !targetKey)) return setStatus("Master defaults cannot be reset; edit their values instead.");
    const container = pageId ? entry.instanceOverrides?.[pageId] : entry;
    if (targetKey) { if (container?.deviceOverrides) delete container.deviceOverrides[targetKey]; }
    else if (pageId) delete entry.instanceOverrides[pageId];
    refreshSubpagePropertyFields(); renderPage(); renderReusableLibrary(); commitHistory(); setStatus("Reset subpage override to inherited master values");
  }
  function openSubpagePages(entry) {
    if (!entry) return;
    editingSubpagePagesId = entry.id;
    $("subpage-pages-title").textContent = `Pages showing “${entry.name}”`;
    const host = $("subpage-pages-list"),
      selected = new Set(entry.includedPages?.length
        ? entry.includedPages
        : state.pages.filter((page) => page.id !== entry.sourcePageId && !(entry.excludedPages || []).includes(page.id)).map((page) => page.id));
    host.innerHTML = "";
    state.pages.filter((page) => page.id !== entry.sourcePageId && !page.subpageMasterId).forEach((page) => {
      const label = document.createElement("label"), checkbox = document.createElement("input"), text = document.createElement("span");
      checkbox.type = "checkbox"; checkbox.value = page.id; checkbox.checked = selected.has(page.id);
      text.textContent = page.name; label.append(checkbox, text); host.appendChild(label);
    });
    if (!host.children.length) host.innerHTML = '<p class="hint">Create at least one normal page before assigning this subpage.</p>';
    $("subpage-pages-dialog").showModal();
  }
  function setSubpagePageChecks(mode) {
    $("subpage-pages-list").querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = mode === "all" ? true : mode === "none" ? false : !checkbox.checked;
    });
  }
  function saveSubpagePages() {
    const entry = state.subpages.find((subpage) => subpage.id === editingSubpagePagesId);
    if (!entry) return;
    const normalPages = state.pages.filter((page) => page.id !== entry.sourcePageId && !page.subpageMasterId),
      included = new Set([...$("subpage-pages-list").querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value));
    entry.includedPages = normalPages.filter((page) => included.has(page.id)).map((page) => page.id);
    entry.excludedPages = [entry.sourcePageId, ...normalPages.filter((page) => !included.has(page.id)).map((page) => page.id)];
    renderPage(); renderReusableLibrary(); commitHistory(); setStatus(`Updated pages for “${entry.name}”`);
  }
  function subpagePointerOp(event, entry, pageId, resize = false) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const key = `${entry.id}:${pageId}`, resolved = subpageResolved(entry, pageId), offset = subpageOffset(entry, pageId),
      targetKey = panelLayoutKey(), startX = event.clientX, startY = event.clientY,
      start = { x: offset.x, y: offset.y, width: resolved.width, height: resolved.height },
      surface = event.currentTarget.closest(".subpage-instance-surface"),
      children = [...stage.querySelectorAll(`[data-id^="subpage-instance-${entry.id}-${pageId}-"]`)];
    selectedSubpageInstanceKey = key;
    stage.querySelectorAll(".subpage-instance-surface").forEach((element) => element.classList.toggle("selected", element === surface));
    select(null);
    function move(moveEvent) {
      const dx = (moveEvent.clientX - startX) / panelZoom, dy = (moveEvent.clientY - startY) / panelZoom;
      if (resize) {
        surface.style.width = `${Math.max(20, snap(start.width + dx))}px`;
        surface.style.height = `${Math.max(20, snap(start.height + dy))}px`;
      } else {
        surface.style.left = `${snap(start.x + dx)}px`;
        surface.style.top = `${snap(start.y + dy)}px`;
        children.forEach((element) => { element.style.transform = `translate(${snap(dx)}px, ${snap(dy)}px)`; });
      }
    }
    function up(upEvent) {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up);
      entry.instanceOverrides ||= {}; const instance = entry.instanceOverrides[pageId] ||= {};
      instance.deviceOverrides ||= {}; const layer = instance.deviceOverrides[targetKey] ||= {};
      const dx = (upEvent.clientX - startX) / panelZoom, dy = (upEvent.clientY - startY) / panelZoom;
      layer.placement = "custom";
      if (resize) {
        layer.width = Math.max(20, snap(start.width + dx)); layer.height = Math.max(20, snap(start.height + dy));
        layer.x = start.x; layer.y = start.y;
      } else {
        layer.x = snap(start.x + dx); layer.y = snap(start.y + dy);
        layer.width = start.width; layer.height = start.height;
      }
      renderPage(); renderReusableLibrary(); commitHistory();
      setStatus(`${resize ? "Resized" : "Moved"} subpage “${entry.name}” for ${currentPage()?.name || "page"}`);
    }
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  }
  function renderSubpageInstances() {
    const pageId = state.activePage;
    state.subpages.filter((entry) => subpageApplies(entry, pageId)).forEach((entry) => {
      const resolved = subpageResolved(entry, pageId), offset = subpageOffset(entry, pageId), sourcePage = state.pages.find((page) => page.id === entry.sourcePageId),
        backgroundAsset = state.assets.find((asset) => asset.id === sourcePage?.backgroundAsset),
        surface = document.createElement("div");
      surface.className = "subpage-instance-surface";
      surface.dataset.subpage = entry.id;
      const editorKey = `${entry.id}:${pageId}`, editorHidden = hiddenSubpageInstances.has(editorKey);
      if (highlightedSubpageInstances.has(editorKey)) surface.classList.add("subpage-editor-highlight");
      if (selectedSubpageInstanceKey === editorKey) surface.classList.add("selected");
      if (editorHidden) surface.classList.add("subpage-editor-hidden");
      surface.dataset.subpagePage = pageId;
      surface.style.cssText = `position:absolute;left:${offset.x}px;top:${offset.y}px;width:${resolved.width}px;height:${resolved.height}px;overflow:hidden;pointer-events:auto;z-index:${(Number(resolved.z) || 9000) - 1};${editorHidden ? "background:rgba(241,189,55,.035);outline:1px dashed rgba(241,189,55,.5);" : `background-color:${sourcePage?.background || "transparent"};${backgroundAsset ? `background-image:url("${backgroundAsset.dataUrl}");background-size:${sourcePage?.backgroundAssetFit || "cover"};background-position:${Number(sourcePage?.backgroundAssetX ?? 50)}% ${Number(sourcePage?.backgroundAssetY ?? 50)}%;background-repeat:no-repeat;` : ""}`}`;
      surface.title = editorHidden ? `${entry.name} (hidden in editor — right-click to show)` : `${entry.name} linked subpage — right-click for options`;
      surface.oncontextmenu = (event) => showSubpageContextMenu(event, entry.id, pageId);
      surface.onpointerdown = (event) => {
        if (event.target.classList.contains("subpage-resize-handle")) return;
        subpagePointerOp(event, entry, pageId, false);
      };
      const resizeHandle = document.createElement("i");
      resizeHandle.className = "subpage-resize-handle";
      resizeHandle.title = "Resize subpage instance";
      resizeHandle.onpointerdown = (event) => subpagePointerOp(event, entry, pageId, true);
      surface.appendChild(resizeHandle);
      stage.appendChild(surface);
      if (editorHidden) return;
      state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master).forEach((source) => {
        if (source.x >= resolved.width || source.y >= resolved.height) return;
        const item = structuredClone(source);
        const itemOverride = resolved.itemOverrides?.[source.id] || {};
        item.properties = { ...(item.properties || {}), ...(itemOverride.properties || {}) };
        item.signalBindings = { ...(item.signalBindings || {}), ...(itemOverride.signalBindings || {}) };
        item.id = `subpage-instance-${entry.id}-${pageId}-${source.id}`;
        item.pageId = pageId; item.x = source.x + offset.x; item.y = source.y + offset.y;
        item.z = (Number(resolved.z) || 9000) + (Number(source.z) || 0);
        item.contractSourcePageId = resolved.bindingScope === "per-page" ? "" : entry.sourcePageId;
        item.contractNamespace = resolved.contractNamespace || entry.contractNamespace || "";
        if (resolved.visibilityEnabled && item.componentId) {
          item.properties = { ...(item.properties || {}), visibilityEnabled: true };
          item.signalBindings = { ...(item.signalBindings || {}), visibility: { mode: resolved.bindingMode || "contract", value: resolved.visibility || "" } };
        }
        renderItem(item);
        const element = stage.querySelector(`[data-id="${item.id}"]`);
        if (element) {
          const top = Math.max(0, offset.y - item.y), left = Math.max(0, offset.x - item.x),
            right = Math.max(0, item.x + item.w - (offset.x + resolved.width)), bottom = Math.max(0, item.y + item.h - (offset.y + resolved.height));
          element.classList.add("subpage-instance"); element.style.pointerEvents = "none";
          element.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
        }
      });
    });
    state.subpages.filter((entry) => entry.sourcePageId === pageId).forEach((entry) => {
      const resolved = subpageResolved(entry, pageId);
      const guide = document.createElement("div");
      guide.className = "subpage-master-guide";
      guide.style.cssText = `position:absolute;inset:0;border:2px dashed #f1bd37;pointer-events:none;z-index:999999;color:#f1bd37;font:700 14px Segoe UI;padding:4px`;
      guide.textContent = `SUBPAGE MASTER: ${entry.name} · ${resolved.width}×${resolved.height} · PLACED ${String(resolved.placement || "top").toUpperCase()}`; stage.appendChild(guide);
    });
  }
  function renderReusableLibrary() {
    const reusableHost = $("reusable-list"),
      templateHost = $("page-template-list"), subpageHost = $("subpage-list");
    if (!reusableHost || !templateHost || !subpageHost) return;
    reusableHost.innerHTML = "";
    templateHost.innerHTML = "";
    subpageHost.innerHTML = "";
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
          `v${entry.version || "1.0.0"} · ${entry.items.length} component${entry.items.length === 1 ? "" : "s"}`,
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
          `v${entry.version || "1.0.0"} · ${entry.items.length} component${entry.items.length === 1 ? "" : "s"}`,
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
    state.subpages.forEach((entry) => {
      const element = card(
        entry,
        `${entry.width}×${entry.height} · ${entry.placement} · ${entry.bindingScope || "shared"} bindings · ${entry.visibilityEnabled ? "visibility bound" : "local visibility"}`,
        () => { state.activePage = entry.sourcePageId; renderPage(); },
        () => { if (!confirm(`Delete subpage “${entry.name}”? The source page and its widgets will remain.`)) return; const sourcePage = state.pages.find((page) => page.id === entry.sourcePageId); if (sourcePage) delete sourcePage.subpageMasterId; state.subpages = state.subpages.filter((item) => item.id !== entry.id); renderPage(); commitHistory(); },
      );
      element.classList.add("subpage-design-card"); subpageHost.appendChild(element);
    });
    [...subpageHost.querySelectorAll(".design-card")].forEach((element, index) => {
      const entry = state.subpages[index], buttons = element.querySelector(".design-buttons"),
        pages = document.createElement("button"), configure = document.createElement("button"),
        duplicate = document.createElement("button"), exportButton = document.createElement("button"),
        back = document.createElement("button"), forward = document.createElement("button");
      pages.textContent = "Pages"; pages.onclick = () => openSubpagePages(entry);
      configure.textContent = "Properties"; configure.onclick = () => openSubpageProperties(entry);
      duplicate.textContent = "Duplicate"; duplicate.onclick = () => duplicateSubpage(entry);
      exportButton.textContent = "Export package"; exportButton.onclick = () => exportSubpagePackage(entry);
      back.textContent = "Send back"; back.onclick = () => moveSubpageLayer(entry, -1);
      forward.textContent = "Bring forward"; forward.onclick = () => moveSubpageLayer(entry, 1);
      buttons.append(pages, configure, duplicate, exportButton, back, forward);
      element.querySelector(".design-buttons button").textContent = "Edit master";
    });
    if (!state.reusables.length)
      reusableHost.innerHTML = '<p class="hint">No reusable designs.</p>';
    if (!state.pageTemplates.length)
      templateHost.innerHTML = '<p class="hint">No page templates.</p>';
    if (!state.subpages.length)
      subpageHost.innerHTML = '<p class="hint">No linked subpages.</p>';
  }
  function designLibraryPackage(name, version) {
    return {
      format: "crestron-ui-composer-library",
      schemaVersion: 1,
      name,
      version,
      exportedAt: new Date().toISOString(),
      content: {
        reusables: structuredClone(state.reusables),
        pageTemplates: structuredClone(state.pageTemplates),
        subpages: state.subpages.map((entry) => ({
          ...structuredClone(entry),
          masterPage: structuredClone(state.pages.find((page) => page.id === entry.sourcePageId) || null),
          masterItems: structuredClone(state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master)),
        })),
        customComponents: structuredClone(state.customComponents),
        themes: structuredClone(state.themes),
        assets: structuredClone(state.assets),
      },
    };
  }
  function exportSubpagePackage(entry) {
    const version = prompt("Subpage package version", "1.0.0");
    if (!version?.trim()) return;
    const packageValue = designLibraryPackage(`${entry.name} Subpage`, version.trim());
    packageValue.content.reusables = [];
    packageValue.content.pageTemplates = [];
    packageValue.content.subpages = packageValue.content.subpages.filter((subpage) => subpage.id === entry.id);
    const fileName = `${entry.name.replace(/[^A-Za-z0-9_-]+/g, "-") || "subpage"}-${version.trim().replace(/[^A-Za-z0-9_.-]+/g, "-")}.cuilibrary`;
    download(fileName, JSON.stringify(packageValue, null, 2), "application/json");
    setStatus(`Exported reusable subpage “${entry.name}” v${version.trim()}`);
  }
  function remapLibraryReferences(value, idMap) {
    if (Array.isArray(value))
      return value.map((entry) => remapLibraryReferences(entry, idMap));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          remapLibraryReferences(entry, idMap),
        ]),
      );
    return typeof value === "string" && idMap.has(value)
      ? idMap.get(value)
      : value;
  }
  function uniqueLibraryName(name, existing) {
    const used = new Set(existing.map((entry) => entry.name));
    if (!used.has(name)) return name;
    let number = 2;
    while (used.has(`${name} (Imported ${number})`)) number++;
    return `${name} (Imported ${number})`;
  }
  function importDesignLibrary(packageValue) {
    if (
      packageValue?.format !== "crestron-ui-composer-library" ||
      packageValue.schemaVersion !== 1 ||
      !packageValue.content ||
      !Array.isArray(packageValue.content.reusables) ||
      !Array.isArray(packageValue.content.pageTemplates) ||
      !Array.isArray(packageValue.content.customComponents) ||
      !Array.isArray(packageValue.content.assets)
    )
      throw new Error("This is not a valid Crestron UI Composer library.");
    const content = structuredClone(packageValue.content),
      idMap = new Map(),
      assetByData = new Map(state.assets.map((asset) => [asset.dataUrl, asset]));
    content.assets.forEach((asset) => {
      const matching = assetByData.get(asset.dataUrl);
      if (matching) {
        idMap.set(asset.id, matching.id);
        return;
      }
      const originalId = asset.id;
      if (state.assets.some((entry) => entry.id === asset.id))
        asset.id = uid("asset-");
      idMap.set(originalId, asset.id);
      state.assets.push(asset);
      assetByData.set(asset.dataUrl, asset);
    });
    content.customComponents.forEach((component) => {
      const originalId = component.id;
      if (
        state.customComponents.some((entry) => entry.id === component.id) ||
        state.components.some(
          (entry) => entry.componentId === component.id &&
            !state.customComponents.some((custom) => custom.id === component.id),
        )
      ) {
        component.id = `custom-${String(component.name || "component")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}-${uid().slice(-6)}`;
        component.name = uniqueLibraryName(component.name, state.customComponents);
      }
      idMap.set(originalId, component.id);
    });
    content.reusables.forEach((entry) => {
      const originalId = entry.id;
      if (state.reusables.some((existing) => existing.id === entry.id))
        entry.id = uid("reusable-");
      entry.name = uniqueLibraryName(entry.name, state.reusables);
      entry.version = entry.version || packageValue.version || "1.0.0";
      delete entry.masterInstanceId;
      idMap.set(originalId, entry.id);
    });
    content.pageTemplates.forEach((entry) => {
      if (state.pageTemplates.some((existing) => existing.id === entry.id))
        entry.id = uid("page-template-");
      entry.name = uniqueLibraryName(entry.name, state.pageTemplates);
      entry.version = entry.version || packageValue.version || "1.0.0";
    });
    const imported = remapLibraryReferences(content, idMap);
    imported.customComponents.forEach((component) => {
      state.customComponents.push(component);
      registerCustomComponent(component);
    });
    state.reusables.push(...imported.reusables);
    state.pageTemplates.push(...imported.pageTemplates);
    (imported.subpages || []).forEach((entry) => {
      if (!entry.masterPage) return;
      const oldPageId = entry.sourcePageId,
        page = { ...entry.masterPage, id: uid("page-"), name: uniqueLibraryName(entry.masterPage.name || entry.name, state.pages) },
        itemIdMap = new Map();
      state.pages.push(page);
      (entry.masterItems || []).forEach((source) => {
        itemIdMap.set(source.id, uid("item-"));
      });
      (entry.masterItems || []).forEach((source) => {
        const item = remapLibraryReferences(structuredClone(source), itemIdMap);
        item.id = itemIdMap.get(source.id); item.pageId = page.id; state.items.push(item);
      });
      delete entry.masterPage; delete entry.masterItems;
      entry.id = state.subpages.some((existing) => existing.id === entry.id) ? uid("subpage-") : entry.id;
      page.subpageMasterId = entry.id;
      entry.sourcePageId = page.id; entry.excludedPages = [page.id]; entry.includedPages = [];
      state.subpages.push(entry);
    });
    (imported.themes || []).forEach((theme) => {
      if (state.themes.some((entry) => entry.id === theme.id))
        theme.id = uid("theme-");
      theme.name = uniqueLibraryName(theme.name, state.themes);
      state.themes.push(theme);
    });
    renderAssets();
    renderComponentLibrary();
    renderReusableLibrary();
    renderThemes();
    commitHistory();
    return {
      reusables: imported.reusables.length,
      templates: imported.pageTemplates.length,
      components: imported.customComponents.length,
      assets: imported.assets.length,
      subpages: (imported.subpages || []).length,
    };
  }
  function currentTheme() {
    const tokenKeys = [
      "page",
      "surface",
      "accent",
      "text",
      "glow",
      "border",
      "font-size",
      "corner-radius",
      "glow-strength",
      "animation-duration",
      "animation-easing",
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
      animationDuration: Math.max(
        50,
        Number($("theme-animation-duration").value) || 300,
      ),
      animationEasing: $("theme-animation-easing").value,
      enabled: Object.fromEntries(
        tokenKeys.map((key) => [key, $("theme-" + key + "-enabled").checked]),
      ),
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
    [
      "page",
      "surface",
      "accent",
      "text",
      "glow",
      "border",
      ...Object.keys(extended),
    ].forEach((key) => {
      const legacyColor = [
        "page",
        "surface",
        "accent",
        "text",
        "glow",
        "border",
      ].includes(key);
      $("theme-" + key + "-enabled").checked =
        theme.enabled?.[key] ?? legacyColor;
    });
    setStatus(`Loaded theme “${theme.name || "palette"}”`);
  }
  function themeValueFor(key, theme) {
    const name = key.toLowerCase();
    if (!/color/.test(name)) return "";
    if (/glow/.test(name)) return theme.enabled.glow ? theme.glow : "";
    if (/border|outline/.test(name))
      return theme.enabled.border ? theme.border : "";
    if (/text|label|status|value/.test(name))
      return theme.enabled.text ? theme.text : "";
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
        if (
          theme.enabled["corner-radius"] &&
          /^(?:cornerRadius|borderRadius)$/i.test(key)
        )
          item.properties[key] = theme.cornerRadius;
        if (
          theme.enabled["glow-strength"] &&
          /^(?:glowStrength|glowSize)$/i.test(key)
        )
          item.properties[key] = theme.glowStrength;
      });
      if (theme.enabled["animation-duration"]) {
        item.interaction = {
          ...(item.interaction || {}),
          duration: theme.animationDuration,
        };
        (item.interactions || []).forEach(
          (track) => (track.duration = theme.animationDuration),
        );
      }
      if (theme.enabled["animation-easing"]) {
        item.interaction = {
          ...(item.interaction || {}),
          easing: theme.animationEasing,
        };
        (item.interactions || []).forEach(
          (track) => (track.easing = theme.animationEasing),
        );
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
        selected.componentId
          ? item.componentId === selected.componentId
          : !item.componentId && item.name === selected.name,
      );
    }
    if (scope === "page") {
      items = state.items.filter((item) =>
        itemVisibleOnPage(item, state.activePage),
      );
      if (theme.enabled.page) currentPage().background = theme.page;
    }
    if (scope === "project") {
      items = state.items;
      if (theme.enabled.page)
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
    state.subpages = state.subpages.filter((entry) => entry.sourcePageId !== id);
    state.subpages.forEach((entry) => {
      entry.includedPages = (entry.includedPages || []).filter((pageId) => pageId !== id);
      entry.excludedPages = (entry.excludedPages || []).filter((pageId) => pageId !== id);
    });
    state.pages = state.pages.filter((p) => p.id !== id);
    const fallbackPage = state.pages[0].id;
    state.items.forEach((item) => {
      if (item.pageId === id && item.master) item.pageId = fallbackPage;
      if (item.excludedPages?.includes(id))
        item.excludedPages = item.excludedPages.filter((pageId) => pageId !== id);
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
    const toastQueueItem = ensureToastQueueItem();
    $("toast-queue-page-enabled").checked = !(
      toastQueueItem.excludedPages || []
    ).includes(state.activePage);
  }
  function refreshTargets() {
    const target = $("prop-target"),
      value = current()?.targetPage || "";
    target.innerHTML = '<option value="">No page change</option>';
    state.pages.filter((p) => !p.subpageMasterId).forEach((p) => {
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
      $("system-component-banner").hidden = !item.systemManaged;
      $("prop-position-row").hidden = !!item.systemManaged;
      $("prop-size-row").hidden = !!item.systemManaged;
      $("prop-z-wrap").hidden = !!item.systemManaged;
      $("prop-name").value = item.name;
      $("prop-x").value = item.x;
      $("prop-y").value = item.y;
      $("prop-w").value = item.w;
      $("prop-h").value = item.h;
      $("prop-z").value = item.z;
      const isGlobalComponent = item.master === true && !item.systemManaged;
      $("prop-hide-on-page-wrap").hidden = !isGlobalComponent;
      if (isGlobalComponent)
        $("prop-hide-on-page").checked = (item.excludedPages || []).includes(
          state.activePage,
        );
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
    } else {
      $("prop-hide-on-page-wrap").hidden = true;
      renderSafeMarginGuide(null);
    }
    $("toast-queue-editor-badge").hidden = !(
      item &&
      !multiple &&
      item.systemManaged
    );
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
      left: margin + "px",
      top: margin + "px",
      width: Math.max(0, state.width - margin * 2) + "px",
      height: Math.max(0, state.height - margin * 2) + "px",
    });
    stage.appendChild(guide);
  }
  function renderResponsiveEditor(item) {
    const layout = layoutDefaults(item),
      key = panelLayoutKey();
    ["anchor-x", "anchor-y", "scale-mode", "safe-margin"].forEach((suffix) => {
      const property = {
          "anchor-x": "anchorX",
          "anchor-y": "anchorY",
          "scale-mode": "scaleMode",
          "safe-margin": "safeMargin",
        }[suffix],
        input = $("layout-" + suffix);
      input.value = layout[property];
      input.oninput = () => {
        layout[property] =
          property === "safeMargin"
            ? Math.max(0, Number(input.value) || 0)
            : input.value;
        if (property === "safeMargin") renderSafeMarginGuide(item);
        scheduleHistory();
      };
    });
    $("layout-override-status").textContent = item.deviceOverrides[key]
      ? `Saved override for ${key}`
      : `Using responsive rules for ${key}`;
    const widgetListTools = $("widget-list-responsive-tools"), isWidgetList = item.componentId === "widget-list";
    widgetListTools.hidden = !isWidgetList;
    if (isWidgetList) {
      const updateWidgetListSummary = () => {
        const visible = widgetListVisibleCount(item), total = Math.max(1, Number(item.properties?.defaultCount) || 1), minDimension = Math.min(Number(item.properties?.itemWidth) || 220, Number(item.properties?.itemHeight) || 120);
        $("widget-list-responsive-summary").textContent = `${visible} of ${total} item${total === 1 ? "" : "s"} visible without scrolling · ${minDimension < 44 ? "Warning: touch target below 44 px" : "Touch target size is acceptable"}`;
      };
      $("widget-list-fit-items").onclick = () => { fitWidgetListItems(item); renderItem(item); renderProperties(item); updateWidgetListSummary(); scheduleHistory(); setStatus(`Fitted “${item.name}” items to ${key}`); };
      $("widget-list-visible-count").onclick = () => { updateWidgetListSummary(); setStatus(`${widgetListVisibleCount(item)} Widget List items fit on ${key}`); };
      updateWidgetListSummary();
    }
    $("layout-save-override").onclick = () => {
      item.deviceOverrides[key] = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        panelWidth: state.width,
        panelHeight: state.height,
        widgetListProperties: widgetListResponsiveSnapshot(item),
      };
      renderResponsiveEditor(item);
      commitHistory();
      setStatus(`Saved “${item.name}” layout for ${key}`);
    };
    $("layout-reset-override").onclick = () => {
      delete item.deviceOverrides[key];
      renderResponsiveEditor(item);
      commitHistory();
      setStatus(`Reset “${item.name}” override for ${key}`);
    };
    function applyRules(scope) {
      const targets = state.items.filter(
        (entry) =>
          scope === "project" ||
          entry.master ||
          entry.pageId === state.activePage,
      );
      const label =
        scope === "project"
          ? "the entire project"
          : `page “${currentPage().name}”`;
      if (
        !confirm(
          `Apply these responsive rules to ${targets.length} widgets on ${label}?`,
        )
      )
        return;
      targets.forEach((entry) => {
        entry.layout = { ...layout };
      });
      renderSafeMarginGuide(item);
      commitHistory();
      setStatus(
        `Applied responsive rules to ${targets.length} widgets on ${label}`,
      );
    }
    $("layout-apply-page").onclick = () => applyRules("page");
    $("layout-apply-project").onclick = () => applyRules("project");
    renderSafeMarginGuide(item);
  }
  function responsiveComparisonTarget() {
    return deviceProfiles.find(
      (device) => device.id === $("responsive-compare-target").value,
    );
  }
  function renderResponsiveMiniPanel(host, device, target = false) {
    host.innerHTML = "";
    host.style.setProperty("--panel-aspect", device.width / device.height);
    host.style.background = currentPage().background || "#182126";
    const key = panelLayoutKey(device.id, device.width, device.height),
      from = { width: state.width, height: state.height };
    state.items
      .filter((item) => itemVisibleOnPage(item, state.activePage))
      .forEach((item) => {
        const saved = target ? item.deviceOverrides?.[key] : null,
          rect = target
            ? saved ||
              window.ComposerResponsiveLayout.adaptRect(
                item,
                from,
                { width: device.width, height: device.height },
                layoutDefaults(item),
              )
            : item,
          widget = document.createElement("div");
        widget.className = `responsive-mini-widget${target && !saved ? " missing-override" : ""}`;
        widget.title = `${item.name}${target && !saved ? " · calculated, not saved" : ""}`;
        widget.textContent = item.name;
        Object.assign(widget.style, {
          left: `${(Number(rect.x) / device.width) * 100}%`,
          top: `${(Number(rect.y) / device.height) * 100}%`,
          width: `${(Number(rect.w) / device.width) * 100}%`,
          height: `${(Number(rect.h) / device.height) * 100}%`,
          zIndex: Number(item.z) || 1,
        });
        host.appendChild(widget);
      });
  }
  function renderResponsiveComparison() {
    const target = responsiveComparisonTarget();
    if (!target) return;
    const current = selectedDevice(),
      key = panelLayoutKey(target.id, target.width, target.height),
      items = state.items.filter((item) =>
        itemVisibleOnPage(item, state.activePage),
      ),
      missing = items.filter((item) => !item.deviceOverrides?.[key]);
    $("responsive-current-title").textContent =
      `${current.name} · ${state.width} × ${state.height}`;
    $("responsive-target-title").textContent =
      `${target.name} · ${target.width} × ${target.height}`;
    $("responsive-compare-summary").textContent =
      `${currentPage().name}: ${items.length} visible widgets · ${missing.length} without saved ${target.name} overrides.`;
    $("responsive-save-adapted").disabled = !missing.length;
    $("responsive-copy-layout").disabled =
      $("responsive-copy-source").value === target.id;
    renderResponsiveMiniPanel(
      $("responsive-current-preview"),
      { ...current, width: state.width, height: state.height },
      false,
    );
    renderResponsiveMiniPanel($("responsive-target-preview"), target, true);
  }
  function openResponsiveComparison() {
    const select = $("responsive-compare-target"),
      sourceSelect = $("responsive-copy-source"),
      previous = select.value,
      previousSource = sourceSelect.value;
    select.innerHTML = "";
    sourceSelect.innerHTML = "";
    deviceProfiles
      .filter((device) => device.id !== "custom" && device.id !== state.targetDevice)
      .forEach((device) => {
        const option = document.createElement("option");
        option.value = device.id;
        option.textContent = `${device.name} — ${device.width} × ${device.height}`;
        select.appendChild(option);
      });
    deviceProfiles
      .filter((device) => device.id !== "custom")
      .forEach((device) => {
        const option = document.createElement("option"),
          key = panelLayoutKey(device.id, device.width, device.height),
          savedCount = state.items.filter(
            (item) => item.deviceOverrides?.[key],
          ).length;
        option.value = device.id;
        option.textContent = `${device.name}${device.id === state.targetDevice ? " (current)" : ` (${savedCount} saved)`}`;
        sourceSelect.appendChild(option);
      });
    if (previous && [...select.options].some((option) => option.value === previous))
      select.value = previous;
    sourceSelect.value =
      previousSource &&
      [...sourceSelect.options].some((option) => option.value === previousSource)
        ? previousSource
        : state.targetDevice;
    renderResponsiveComparison();
    $("responsive-compare-dialog").showModal();
  }
  function saveAdaptedResponsiveLayout() {
    const target = responsiveComparisonTarget();
    if (!target) return;
    const key = panelLayoutKey(target.id, target.width, target.height),
      from = { width: state.width, height: state.height },
      items = state.items.filter((item) =>
        itemVisibleOnPage(item, state.activePage),
      );
    items.forEach((item) => {
      if (item.deviceOverrides?.[key]) return;
      const rect = window.ComposerResponsiveLayout.adaptRect(
        item,
        from,
        { width: target.width, height: target.height },
        layoutDefaults(item),
      );
      item.deviceOverrides[key] = {
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        panelWidth: target.width,
        panelHeight: target.height,
        widgetListProperties: widgetListResponsiveSnapshot(item),
      };
    });
    commitHistory();
    renderResponsiveComparison();
    setStatus(`Saved adapted ${target.name} layout for ${items.length} widgets`);
  }
  function copyResponsiveLayoutToTarget() {
    const target = responsiveComparisonTarget(),
      source = deviceProfiles.find(
        (device) => device.id === $("responsive-copy-source").value,
      );
    if (!target || !source || target.id === source.id) {
      setStatus("Choose two different panel targets to copy a layout");
      return;
    }
    if (
      !confirm(
        `Copy the ${source.name} layout to ${target.name}? Existing ${target.name} overrides will be replaced for all ${state.items.length} widgets.`,
      )
    )
      return;
    const sourceKey = panelLayoutKey(source.id, source.width, source.height),
      targetKey = panelLayoutKey(target.id, target.width, target.height),
      currentKey = panelLayoutKey(),
      currentSize = { width: state.width, height: state.height };
    state.items.forEach((item) => {
      const sourceRect =
          sourceKey === currentKey
            ? item
            : item.deviceOverrides?.[sourceKey] ||
              window.ComposerResponsiveLayout.adaptRect(
                item,
                currentSize,
                { width: source.width, height: source.height },
                layoutDefaults(item),
              ),
        targetRect = window.ComposerResponsiveLayout.adaptRect(
          sourceRect,
          { width: source.width, height: source.height },
          { width: target.width, height: target.height },
          layoutDefaults(item),
        );
      item.deviceOverrides[targetKey] = {
        x: targetRect.x,
        y: targetRect.y,
        w: targetRect.w,
        h: targetRect.h,
        panelWidth: target.width,
        panelHeight: target.height,
        widgetListProperties: structuredClone(sourceRect.widgetListProperties || widgetListResponsiveSnapshot(item)),
      };
    });
    commitHistory();
    renderResponsiveComparison();
    setStatus(`Copied ${source.name} layout to ${target.name}`);
  }
  function responsiveBreakpointTargets(family, source) {
    return deviceProfiles.filter((device) => {
      if (
        device.id === "custom" ||
        device.supportsCh5 === false ||
        device.id === source.id
      )
        return false;
      if (family === "same-viewport")
        return device.width === source.width && device.height === source.height;
      if (family === "compact-touch")
        return device.width <= 1280 && device.height <= 800;
      if (family === "hd")
        return device.width > 1280 && device.width <= 1920 && device.height <= 1080;
      if (family === "large-display") return device.width > 1920;
      return false;
    });
  }
  function applyResponsiveBreakpointFamily() {
    const source = deviceProfiles.find(
        (device) => device.id === $("responsive-copy-source").value,
      ),
      family = $("responsive-breakpoint-family").value,
      targets = source ? responsiveBreakpointTargets(family, source) : [];
    if (!source || !targets.length) {
      setStatus("No other panel targets match that breakpoint family");
      return;
    }
    if (
      !confirm(
        `Apply the ${source.name} layout to ${targets.length} matching target${targets.length === 1 ? "" : "s"}? Existing overrides for ${targets.map((target) => target.name).join(", ")} will be replaced.`,
      )
    )
      return;
    const sourceKey = panelLayoutKey(source.id, source.width, source.height),
      currentKey = panelLayoutKey(),
      currentSize = { width: state.width, height: state.height };
    state.items.forEach((item) => {
      const sourceRect =
        sourceKey === currentKey
          ? item
          : item.deviceOverrides?.[sourceKey] ||
            window.ComposerResponsiveLayout.adaptRect(
              item,
              currentSize,
              { width: source.width, height: source.height },
              layoutDefaults(item),
            );
      targets.forEach((target) => {
        const key = panelLayoutKey(target.id, target.width, target.height),
          rect = window.ComposerResponsiveLayout.adaptRect(
            sourceRect,
            { width: source.width, height: source.height },
            { width: target.width, height: target.height },
            layoutDefaults(item),
          );
        item.deviceOverrides[key] = {
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          panelWidth: target.width,
          panelHeight: target.height,
          widgetListProperties: structuredClone(sourceRect.widgetListProperties || widgetListResponsiveSnapshot(item)),
        };
      });
    });
    commitHistory();
    renderResponsiveComparison();
    validateAllResponsiveTargets();
    setStatus(
      `Applied ${source.name} layout to ${targets.length} ${family.replaceAll("-", " ")} targets`,
    );
  }
  function responsiveTargetReport(device) {
    const key = panelLayoutKey(device.id, device.width, device.height),
      currentKey = panelLayoutKey(),
      from = { width: state.width, height: state.height };
    let missing = 0,
      offCanvas = 0,
      clippedLists = 0,
      smallTargets = 0;
    state.items.forEach((item) => {
      const saved = key === currentKey ? item : item.deviceOverrides?.[key],
        rect =
          saved ||
          window.ComposerResponsiveLayout.adaptRect(
            item,
            from,
            { width: device.width, height: device.height },
            layoutDefaults(item),
          );
      if (!saved) missing++;
      if (
        !Number.isFinite(Number(rect.x)) ||
        !Number.isFinite(Number(rect.y)) ||
        !Number.isFinite(Number(rect.w)) ||
        !Number.isFinite(Number(rect.h)) ||
        Number(rect.x) < 0 ||
        Number(rect.y) < 0 ||
        Number(rect.x) + Number(rect.w) > device.width ||
        Number(rect.y) + Number(rect.h) > device.height
      )
        offCanvas++;
      if (item.componentId === "widget-list") {
        const original = item.properties, responsiveProperties = saved?.widgetListProperties || original;
        item.properties = responsiveProperties;
        const visible = widgetListVisibleCount(item, rect), total = Math.max(1, Number(responsiveProperties?.defaultCount) || 1), horizontal = responsiveProperties?.orientation !== "vertical",
          dimension = Number(horizontal ? responsiveProperties?.itemWidth : responsiveProperties?.itemHeight) || (horizontal ? 220 : 120);
        if (visible < total) clippedLists++;
        if (dimension < 44) smallTargets++;
        item.properties = original;
      }
    });
    return { device, key, missing, offCanvas, clippedLists, smallTargets };
  }
  function validateAllResponsiveTargets() {
    const host = $("responsive-validation-results"),
      reports = deviceProfiles
        .filter((device) => device.id !== "custom" && device.supportsCh5 !== false)
        .map(responsiveTargetReport);
    host.innerHTML = "";
    reports.forEach((report) => {
      const row = document.createElement("div");
      row.className = `responsive-validation-row${report.missing || report.offCanvas || report.clippedLists || report.smallTargets ? " problem" : ""}`;
      row.innerHTML = `<strong>${report.device.name}</strong><span>${report.missing} missing overrides</span><span>${report.offCanvas} off canvas</span><span>${report.clippedLists} scrolling lists</span><span>${report.smallTargets} undersized list targets</span>`;
      host.appendChild(row);
    });
    const problems = reports.reduce(
      (total, report) => total + report.missing + report.offCanvas + report.clippedLists + report.smallTargets,
      0,
    );
    setStatus(
      problems
        ? `Responsive validation found ${problems} target-layout issue${problems === 1 ? "" : "s"}`
        : "All responsive targets have saved, in-bounds layouts",
    );
    return reports;
  }
  function fitAndSaveAllResponsiveTargets() {
    const targets = deviceProfiles.filter(
      (device) => device.id !== "custom" && device.supportsCh5 !== false,
    );
    if (
      !confirm(
        `Create or update responsive overrides for ${state.items.length} widgets across ${targets.length} panel targets? Existing overrides will only be adjusted when they are outside the target panel.`,
      )
    )
      return;
    const from = { width: state.width, height: state.height },
      currentKey = panelLayoutKey();
    targets.forEach((device) => {
      const key = panelLayoutKey(device.id, device.width, device.height);
      state.items.forEach((item) => {
        const layout = layoutDefaults(item),
          margin = Math.max(0, Number(layout.safeMargin) || 0),
          availableWidth = Math.max(20, device.width - margin * 2),
          availableHeight = Math.max(20, device.height - margin * 2),
          existing = key === currentKey ? item : item.deviceOverrides?.[key],
          adapted =
            existing ||
            window.ComposerResponsiveLayout.adaptRect(
              item,
              from,
              { width: device.width, height: device.height },
              layout,
            ),
          width = Math.max(20, Math.min(Number(adapted.w) || 20, availableWidth)),
          height = Math.max(20, Math.min(Number(adapted.h) || 20, availableHeight)),
          x = Math.max(
            margin,
            Math.min(Number(adapted.x) || margin, device.width - margin - width),
          ),
          y = Math.max(
            margin,
            Math.min(Number(adapted.y) || margin, device.height - margin - height),
          );
        item.deviceOverrides[key] = {
          x,
          y,
          w: width,
          h: height,
          panelWidth: device.width,
          panelHeight: device.height,
          widgetListProperties: (() => {
            if (item.componentId !== "widget-list") return null;
            const snapshot = widgetListResponsiveSnapshot(item), original = item.properties;
            item.properties = { ...(item.properties || {}), ...(existing?.widgetListProperties || snapshot || {}) };
            fitWidgetListItems(item, { w: width, h: height });
            const fitted = widgetListResponsiveSnapshot(item);
            item.properties = original;
            return fitted;
          })(),
        };
        if (key === currentKey) {
          Object.assign(item, { x, y, w: width, h: height });
          applyWidgetListResponsiveSnapshot(item, item.deviceOverrides[key].widgetListProperties);
        }
      });
    });
    commitHistory();
    renderPage();
    renderResponsiveComparison();
    validateAllResponsiveTargets();
    setStatus(`Fitted and saved ${targets.length} responsive panel layouts`);
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
      pressEffect: "none",
      effectColor: "#04dcb9",
      effectDuration: 650,
      effectSize: 125,
    };
    const interaction = {
      ...defaults,
      ...(item.interactions?.[0] || item.interaction || {}),
    };
    [
      "trigger",
      "preset",
      "direction",
      "duration",
      "delay",
      "easing",
      "pressEffect",
      "effectColor",
      "effectDuration",
      "effectSize",
    ].forEach((key) => {
      const input = $("interaction-" + key);
      input.value = interaction[key];
      input.oninput = () => {
        interaction[key] = /duration|delay|effectSize/i.test(key)
          ? Number(input.value)
          : input.value;
        item.interaction = { ...interaction };
        if (item.interactions?.length)
          item.interactions[0] = {
            ...item.interactions[0],
            ...interaction,
            start: Number(interaction.delay) || 0,
          };
        $("interaction-direction-label").hidden =
          interaction.preset !== "slide";
        $("interaction-press-effect-options").hidden =
          interaction.pressEffect === "none";
        $("interaction-effect-color-label").hidden = [
          "particle-burst",
          "shake",
        ].includes(interaction.pressEffect);
        scheduleHistory();
      };
    });
    $("interaction-direction-label").hidden = interaction.preset !== "slide";
    $("interaction-press-effect-options").hidden =
      interaction.pressEffect === "none";
    $("interaction-effect-color-label").hidden = [
      "particle-burst",
      "shake",
    ].includes(interaction.pressEffect);
    $("interaction-preview").onclick = () => {
      playItemInteraction(item, false, interaction);
      playPressEffect(
        stage.querySelector(`.widget[data-id="${item.id}"]`),
        interaction,
      );
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
          ["shake", "Shake"],
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
      declaredProperties = (definition && definition.properties) || [],
      dynamicProperties = definition && typeof definition.inspectorProperties === "function"
        ? definition.inspectorProperties(item.properties || {}, window.ComposerRuntime) || []
        : [],
      properties = [...declaredProperties, ...dynamicProperties].filter(
        (property) => {
          if (property.signalSetting || property.key === "bindingMode")
            return false;
          if (!property.visibleWhen) return true;
          const raw = item.properties?.[property.visibleWhen.key];
          if (property.visibleWhen.equals != null)
            return String(raw ?? "") === String(property.visibleWhen.equals);
          const actual = Number(raw ?? 0);
          return (
            property.visibleWhen.gte == null ||
            actual >= Number(property.visibleWhen.gte)
          );
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
    if (item.componentId === "widget-list") {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "wide";
      reset.textContent = "Reset included widget settings";
      reset.onclick = () => {
        item.properties ||= {};
        Object.keys(item.properties).filter(key => key.startsWith("includedWidget__") || key.startsWith("includedRange__") || key.startsWith("includedRangeIncrement__") || key.startsWith("includedGraphic") || key.startsWith("includedInteraction") || key === "includedPressEffect" || key === "includedAnimation" || key === "includedEffectColor" || key === "includedEntryAnimation" || key === "includedStaggerDelay" || key === "includedHoldDuration" || key === "includedNavigationTrigger" || key === "includedNavigationTarget" || key === "includedMaxEffects").forEach(key => delete item.properties[key]);
        (definition.properties || []).filter(property => property.key.startsWith("included")).forEach(property => item.properties[property.key] = structuredClone(property.defaultValue));
        renderItem(item); renderProperties(item); renderBindings(item); commitHistory();
        setStatus(`Reset shared settings for “${item.name}”`);
      };
      host.appendChild(reset);
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
      override.append(
        checkbox,
        document.createTextNode("Override for this instance"),
      );
      checkbox.onchange = () => {
        if (checkbox.checked) keys.add(property.key);
        else {
          keys.delete(property.key);
          const source = (reusableDefinition.items || []).find(
            (entry) => entry.reusableKey === item.reusableKey,
          );
          if (
            source?.properties &&
            Object.prototype.hasOwnProperty.call(
              source.properties,
              property.key,
            )
          )
            item.properties[property.key] = structuredClone(
              source.properties[property.key],
            );
        }
        item.reusableOverrides = [...keys];
        renderItem(item);
        renderProperties(item);
        scheduleHistory();
      };
      label.appendChild(override);
    }
    let propertyGroup = "",
      propertyHost = host;
    properties.forEach((property) => {
      if (property.disabledWhen) {
        const actual =
          item.properties?.[property.disabledWhen.key] ??
          properties.find((entry) => entry.key === property.disabledWhen.key)
            ?.defaultValue;
        const expected = property.disabledWhen.value;
        if (
          (expected === true &&
            (actual === true ||
              actual === 1 ||
              actual === "1" ||
              String(actual).toLowerCase() === "true")) ||
          actual === expected
        )
          return;
      }
      if (property.group && property.group !== propertyGroup) {
        const details = document.createElement("details"),
          heading = document.createElement("summary"),
          body = document.createElement("div"),
          storageKey = `crestron-ui-composer-property-group-${item.componentId}-${property.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          saved = localStorage.getItem(storageKey);
        details.className = "component-property-group";
        heading.textContent = property.group;
        body.className = "component-property-group-body";
        details.open =
          saved === null ? property.group === "Mode 0" : saved === "open";
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
        editor.value = String(
          item.properties?.[property.key] ?? property.defaultValue ?? "",
        );
        actions.className = "cip-text-actions";
        function update(value) {
          item.properties = item.properties || {};
          item.properties[property.key] = value;
          renderItem(item);
          scheduleHistory();
        }
        function insertTag(type) {
          const address = prompt(
            `${type} contract name or join number:`,
            type === "Serial"
              ? "TextBlock.Status.Name"
              : type === "Digital"
                ? "TextBlock.State.Selected"
                : "TextBlock.Level.Feedback",
          );
          if (!address) return;
          let tag;
          if (type === "Digital") {
            const whenTrue = prompt("Text when true:", "On") ?? "On",
              whenFalse = prompt("Text when false:", "Off") ?? "Off";
            tag = `<cipd>${address}?${whenTrue}:${whenFalse}</cipd>`;
          } else if (type === "Analog") {
            const format =
              prompt(
                "Analog format (%r raw, %x hex, %t time, %65535.0p percent):",
                "%r",
              ) || "%r";
            tag = `<cipa>${address}?${format}</cipa>`;
          } else {
            const fallback =
              prompt("Design-time/default text:", "Unknown") ?? "";
            tag = `<cips>${address}:${fallback}</cips>`;
          }
          const start = editor.selectionStart,
            end = editor.selectionEnd;
          editor.value =
            editor.value.slice(0, start) + tag + editor.value.slice(end);
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
        wireReusableOverride(
          label,
          [...list.querySelectorAll("input")],
          property,
        );
        label.appendChild(list);
        propertyHost.appendChild(label);
        return;
      }
      if (property.type === "select-list") {
        const list = document.createElement("div"),
          count = Math.max(
            1,
            Math.min(48, Number(item.properties?.[property.countKey]) || 1),
          ),
          values = String(
            item.properties?.[property.key] ?? property.defaultValue ?? "",
          ).split("|");
        list.className = "property-text-list";
        for (let i = 0; i < count; i++) {
          const select = document.createElement("select");
          (property.options || []).forEach((option) => {
            const element = document.createElement("option");
            element.value = option.value;
            element.textContent = `${property.itemName || "Item"} ${i + 1}: ${option.label}`;
            select.appendChild(element);
          });
          select.value = values[i] ?? property.defaultItemValue ?? "";
          select.onchange = () => {
            values[i] = select.value;
            item.properties = item.properties || {};
            item.properties[property.key] = values.join("|");
            renderItem(item);
          };
          list.appendChild(select);
        }
        wireReusableOverride(
          label,
          [...list.querySelectorAll("select")],
          property,
        );
        label.appendChild(list);
        propertyHost.appendChild(label);
        return;
      }
      if (property.type === "asset-list") {
        const list = document.createElement("div"),
          count = Math.max(
            1,
            Math.min(48, Number(item.properties?.[property.countKey]) || 1),
          ),
          values = String(
            item.properties?.[property.key] ?? property.defaultValue ?? "",
          ).split("|"),
          images = state.assets.filter((asset) =>
            asset.type.startsWith("image/"),
          );
        list.className = "property-text-list";
        for (let i = 0; i < count; i++) {
          const select = document.createElement("select"),
            empty = document.createElement("option");
          empty.value = "";
          empty.textContent = `${property.itemName || "Item"} ${i + 1}: None`;
          select.appendChild(empty);
          images.forEach((asset) => {
            const option = document.createElement("option");
            option.value = asset.id;
            option.textContent = `${property.itemName || "Item"} ${i + 1}: ${asset.name}`;
            select.appendChild(option);
          });
          select.value = values[i] ?? "";
          select.onchange = () => {
            values[i] = select.value;
            item.properties = item.properties || {};
            item.properties[property.key] = values.join("|");
            renderItem(item);
          };
          list.appendChild(select);
        }
        wireReusableOverride(
          label,
          [...list.querySelectorAll("select")],
          property,
        );
        label.appendChild(list);
        propertyHost.appendChild(label);
        return;
      }
      const input = document.createElement(
        property.type === "select" || property.type === "asset" || property.type === "font"
          ? "select"
          : "input",
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
      } else if (property.type === "font") {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Default (Segoe UI)";
        input.appendChild(empty);
        state.assets
          .filter((asset) => String(asset.type || "").includes("font"))
          .forEach((asset) => {
            const option = document.createElement("option");
            option.value = fontAssetFamily(asset);
            option.textContent = asset.name.replace(/\.(?:woff2?|ttf|otf)$/i, "");
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
        (item.properties && item.properties[property.key]) ??
        property.defaultValue ??
        "";
      if (property.type === "checkbox")
        input.checked =
          propertyValue === true ||
          propertyValue === 1 ||
          propertyValue === "1" ||
          String(propertyValue).toLowerCase() === "true";
      else input.value = propertyValue;
      if (property.type === "asset" || property.type === "font") {
        const selectedAsset = state.assets.find(
          (asset) => property.type === "font"
            ? fontAssetFamily(asset) === propertyValue
            : asset.id === propertyValue,
        );
        item.properties[`${property.key}Data`] = selectedAsset?.dataUrl || "";
      }
      input.oninput = () => {
        item.properties = item.properties || {};
        const previousValue = item.properties[property.key];
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
        if (item.componentId === "widget-list" && property.key === "widgetType" && previousValue !== nextValue)
          Object.keys(item.properties).filter(key => key.startsWith("includedWidget__") || key.startsWith("includedRange__") || key.startsWith("includedRangeIncrement__")).forEach(key => delete item.properties[key]);
        if (property.type === "asset" || property.type === "font") {
          const selectedAsset = state.assets.find(
            (asset) => property.type === "font"
              ? fontAssetFamily(asset) === nextValue
              : asset.id === nextValue,
          );
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
      imageAssets = state.assets.filter((asset) =>
        asset.type.startsWith("image/"),
      );
    select.innerHTML = '<option value="">None</option>';
    selectedSelect.innerHTML = '<option value="">None</option>';
    imageAssets.forEach((asset) => {
      const option = document.createElement("option");
      option.value = asset.id;
      option.textContent = asset.name;
      select.appendChild(option);
      selectedSelect.appendChild(option.cloneNode(true));
    });
    const selectedSameAsStandard =
      item.properties?.selectedSameAsStandard == null ||
      item.properties?.selectedSameAsStandard === true ||
      item.properties?.selectedSameAsStandard === 1 ||
      item.properties?.selectedSameAsStandard === "1" ||
      String(item.properties?.selectedSameAsStandard).toLowerCase() === "true";
    select.value = item.graphicAsset || "";
    selectedSelect.value = selectedSameAsStandard
      ? item.graphicAsset || ""
      : item.selectedGraphicAsset || "";
    selectedSelect.disabled = selectedSameAsStandard;
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
  function resolvedRangeBindings(definition, item) {
    if (!definition) return [];
    const dynamic = typeof definition.dynamicRangeBindings === "function"
      ? definition.dynamicRangeBindings(item?.properties || {}, window.ComposerRuntime) || []
      : null;
    if (!dynamic) return definition.rangeBindings || [];
    const visibility = (definition.rangeBindings || []).filter(range => range.visibilitySelector);
    return [...dynamic, ...visibility];
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
    resolvedRangeBindings(definition, item).forEach((entry) => {
      if (typeof item.properties?.[entry.baseKey] === "string")
        item.properties[entry.baseKey] = rebase(item.properties[entry.baseKey]);
    });
  }
  function contractWidgetPrefix(item) {
    return `${item?.contractNamespace ? simplIdentifier(item.contractNamespace) : contractPageInstance(item?.master ? "" : item?.pageId)}.${contractWidgetInstance(item)}`;
  }
  function parseCipTextSignals(text) {
    const signals = [],
      pattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi;
    let match;
    while ((match = pattern.exec(String(text || "")))) {
      const kind = match[1].toLowerCase(),
        content = match[2].trim(),
        delimiter = kind === "s" ? content.indexOf(":") : content.indexOf("?"),
        value = (delimiter >= 0 ? content.slice(0, delimiter) : content).trim();
      if (value)
        signals.push({
          type: kind === "s" ? "serial" : kind === "d" ? "digital" : "analog",
          value,
        });
    }
    return signals;
  }
  function collectProjectSignals() {
    const rows = [];
    (state.subpages || []).filter((entry) => entry.visibilityEnabled && entry.visibility).forEach((entry) => rows.push({
      page: "Global", widget: `Subpage: ${entry.name}`, name: "Visibility",
      type: "digital", direction: "input", mode: entry.bindingMode || "contract", value: entry.visibility,
      setMode(mode) { entry.bindingMode = mode; }, setValue(value) { entry.visibility = value; },
    }));
    (state.subpages || []).forEach((entry) => Object.entries(entry.instanceOverrides || {}).forEach(([pageId, override]) => {
      if (!override.visibilityEnabled || !override.visibility) return;
      const page = state.pages.find((candidate) => candidate.id === pageId);
      rows.push({
        page: page?.name || "Missing page", widget: `Subpage: ${entry.name}`, name: "Visibility override",
        type: "digital", direction: "input", mode: override.bindingMode || entry.bindingMode || "contract", value: override.visibility,
        setMode(mode) { override.bindingMode = mode; }, setValue(value) { override.visibility = value; },
      });
    }));
    state.pages.forEach((page) => {
      if (page.subpageMasterId) return;
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
    const virtualEntries = (state.subpages || []).filter((entry) => entry.bindingScope === "per-page" || Object.values(entry.instanceOverrides || {}).some((override) => override.bindingScope === "per-page" || Object.keys(override.itemOverrides || {}).length)),
      virtualSourceIds = new Set(virtualEntries.map((entry) => entry.sourcePageId)),
      signalItems = state.items.filter((item) => !virtualSourceIds.has(item.pageId));
    virtualEntries.forEach((entry) => {
      const sources = state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master);
      state.pages.filter((page) => subpageApplies(entry, page.id)).forEach((page) => sources.forEach((source) => {
        const clone = structuredClone(source), override = entry.instanceOverrides?.[page.id] || {}, itemOverride = override.itemOverrides?.[source.id] || {};
        clone.id = `subpage-signal-${entry.id}-${page.id}-${source.id}`; clone.pageId = page.id;
        clone.properties = { ...(clone.properties || {}), ...(itemOverride.properties || {}) };
        clone.signalBindings = { ...(clone.signalBindings || {}), ...(itemOverride.signalBindings || {}) };
        if ((override.bindingScope || entry.bindingScope) !== "per-page") clone.contractSourcePageId = entry.sourcePageId;
        clone.contractNamespace = override.contractNamespace || entry.contractNamespace || "";
        signalItems.push(clone);
      }));
    });
    signalItems.forEach((item) => {
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
        resolvedRangeBindings(definition, item).forEach((range) => {
          if (range.optionalProperty && !item.properties?.[range.optionalProperty]) return;
          rows.push({
            page,
            widget: item.name,
            name: range.name,
            type: range.type,
            direction: range.direction,
            mode: overall,
            value: String(item.properties[range.baseKey] || range.defaultValue || ""),
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
          });
        });
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
      $("project-search-summary").textContent =
        "Type a value to search the entire project. Exact join numbers and full contract names are supported.";
      host.innerHTML =
        '<p class="hint" style="padding:14px">Tip: paste a contract name or join number here to answer “Where is this signal used?”</p>';
      return;
    }
    state.pages.forEach((page) => {
      const fields = [
        page.name,
        page.id,
        page.bindingMode,
        page.binding,
        page.background,
      ];
      if (
        fields.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(needle),
        )
      )
        results.push({
          kind: "Page",
          title: page.name,
          detail: page.binding
            ? `${page.bindingMode}: ${page.binding}`
            : "Page definition",
          pageId: page.id,
        });
    });
    state.items.forEach((item) => {
      const page = state.pages.find((entry) => entry.id === item.pageId),
        definition = item.componentId
          ? window.ComposerRuntime.get(item.componentId)
          : null,
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
          .filter(([, value]) =>
            String(value || "")
              .toLowerCase()
              .includes(needle),
          )
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
      const haystack = [
        signal.value,
        signal.name,
        signal.widget,
        signal.page,
        signal.type,
        signal.direction,
        signal.mode,
      ].map((value) => String(value || "").toLowerCase());
      if (!haystack.some((value) => value.includes(needle))) return;
      const item = signal.itemId
          ? state.items.find((entry) => entry.id === signal.itemId)
          : null,
        page = item
          ? state.pages.find((entry) => entry.id === item.pageId)
          : state.pages.find((entry) => entry.name === signal.page);
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
    $("project-search-summary").textContent =
      `${results.length} result${results.length === 1 ? "" : "s"}${results.length > 500 ? " · showing first 500" : ""} for “${query}”.`;
    if (!results.length)
      host.innerHTML =
        '<p class="hint" style="padding:14px">No pages, widgets, text, joins, contracts, or signal uses matched.</p>';
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
    $("signal-view-table").classList.toggle("active", signalViewMode === "table");
    $("signal-view-map").classList.toggle("active", signalViewMode === "map");
    $("signal-view-address").classList.toggle(
      "active",
      signalViewMode === "address",
    );
    $("signal-view-simpl").classList.toggle("active", signalViewMode === "simpl");
    document.querySelector(".signal-table-wrap").hidden = signalViewMode !== "table";
    $("signal-map").hidden = signalViewMode !== "map";
    $("signal-address-map").hidden = signalViewMode !== "address";
    $("signal-simpl-preview").hidden = signalViewMode !== "simpl";
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
    renderSignalMap(shown, counts);
    renderSignalAddressMap(shown);
    renderSimplPreview();
  }
  function currentContractComparisonSignals() {
    return expandedContractSignals().map((row) => {
      const shape = contractSignalShape(row);
      return {
        path: `${shape.instancePath}.${standardContractAttribute(row.type, row.direction, shape.attributePath)}`,
        type: row.type,
        direction: row.direction,
      };
    });
  }
  function cceComparisonSignals(contract) {
    const components = new Map(
        (contract.components || []).map((component) => [component.id, component]),
      ),
      result = [],
      typeName = (value) =>
        Number(value) === 1 ? "digital" : Number(value) === 2 ? "analog" : "serial",
      visit = (specification, parentPath = "") => {
        const component = components.get(specification.componentId),
          path = [parentPath, specification.instanceName].filter(Boolean).join(".");
        if (!component) return;
        (component.commands || []).filter((entry) => entry.name).forEach((entry) =>
          result.push({ path: `${path}.${entry.name}`, type: typeName(entry.dataType), direction: "input" }),
        );
        (component.feedbacks || []).filter((entry) => entry.name).forEach((entry) =>
          result.push({ path: `${path}.${entry.name}`, type: typeName(entry.dataType), direction: "output" }),
        );
        (component.specifications || []).forEach((child) => visit(child, path));
      };
    (contract.specifications || []).forEach((specification) => visit(specification));
    return result;
  }
  function cse2jComparisonSignals(mapping) {
    const result = [], known = new Set(), metadata = /^(type|direction|join|value|state|event|serial|analog|digital|notes|id)$/i;
    const add = (path, node) => {
      path = String(path || "").replace(/^signals\.?/i, "").replace(/^\.+|\.+$/g, "");
      if (!path || !path.includes(".") || known.has(path)) return;
      known.add(path);
      const rawType = String(node?.type || node?.signalType || node?.dataType || "").toLowerCase(),
        type = /bool|digital|^1$/.test(rawType) ? "digital" : /analog|number|ushort|^2$/.test(rawType) ? "analog" : /serial|string|^3$/.test(rawType) ? "serial" : "",
        rawDirection = String(node?.direction || node?.attributeType || "").toLowerCase(),
        direction = /output|event|^1$/.test(rawDirection) ? "output" : /input|state|^0$/.test(rawDirection) ? "input" : "";
      result.push({ path, type, direction });
    };
    const walk = (node, parts = []) => {
      if (!node || typeof node !== "object") return;
      if (typeof node.name === "string" && node.name.includes(".")) add(node.name, node);
      Object.entries(node).forEach(([key, value]) => {
        if (metadata.test(key)) return;
        const next = key.includes(".") ? key.split(".") : [...parts, key];
        if (key.includes(".")) add(key, value);
        if (value && typeof value === "object") walk(value, next);
        else if (next.length > 1) add(next.join("."), node);
      });
    };
    walk(mapping.signals || mapping, []);
    return result;
  }
  async function compareContractFile(file) {
    try {
      const contents = await file.text(), data = JSON.parse(contents),
        imported = Array.isArray(data.components) && Array.isArray(data.specifications)
          ? cceComparisonSignals(data)
          : data.signals && typeof data.signals === "object"
            ? cse2jComparisonSignals(data)
            : null;
      if (!imported) throw new Error("This file is not a recognized .cce project or .cse2j mapping.");
      const current = currentContractComparisonSignals(),
        currentMap = new Map(current.map((entry) => [entry.path, entry])),
        importedMap = new Map(imported.map((entry) => [entry.path, entry]));
      importedContractComparison = {
        fileName: file.name,
        missing: current.filter((entry) => !importedMap.has(entry.path)),
        extra: imported.filter((entry) => !currentMap.has(entry.path)),
        mismatched: current.filter((entry) => {
          const other = importedMap.get(entry.path);
          return other && ((other.type && other.type !== entry.type) || (other.direction && other.direction !== entry.direction));
        }).map((entry) => ({ current: entry, imported: importedMap.get(entry.path) })),
        matched: current.filter((entry) => importedMap.has(entry.path)).length,
        currentCount: current.length,
        importedCount: imported.length,
      };
      signalViewMode = "simpl";
      renderSignalManager();
      setStatus(`Compared contract mapping ${file.name}`);
    } catch (error) {
      alert(`The contract mapping could not be compared.\n\n${error.message}`);
    }
  }
  function renderContractComparison(host) {
    const comparison = importedContractComparison;
    if (!comparison) return;
    const details = document.createElement("details"), summary = document.createElement("summary");
    details.className = "contract-comparison";
    details.open = true;
    summary.textContent = `Compared with ${comparison.fileName} — ${comparison.matched} matched · ${comparison.missing.length} missing · ${comparison.extra.length} extra · ${comparison.mismatched.length} mismatched`;
    details.append(summary);
    const groups = [
      ["Missing from imported mapping", comparison.missing, (entry) => entry],
      ["Extra in imported mapping", comparison.extra, (entry) => entry],
      ["Type or direction mismatch", comparison.mismatched, (entry) => entry.current],
    ];
    groups.forEach(([label, entries, normalize]) => {
      if (!entries.length) return;
      const group = document.createElement("details"), groupSummary = document.createElement("summary");
      group.open = true;
      groupSummary.textContent = `${label} (${entries.length})`;
      group.append(groupSummary);
      entries.slice(0, 500).forEach((raw) => {
        const entry = normalize(raw), row = document.createElement("div");
        row.className = "contract-comparison-row";
        row.textContent = `${entry.path} · ${entry.type || "unknown type"} ${entry.direction || "unknown direction"}`;
        group.append(row);
      });
      details.append(group);
    });
    if (!comparison.missing.length && !comparison.extra.length && !comparison.mismatched.length) {
      const passed = document.createElement("p");
      passed.className = "contract-comparison-pass";
      passed.textContent = `The imported mapping matches all ${comparison.currentCount} project contract signals.`;
      details.append(passed);
    }
    host.append(details);
  }
  function renderSimplPreview() {
    const host = $("signal-simpl-preview"),
      result = contractBuildData(),
      contract = result.contract,
      components = new Map(
        (contract.components || []).map((component) => [component.id, component]),
      ),
      typeName = (value) =>
        Number(value) === 1 ? "Digital" : Number(value) === 2 ? "Analog" : "Serial";
    host.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "simpl-preview-heading";
    const contractName = document.createElement("strong"), summaryText = document.createElement("span");
    contractName.textContent = contract.name || "CrestronUiContract";
    summaryText.textContent = result.errors.length
      ? `${result.errors.length} contract error${result.errors.length === 1 ? "" : "s"}`
      : `${contract.specifications.length} top-level extender${contract.specifications.length === 1 ? "" : "s"} · ${contract.components.length} component definitions`;
    heading.append(contractName, summaryText);
    host.append(heading);
    renderContractComparison(host);
    if (result.errors.length) {
      const errors = document.createElement("details"), summary = document.createElement("summary");
      errors.className = "simpl-preview-errors";
      errors.open = true;
      summary.textContent = "Contract errors";
      errors.append(summary);
      result.errors.forEach((message) => {
        const row = document.createElement("div");
        row.textContent = message;
        errors.append(row);
      });
      host.append(errors);
    }
    const appendSpecification = (specification, parent, depth = 0) => {
      const component = components.get(specification.componentId),
        details = document.createElement("details"),
        summary = document.createElement("summary"),
        count = Math.max(1, Number(specification.numberOfInstances) || 1);
      details.open = depth < 1;
      details.className = "simpl-preview-component";
      summary.textContent = `${specification.instanceName || component?.name || "Component"}${count > 1 ? ` [0–${count - 1}]` : ""}`;
      details.append(summary);
      if (component) {
        const definition = document.createElement("small");
        definition.textContent = `SIMPL extender: ${component.name}`;
        details.append(definition);
        const attributes = [
          ...(component.commands || []).filter((entry) => entry.name).map((entry) => ({ ...entry, role: "State" })),
          ...(component.feedbacks || []).filter((entry) => entry.name).map((entry) => ({ ...entry, role: "Event" })),
        ];
        attributes.forEach((attribute) => {
          const row = document.createElement("div"), name = document.createElement("code"), meta = document.createElement("span");
          row.className = "simpl-preview-attribute";
          name.textContent = attribute.name;
          meta.textContent = `${typeName(attribute.dataType)} ${attribute.role}${attribute.notes ? ` · ${attribute.notes}` : ""}`;
          row.append(name, meta);
          details.append(row);
        });
        (component.specifications || []).forEach((child) =>
          appendSpecification(child, details, depth + 1),
        );
      }
      parent.append(details);
    };
    (contract.specifications || []).forEach((specification) =>
      appendSpecification(specification, host),
    );
    if (!(contract.specifications || []).length && !result.errors.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No Contract-mode signals are assigned.";
      host.append(empty);
    }
  }
  function navigateToSignalRow(row) {
    const item = row.itemId
        ? state.items.find((entry) => entry.id === row.itemId)
        : null,
      pageId = row.pageId || item?.pageId;
    if (pageId && state.pages.some((page) => page.id === pageId)) {
      state.activePage = pageId;
      renderPage();
    }
    if (item) select(item.id);
    $("signal-dialog").close();
    setStatus(
      item
        ? `Opened ${row.page} · “${item.name}” · ${row.name}`
        : `Opened ${row.page} · ${row.name}`,
    );
  }
  function renderSignalMap(rows, counts) {
    const host = $("signal-map"),
      pages = new Map();
    host.replaceChildren();
    rows.forEach((row) => {
      const pageName = row.page || "Project-wide",
        pageKey = row.pageId || pageName,
        widgetName = row.widget || "Page signals",
        widgetKey = row.itemId || widgetName;
      if (!pages.has(pageKey))
        pages.set(pageKey, { name: pageName, widgets: new Map() });
      const widgets = pages.get(pageKey).widgets;
      if (!widgets.has(widgetKey))
        widgets.set(widgetKey, { name: widgetName, signals: [] });
      widgets.get(widgetKey).signals.push(row);
    });
    pages.forEach(({ name: pageName, widgets }) => {
      const pageDetails = document.createElement("details"),
        pageSummary = document.createElement("summary"),
        pageCount = [...widgets.values()].reduce(
          (total, entry) => total + entry.signals.length,
          0,
        );
      pageDetails.open = true;
      pageSummary.textContent = `${pageName} (${pageCount})`;
      pageDetails.append(pageSummary);
      widgets.forEach(({ name: widgetName, signals }) => {
        const widgetDetails = document.createElement("details"),
          widgetSummary = document.createElement("summary");
        widgetDetails.open = true;
        widgetSummary.textContent = `${widgetName} (${signals.length})`;
        widgetDetails.append(widgetSummary);
        signals.forEach((row) => {
          const button = document.createElement("button"),
            address = document.createElement("code"),
            status = document.createElement("span"),
            missing = !String(row.value || "").trim(),
            duplicate =
              !missing &&
              counts.get(`${row.type}:${row.direction}:${row.value}`) > 1;
          button.type = "button";
          button.className = `signal-map-row${duplicate ? " duplicate" : ""}${missing ? " unbound" : ""}`;
          [row.name, row.type, row.direction, row.mode].forEach((value) => {
            const span = document.createElement("span");
            span.textContent = value;
            button.append(span);
          });
          address.textContent = row.value || "Unbound";
          status.className = "signal-map-status";
          status.textContent = duplicate ? "Duplicate" : missing ? "Unbound" : "Open";
          button.append(address, status);
          button.onclick = () => navigateToSignalRow(row);
          widgetDetails.append(button);
        });
        pageDetails.append(widgetDetails);
      });
      host.append(pageDetails);
    });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.style.padding = "14px";
      empty.textContent = "No signals match the current filter.";
      host.append(empty);
    }
  }
  function renderSignalAddressMap(rows) {
    const host = $("signal-address-map"),
      groups = new Map();
    host.replaceChildren();
    rows.forEach((row, index) => {
      const value = String(row.value || "").trim(),
        key = value
          ? `${row.mode}:${row.type}:${value}`
          : `unbound:${row.itemId || row.pageId || "project"}:${row.name}:${index}`;
      if (!groups.has(key))
        groups.set(key, {
          value: value || "Unbound",
          mode: row.mode,
          type: row.type,
          rows: [],
        });
      groups.get(key).rows.push(row);
    });
    [...groups.values()]
      .sort((left, right) =>
        `${left.mode}:${left.type}:${left.value}`.localeCompare(
          `${right.mode}:${right.type}:${right.value}`,
          undefined,
          { numeric: true },
        ),
      )
      .forEach((group) => {
        const details = document.createElement("details"),
          summary = document.createElement("summary"),
          address = document.createElement("code"),
          outputCount = group.rows.filter(
            (row) => row.direction === "output",
          ).length,
          inputCount = group.rows.filter(
            (row) => row.direction === "input",
          ).length,
          collision = outputCount > 1 || inputCount > 1,
          paired = outputCount > 0 && inputCount > 0;
        details.open = collision || group.value === "Unbound";
        details.className = `signal-address-group${collision ? " collision" : ""}${paired ? " paired" : ""}`;
        address.textContent = group.value;
        summary.append(
          `${group.mode} · ${group.type} · `,
          address,
          ` (${group.rows.length} use${group.rows.length === 1 ? "" : "s"})`,
        );
        details.append(summary);
        if (group.value !== "Unbound") {
          const actions = document.createElement("div"),
            rename = document.createElement("button");
          actions.className = "signal-address-actions";
          rename.type = "button";
          rename.textContent = "Rename all uses…";
          rename.onclick = () => renameSignalAddress(group);
          actions.append(rename);
          details.append(actions);
        }
        group.rows.forEach((row) => {
          const button = document.createElement("button"),
            status = document.createElement("span"),
            sameDirectionCount = group.rows.filter(
              (entry) => entry.direction === row.direction,
            ).length;
          button.type = "button";
          button.className = `signal-map-row signal-address-use${sameDirectionCount > 1 ? " duplicate" : ""}${group.value === "Unbound" ? " unbound" : ""}`;
          [row.page, row.widget, row.name, row.direction, row.mode].forEach(
            (value) => {
              const span = document.createElement("span");
              span.textContent = value;
              button.append(span);
            },
          );
          status.className = "signal-map-status";
          status.textContent =
            group.value === "Unbound"
              ? "Unbound"
              : sameDirectionCount > 1
                ? "Collision"
                : row.direction === "output"
                  ? "Command"
                  : "Feedback";
          button.append(status);
          button.onclick = () => navigateToSignalRow(row);
          details.append(button);
        });
        host.append(details);
      });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.style.padding = "14px";
      empty.textContent = "No signal addresses match the current filter.";
      host.append(empty);
    }
  }
  function validSignalRefactorValue(mode, value) {
    return mode === "join"
      ? /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535
      : /^[A-Za-z_][A-Za-z0-9_.{}\[\]-]*$/.test(value);
  }
  function finishSignalRefactor(count, message) {
    if (!count) return;
    renderPage();
    commitHistory();
    renderSignalManager();
    setStatus(`${message} (${count} signal use${count === 1 ? "" : "s"})`);
  }
  function renameSignalAddress(group) {
    const next = prompt(
      `Rename ${group.rows.length} use${group.rows.length === 1 ? "" : "s"} of:\n\n${group.value}\n\nNew ${group.mode === "join" ? "join number" : "contract address"}:`,
      group.value,
    );
    if (next == null || next.trim() === group.value) return;
    const value = next.trim();
    if (!validSignalRefactorValue(group.mode, value)) {
      alert(
        group.mode === "join"
          ? "Enter a join number from 1 through 65535."
          : "Enter a valid contract address beginning with a letter or underscore.",
      );
      return;
    }
    if (
      !confirm(
        `Replace ${group.rows.length} use${group.rows.length === 1 ? "" : "s"} of\n${group.value}\n\nwith\n${value}?`,
      )
    )
      return;
    group.rows.forEach((row) => row.setValue(value));
    finishSignalRefactor(group.rows.length, `Renamed ${group.value} to ${value}`);
  }
  function replaceContractPrefix() {
    const rows = collectProjectSignals().filter(
        (row) => row.mode === "contract" && String(row.value || "").trim(),
      ),
      fromInput = prompt(
        "Contract prefix to replace (example: Home.Lighting):",
        "",
      );
    if (fromInput == null) return;
    const from = fromInput.trim().replace(/\.+$/g, "");
    if (!from) return;
    const toInput = prompt(`Replace “${from}” with:`, from);
    if (toInput == null) return;
    const to = toInput.trim().replace(/\.+$/g, "");
    if (!validSignalRefactorValue("contract", to)) {
      alert("Enter a valid contract prefix beginning with a letter or underscore.");
      return;
    }
    const matches = rows.filter((row) => {
      const value = String(row.value);
      return value === from || value.startsWith(`${from}.`) || value.startsWith(`${from}[`);
    });
    if (!matches.length) {
      alert(`No contract signals begin with “${from}”.`);
      return;
    }
    if (
      !confirm(
        `Replace contract prefix in ${matches.length} signal use${matches.length === 1 ? "" : "s"}?\n\n${from}\n→ ${to}\n\nThis operation can be undone in one step.`,
      )
    )
      return;
    matches.forEach((row) =>
      row.setValue(`${to}${String(row.value).slice(from.length)}`),
    );
    finishSignalRefactor(matches.length, `Replaced contract prefix ${from} with ${to}`);
  }
  function buildJoinAllocationPlan() {
    const rows = collectProjectSignals(),
      scope = $("join-allocator-scope").value,
      type = $("join-allocator-type").value,
      direction = $("join-allocator-direction").value,
      start = Math.min(
        65535,
        Math.max(1, Math.round(Number($("join-allocator-start").value) || 1)),
      ),
      used = new Map(),
      cursors = new Map(),
      bucket = (row) => `${row.type}:${row.direction}`,
      reserve = (row, base, target = used) => {
        const values = target.get(bucket(row)) || new Set(),
          count = row.range ? Math.max(1, Number(row.rangeCount) || 1) : 1,
          increment = row.range
            ? Math.max(1, Number(row.rangeIncrement) || 1)
            : 1;
        for (let index = 0; index < count; index++)
          values.add(base + index * increment);
        target.set(bucket(row), values);
      };
    rows.forEach((row) => {
      if (row.mode !== "join" || !/^\d+$/.test(String(row.value || ""))) return;
      reserve(row, Number(row.value));
    });
    const candidates = rows.filter((row) => {
      if (row.mode !== "join" || String(row.value || "").trim()) return false;
      if (type !== "all" && row.type !== type) return false;
      if (direction !== "all" && row.direction !== direction) return false;
      if (scope === "page") {
        const item = row.itemId
          ? state.items.find((entry) => entry.id === row.itemId)
          : null;
        if (!item?.master && row.pageId !== state.activePage && item?.pageId !== state.activePage)
          return false;
      }
      return true;
    });
    joinAllocationPlan = [];
    candidates.forEach((row) => {
      const key = bucket(row),
        values = used.get(key) || new Set(),
        count = row.range ? Math.max(1, Number(row.rangeCount) || 1) : 1,
        increment = row.range
          ? Math.max(1, Number(row.rangeIncrement) || 1)
          : 1;
      let base = cursors.get(key) || start;
      while (base <= 65535) {
        let available = true;
        for (let index = 0; index < count; index++) {
          const value = base + index * increment;
          if (value > 65535 || values.has(value)) {
            available = false;
            break;
          }
        }
        if (available) break;
        base++;
      }
      if (base > 65535 || base + (count - 1) * increment > 65535) return;
      reserve(row, base);
      cursors.set(key, base + (count - 1) * increment + 1);
      joinAllocationPlan.push({ row, base, count, increment });
    });
    return joinAllocationPlan;
  }
  function renderJoinAllocationPlan() {
    const plan = buildJoinAllocationPlan(),
      host = $("join-allocator-preview");
    host.replaceChildren();
    plan.forEach(({ row, base, count, increment }) => {
      const entry = document.createElement("div"),
        values = [
          row.page,
          row.widget,
          row.name,
          row.type,
          row.direction,
          count > 1
            ? `${base}…${base + (count - 1) * increment}`
            : String(base),
        ];
      entry.className = "join-allocation-row";
      values.forEach((value, index) => {
        const cell = document.createElement(index === 5 ? "strong" : "span");
        cell.textContent = value;
        entry.append(cell);
      });
      host.append(entry);
    });
    if (!plan.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.style.padding = "12px";
      empty.textContent =
        "No unbound Join-mode signals match these options. Set widgets to Join numbers first, or change the filters.";
      host.append(empty);
    }
    $("join-allocator-summary").textContent =
      `${plan.length} signal binding${plan.length === 1 ? "" : "s"} will be assigned without reusing occupied joins.`;
    $("join-allocator-apply").disabled = !plan.length;
  }
  function applyJoinAllocationPlan() {
    const plan = buildJoinAllocationPlan();
    if (!plan.length) return;
    if (
      !confirm(
        `Assign collision-free joins to ${plan.length} signal binding${plan.length === 1 ? "" : "s"}?\n\nThis operation can be undone in one step.`,
      )
    )
      return;
    plan.forEach(({ row, base }) => row.setValue(String(base)));
    $("join-allocator-dialog").close();
    finishSignalRefactor(plan.length, "Allocated joins");
  }
  function standardContractLeaf(row) {
    if (/visibility/i.test(row.name || "")) return "Visibility";
    return row.type === "digital"
      ? row.direction === "output"
        ? "Press"
        : "Selected"
      : row.type === "analog"
        ? row.direction === "output"
          ? "ValueSet"
          : "Feedback"
        : row.direction === "output"
          ? "Text"
          : "Name";
  }
  function generatedContractAddress(row) {
    const item = row.itemId
      ? state.items.find((entry) => entry.id === row.itemId)
      : null;
    if (!item)
      return contractPageInstance(row.pageId || state.activePage);
    const root = contractWidgetInstance(item),
      leaf = standardContractLeaf(row);
    return row.range
      ? `${root}.Items[{index}].${leaf}`
      : `${root}.${leaf}`;
  }
  function canonicalContractAddress(row, value) {
    const shape = contractSignalShape({ ...row, value });
    return `${shape.instancePath}.${standardContractAttribute(row.type, row.direction, shape.attributePath)}`;
  }
  function buildContractNamingPlan() {
    const rows = collectProjectSignals(),
      scope = $("contract-namer-scope").value,
      type = $("contract-namer-type").value,
      direction = $("contract-namer-direction").value,
      occupied = new Map();
    rows.forEach((row) => {
      if (row.mode !== "contract" || !String(row.value || "").trim()) return;
      const key = `${row.type}:${row.direction}:${canonicalContractAddress(row, row.value)}`;
      occupied.set(key, (occupied.get(key) || 0) + 1);
    });
    const candidates = rows.filter((row) => {
      if (row.mode !== "contract" || String(row.value || "").trim()) return false;
      if (type !== "all" && row.type !== type) return false;
      if (direction !== "all" && row.direction !== direction) return false;
      if (scope === "page") {
        const item = row.itemId
          ? state.items.find((entry) => entry.id === row.itemId)
          : null;
        if (!item?.master && row.pageId !== state.activePage && item?.pageId !== state.activePage)
          return false;
      }
      return true;
    });
    contractNamingPlan = candidates.map((row) => {
      const value = generatedContractAddress(row),
        canonical = canonicalContractAddress(row, value),
        key = `${row.type}:${row.direction}:${canonical}`,
        collision = occupied.has(key);
      occupied.set(key, (occupied.get(key) || 0) + 1);
      return { row, value, canonical, collision };
    });
    const totals = new Map();
    contractNamingPlan.forEach((entry) => {
      const key = `${entry.row.type}:${entry.row.direction}:${entry.canonical}`;
      totals.set(key, (totals.get(key) || 0) + 1);
    });
    contractNamingPlan.forEach((entry) => {
      const key = `${entry.row.type}:${entry.row.direction}:${entry.canonical}`;
      if ((totals.get(key) || 0) > 1) entry.collision = true;
    });
    return contractNamingPlan;
  }
  function renderContractNamingPlan() {
    const plan = buildContractNamingPlan(),
      host = $("contract-namer-preview"),
      collisions = plan.filter((entry) => entry.collision).length;
    host.replaceChildren();
    plan.forEach(({ row, value, collision }) => {
      const entry = document.createElement("div"),
        values = [
          row.page,
          row.widget,
          row.name,
          row.type,
          row.direction,
          collision ? `${value} · COLLISION` : value,
        ];
      entry.className = `join-allocation-row${collision ? " contract-collision" : ""}`;
      values.forEach((text, index) => {
        const cell = document.createElement(index === 5 ? "strong" : "span");
        cell.textContent = text;
        entry.append(cell);
      });
      host.append(entry);
    });
    if (!plan.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.style.padding = "12px";
      empty.textContent =
        "No unbound Contract-mode signals match these options.";
      host.append(empty);
    }
    $("contract-namer-summary").textContent = collisions
      ? `${plan.length} names proposed · ${collisions} collision${collisions === 1 ? "" : "s"} must be resolved manually.`
      : `${plan.length} collision-free contract name${plan.length === 1 ? "" : "s"} proposed.`;
    $("contract-namer-apply").disabled = !plan.length || collisions > 0;
  }
  function applyContractNamingPlan() {
    const plan = buildContractNamingPlan();
    if (!plan.length || plan.some((entry) => entry.collision)) return;
    if (
      !confirm(
        `Apply ${plan.length} generated contract name${plan.length === 1 ? "" : "s"}?\n\nThis operation can be undone in one step.`,
      )
    )
      return;
    plan.forEach(({ row, value }) => row.setValue(value));
    $("contract-namer-dialog").close();
    finishSignalRefactor(plan.length, "Generated contract names");
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
  function signalScheduleReport() {
    const rows = collectProjectSignals(),
      contractResult = contractBuildData(),
      counts = new Map(),
      pages = new Map(),
      line = "-".repeat(88),
      generatedAddress = (row) => {
        if (row.mode !== "contract" || !String(row.value || "").trim()) return "—";
        const shape = contractSignalShape(row);
        return `${shape.instancePath}.${standardContractAttribute(row.type, row.direction, shape.attributePath)}`;
      };
    rows.forEach((row) => {
      if (row.value) {
        const key = `${row.mode}:${row.type}:${row.direction}:${row.value}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const page = row.page || "Project-wide", widget = row.widget || "Page signals";
      if (!pages.has(page)) pages.set(page, new Map());
      if (!pages.get(page).has(widget)) pages.get(page).set(widget, []);
      pages.get(page).get(widget).push(row);
    });
    const unbound = rows.filter((row) => !String(row.value || "").trim()).length,
      duplicateRows = rows.filter((row) => row.value && counts.get(`${row.mode}:${row.type}:${row.direction}:${row.value}`) > 1).length,
      output = [
        "CRESTRON UI COMPOSER — SIGNAL SCHEDULE",
        `Generated: ${new Date().toLocaleString()}`,
        `Project / contract: ${state.contract.name || "Untitled"}`,
        `Target: ${selectedDevice().name} (${state.width} × ${state.height})`,
        `Pages: ${state.pages.length} · Widgets: ${state.items.length} · Signals: ${rows.length}`,
        `Contract signals: ${rows.filter((row) => row.mode === "contract").length} · Join signals: ${rows.filter((row) => row.mode === "join").length}`,
        `Unbound: ${unbound} · Duplicate rows: ${duplicateRows} · Contract-build errors: ${contractResult.errors.length}`,
        "",
      ];
    if (contractResult.errors.length) {
      output.push("CONTRACT BUILD ERRORS", line);
      contractResult.errors.forEach((error, index) => output.push(`${index + 1}. ${error}`));
      output.push("");
    }
    pages.forEach((widgets, pageName) => {
      output.push(`PAGE: ${pageName}`, line);
      widgets.forEach((widgetRows, widgetName) => {
        output.push(`  WIDGET: ${widgetName}`);
        widgetRows.forEach((row) => {
          const value = String(row.value || "").trim(),
            duplicate = value && counts.get(`${row.mode}:${row.type}:${row.direction}:${row.value}`) > 1,
            status = !value ? "UNBOUND" : duplicate ? "DUPLICATE" : "OK",
            range = row.range ? ` · range ${row.rangeCount || 1} × ${row.rangeIncrement || 1}` : "";
          output.push(
            `    ${row.name} — ${row.type.toUpperCase()} ${row.direction.toUpperCase()} · ${row.mode.toUpperCase()} · ${status}${range}`,
            `      Assigned: ${value || "—"}`,
          );
          if (row.mode === "contract") output.push(`      SIMPL:    ${generatedAddress(row)}`);
        });
        output.push("");
      });
    });
    output.push("SIMPL COMPONENT SUMMARY", line);
    contractResult.contract.specifications.forEach((specification) => {
      const count = Math.max(1, Number(specification.numberOfInstances) || 1);
      output.push(`  ${specification.instanceName}${count > 1 ? ` [${count} instances]` : ""}`);
    });
    output.push("", "END OF SIGNAL SCHEDULE");
    return output.join("\r\n");
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
          ? `Saved ${saved.path}. Contract Editor is open; choose Open Project and select the highlighted file (its path is also copied).`
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
  function normalizedArtifactPath(value) {
    return String(value || "").replace(/\//g, "\\").toLowerCase();
  }
  function recordBuildArtifact(result, device) {
    if (!result?.path) return;
    const settings = deploymentSettings(),
      artifact = {
        path: result.path,
        size: Number(result.size) || 0,
        sha256: result.sha256 || "",
        fingerprint: recoveryFingerprint(project()),
        targetDevice: device?.id || state.targetDevice,
        targetName: device?.name || selectedDevice().name,
        width: device?.width || state.width,
        height: device?.height || state.height,
        builtAt: new Date().toISOString(),
      },
      normalized = normalizedArtifactPath(result.path),
      buildArtifacts = [
        artifact,
        ...(settings.buildArtifacts || []).filter(
          (entry) => normalizedArtifactPath(entry.path) !== normalized,
        ),
      ].slice(0, 50);
    saveDeploymentSettings({ buildArtifacts });
    if ($("build-artifact-list")) renderBuildArtifacts();
  }
  function buildArtifactForPath(path) {
    const normalized = normalizedArtifactPath(path);
    return (deploymentSettings().buildArtifacts || []).find(
      (entry) => normalizedArtifactPath(entry.path) === normalized,
    );
  }
  function deploymentArtifactProblems(path, deviceId) {
    const artifact = buildArtifactForPath(path),
      problems = [];
    if (!artifact) return problems;
    if (artifact.fingerprint !== recoveryFingerprint(project()))
      problems.push(
        `The package was built from an older project state (${new Date(artifact.builtAt).toLocaleString()}).`,
      );
    if (deviceId && artifact.targetDevice && artifact.targetDevice !== deviceId) {
      const expected = deviceProfiles.find((device) => device.id === deviceId);
      problems.push(
        `The package targets ${artifact.targetName || artifact.targetDevice}, but this deployment profile targets ${expected?.name || deviceId}.`,
      );
    }
    return problems;
  }
  function approveDeploymentArtifact(path, deviceId) {
    const problems = deploymentArtifactProblems(path, deviceId);
    return (
      !problems.length ||
      confirm(
        `Package verification warning:\n\n${problems.join("\n")}\n\nDeploy this archive anyway?`,
      )
    );
  }
  function renderBuildArtifacts() {
    const host = $("build-artifact-list");
    if (!host) return;
    const artifacts = deploymentSettings().buildArtifacts || [],
      currentFingerprint = recoveryFingerprint(project());
    host.replaceChildren();
    artifacts.forEach((artifact) => {
      const row = document.createElement("div"),
        title = document.createElement("strong"),
        detail = document.createElement("small"),
        use = document.createElement("button"),
        current = artifact.fingerprint === currentFingerprint,
        fileName = String(artifact.path || "").split(/[\\/]/).pop();
      row.className = `build-artifact-entry ${current ? "current" : "stale"}`;
      title.textContent = `${current ? "CURRENT" : "STALE"} · ${fileName || "Unknown package"}`;
      detail.textContent = [
        artifact.targetName || artifact.targetDevice || "Unknown target",
        `${artifact.width || "?"} × ${artifact.height || "?"}`,
        artifact.size ? formatMetricBytes(artifact.size) : "Unknown size",
        artifact.builtAt ? new Date(artifact.builtAt).toLocaleString() : "Unknown date",
        artifact.sha256 ? `SHA-256 ${artifact.sha256.slice(0, 12)}…` : "No hash",
      ].join(" · ");
      use.type = "button";
      use.textContent = "Use package";
      use.onclick = () => {
        $("deploy-package").value = artifact.path;
        saveDeploymentSettings({ packagePath: artifact.path });
        updateActiveDeploymentProfile({ packagePath: artifact.path });
        $("deploy-status").textContent =
          `${current ? "Current" : "Stale"} build selected: ${artifact.path}`;
      };
      row.title = artifact.path;
      row.append(title, detail, use);
      host.append(row);
    });
    if (!artifacts.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.style.padding = "10px";
      empty.textContent = "No Composer-built CH5Z artifacts are recorded yet.";
      host.append(empty);
    }
  }
  function deploymentProfiles() {
    return deploymentSettings().profiles || [];
  }
  function defaultDeploymentType(deviceId) {
    return deviceId === "ipad-landscape"
      ? "mobile"
      : deviceId === "monitor-4k"
        ? "web"
        : "touchscreen";
  }
  function activeDeploymentProfile() {
    const id =
      $("deploy-profile")?.value || deploymentSettings().activeProfileId || "";
    return deploymentProfiles().find((profile) => profile.id === id) || null;
  }
  function renderDeploymentProfiles(
    selectedId = deploymentSettings().activeProfileId || "",
  ) {
    const profileSelect = $("deploy-profile"),
      deviceSelect = $("deploy-profile-device"),
      profiles = deploymentProfiles();
    profileSelect.innerHTML = '<option value="">Unsaved profile</option>';
    profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.name} — ${profile.host || "No host"}`;
      profileSelect.appendChild(option);
    });
    deviceSelect.innerHTML = "";
    deviceProfiles
      .filter((device) => device.id !== "custom")
      .forEach((device) => {
        const option = document.createElement("option");
        option.value = device.id;
        option.textContent = device.name;
        deviceSelect.appendChild(option);
      });
    profileSelect.value = profiles.some((profile) => profile.id === selectedId)
      ? selectedId
      : "";
    loadDeploymentProfile(profileSelect.value);
    renderDeploymentQueue();
  }
  function renderDeploymentQueue() {
    const host = $("deployment-profile-list");
    if (!host) return;
    const hadEntries = host.querySelectorAll("input").length > 0,
      checked = new Set(
        [...host.querySelectorAll("input:checked")].map((input) => input.value),
      );
    host.innerHTML = "";
    deploymentProfiles().forEach((profile) => {
      const row = document.createElement("label"),
        select = document.createElement("input"),
        name = document.createElement("strong"),
        target = document.createElement("small"),
        stateLabel = document.createElement("span"),
        device = deviceProfiles.find((entry) => entry.id === profile.deviceId),
        queue = deploymentQueueStatus.get(profile.id);
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
    if (!deploymentProfiles().length)
      host.innerHTML =
        '<p class="hint">Create and save a deployment profile to use the queue.</p>';
  }
  function selectedDeploymentQueueProfiles() {
    const ids = new Set(
      [
        ...document.querySelectorAll("#deployment-profile-list input:checked"),
      ].map((input) => input.value),
    );
    return deploymentProfiles().filter((profile) => ids.has(profile.id));
  }
  function setDeploymentQueueState(profileId, state, message, details = {}) {
    deploymentQueueStatus.set(profileId, { state, message, ...details });
    renderDeploymentQueue();
  }
  function loadDeploymentProfile(id) {
    const profile = deploymentProfiles().find((entry) => entry.id === id),
      settings = deploymentSettings();
    $("deploy-profile-name").value = profile?.name || "";
    $("deploy-profile-device").value = profile?.deviceId || state.targetDevice;
    $("deploy-target-type").value =
      profile?.deploymentType ||
      defaultDeploymentType(profile?.deviceId || state.targetDevice);
    $("deploy-host").value = profile?.host || settings.host || "";
    $("deploy-username").value = profile?.username || "";
    $("deploy-package").value =
      profile?.packagePath || settings.packagePath || "";
    $("deploy-profile-delete").disabled = !profile;
    saveDeploymentSettings({ activeProfileId: profile?.id || "" });
  }
  function saveCurrentDeploymentProfile() {
    const settings = deploymentSettings(),
      profiles = deploymentProfiles(),
      selected = activeDeploymentProfile(),
      name = $("deploy-profile-name").value.trim(),
      host = $("deploy-host").value.trim();
    if (!name) {
      alert("Enter a deployment profile name.");
      return;
    }
    if (!host) {
      alert("Enter the panel IP address or host name.");
      return;
    }
    const profile = {
      id: selected?.id || uid("deploy-"),
      name,
      host,
      username: $("deploy-username").value.trim(),
      deviceId: $("deploy-profile-device").value,
      deploymentType: $("deploy-target-type").value,
      packagePath: $("deploy-package").value,
      slowMode: true,
      updatedAt: new Date().toISOString(),
      lastCheck: selected?.lastCheck || null,
    };
    const next = selected
      ? profiles.map((entry) => (entry.id === selected.id ? profile : entry))
      : [...profiles, profile];
    saveDeploymentSettings({
      ...settings,
      profiles: next,
      activeProfileId: profile.id,
      host,
      packagePath: profile.packagePath,
      slowMode: profile.slowMode,
    });
    renderDeploymentProfiles(profile.id);
    $("deploy-status").textContent =
      `Saved deployment profile “${profile.name}”.`;
  }
  function updateActiveDeploymentProfile(patch) {
    const selected = activeDeploymentProfile();
    if (!selected) return;
    saveDeploymentSettings({
      profiles: deploymentProfiles().map((profile) =>
        profile.id === selected.id
          ? { ...profile, ...patch, updatedAt: new Date().toISOString() }
          : profile,
      ),
    });
    renderDeploymentProfiles(selected.id);
  }
  async function redeployDeploymentBackup(entry) {
    if (!native || !entry?.backupPath || entry.success !== true) return;
    const savedProfile = deploymentProfiles().find(
        (profile) => profile.id === entry.profileId,
      ),
      deviceId = entry.deviceId || savedProfile?.deviceId || state.targetDevice,
      deploymentType =
        entry.deploymentType ||
        savedProfile?.deploymentType ||
        defaultDeploymentType(deviceId),
      profile = {
        ...(savedProfile || {}),
        id: savedProfile?.id || entry.profileId || uid("rollback-"),
        name: `${entry.profileName || entry.host} rollback`,
        host: entry.host,
        packagePath: entry.backupPath,
        deviceId,
        deploymentType,
      };
    $("deploy-status").textContent = "Verifying rollback package and panel…";
    try {
      const check = await nativeRequest("checkDeploymentProfile", {
        host: profile.host,
        packagePath: profile.packagePath,
        deviceId,
      });
      if (!check.packageValid)
        throw new Error(check.packageStatus || "The rollback package is invalid.");
      if (!check.reachable)
        throw new Error(`The panel is not reachable: ${check.status || "unknown status"}`);
      if (check.targetDeviceId && check.targetDeviceId !== deviceId)
        throw new Error(
          `Rollback package target ${check.targetDeviceId} does not match profile target ${deviceId}.`,
        );
      if (
        !confirm(
          `Rollback ${profile.host} using the successful package from ${new Date(entry.time).toLocaleString()}?\n\n${entry.backupPath}\n\nA terminal will request the panel credentials.`,
        )
      ) {
        $("deploy-status").textContent = "Rollback cancelled.";
        return;
      }
      $("deploy-status").textContent =
        "Rollback terminal opened — complete the credential prompt…";
      const result = await nativeRequest("deployCh5PackageWait", {
        host: profile.host,
        packagePath: profile.packagePath,
        slowMode: true,
        deploymentType,
      });
      const success = result.success === true,
        message = success
          ? `Rollback succeeded using ${entry.backupPath}`
          : `Rollback failed with exit code ${result.exitCode}; log: ${result.logPath}`;
      appendDeploymentHistory(profile, result, success, message);
      $("deploy-status").textContent = message;
    } catch (error) {
      appendDeploymentHistory(profile, null, false, `Rollback failed: ${error.message}`);
      $("deploy-status").textContent = `Rollback failed: ${error.message}`;
    }
  }
  function renderDeploymentHistory() {
    const host = $("deployment-history"),
      settings = deploymentSettings(),
      history = settings.history || [];
    host.innerHTML = "";
    history.forEach((entry) => {
      const row = document.createElement("div"),
        selectBackup = document.createElement("button"),
        rollback = document.createElement("button"),
        title = document.createElement("strong"),
        detail = document.createElement("small");
      row.className = "deployment-entry";
      selectBackup.type = "button";
      selectBackup.textContent = "Select backup";
      selectBackup.disabled = !entry.backupPath;
      selectBackup.onclick = () => {
        $("deploy-package").value = entry.backupPath;
        saveDeploymentSettings({ packagePath: entry.backupPath });
        $("deploy-status").textContent =
          `Rollback package selected: ${entry.backupPath}`;
      };
      rollback.type = "button";
      rollback.textContent = "Roll back";
      rollback.disabled = !entry.backupPath || entry.success !== true;
      rollback.title =
        entry.success === true
          ? "Verify and redeploy this successful package"
          : "Direct rollback is available for verified successful deployments";
      rollback.onclick = () => redeployDeploymentBackup(entry);
      title.textContent = `${entry.success === false ? "FAILED · " : entry.success === true ? "SUCCESS · " : ""}${entry.profileName ? `${entry.profileName} · ` : ""}${entry.host} · slow mode`;
      detail.textContent = `${new Date(entry.time).toLocaleString()} · ${entry.device || "Touchscreen"}${entry.deploymentType ? ` · ${entry.deploymentType}` : ""}${entry.resolution ? ` · ${entry.resolution}` : ""} · ${entry.packagePath}`;
      row.append(rollback, selectBackup, title, detail);
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
  function dispatchSimulatedWidgetPress(row, pressed) {
    const item = state.items.find((candidate) => candidate.id === row.itemId);
    if (!item) return false;
    if (!itemVisibleOnPage(item, state.activePage)) {
      state.activePage = item.pageId;
      renderPage();
    }
    const element = stage.querySelector(`.widget[data-id="${CSS.escape(item.id)}"]`),
      root = element?.querySelector(".scoped-preview"),
      definition = item.componentId ? window.ComposerRuntime.get(item.componentId) : null;
    if (!element || !root) return false;
    let target = null;
    if (definition?.itemSelector && Number.isInteger(Number(row.contractIndex))) {
      try {
        target = root.querySelectorAll(definition.itemSelector)[Number(row.contractIndex)] || null;
      } catch (_) {}
    }
    target ||= root.querySelector(
      'button:not([disabled]), [role="button"], input[type="button"], input[type="submit"], [tabindex]',
    );
    target ||= root.querySelector("[data-component]") || root.firstElementChild;
    if (!target) return false;
    const eventName = pressed ? "pointerdown" : "pointerup",
      pointerEvent = new PointerEvent(eventName, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: pressed ? 1 : 0,
        button: 0,
      });
    Object.defineProperty(pointerEvent, "composerSimulator", { value: true });
    target.dispatchEvent(pointerEvent);
    element.classList.toggle("simulator-live-press", pressed);
    if (!pressed) {
      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, button: 0 });
      Object.defineProperty(clickEvent, "composerSimulator", { value: true });
      target.dispatchEvent(clickEvent);
    }
    return true;
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
            ? String(
                (Number(row.value) || 0) + index * (row.rangeIncrement || 1),
              )
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
          (!simulatorItemFilter || (simulatorItemFilter instanceof Set ? simulatorItemFilter.has(row.itemId) : row.itemId === simulatorItemFilter)) &&
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
          const dispatched = dispatchSimulatedWidgetPress(row, true);
          if (!dispatched) setSimulatedSignal(row, true);
          button.classList.add("on");
          setTimeout(() => {
            if (dispatched) dispatchSimulatedWidgetPress(row, false);
            else setSimulatedSignal(row, false);
            button.classList.remove("on");
            refreshSimulatorEvents();
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
  function openSignalSimulator(itemId = null, groupTitle = "") {
    simulatorItemFilter = Array.isArray(itemId) ? new Set(itemId) : itemId;
    clearSimulatorFocus();
    const item = typeof itemId === "string"
        ? state.items.find((candidate) => candidate.id === itemId)
        : null,
      title = $("simulator-title"),
      hint = $("simulator-hint");
    title.textContent = groupTitle ? `Simulate: ${groupTitle}` : item ? `Simulate: ${item.name}` : "Signal Simulator";
    hint.textContent = item || groupTitle
      ? "Showing only this component’s inputs and outputs. The component is highlighted on the panel."
      : "Drive feedback inputs and observe widget output events without SIMPL.";
    $("simulator-search").value = "";
    renderSignalSimulator();
    if (item) {
      if (!itemVisibleOnPage(item, state.activePage)) {
        state.activePage = item.pageId;
        renderPage();
      }
      requestAnimationFrame(() => {
        const element = stage.querySelector(
          `.widget[data-id="${CSS.escape(item.id)}"]`,
        );
        if (element) {
          element.classList.add("simulator-focus");
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
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
  function simulateSubpage(entry, pageId) {
    const sourceIds = state.items.filter((item) => item.pageId === entry.sourcePageId && !item.master).flatMap((item) => [item.id, `subpage-signal-${entry.id}-${pageId}-${item.id}`]);
    openSignalSimulator(sourceIds, `${entry.name} subpage`);
    simulatorSubpageKey = `${entry.id}:${pageId}`; highlightedSubpageInstances.add(simulatorSubpageKey); renderPage();
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
        label.append(
          checkbox,
          document.createTextNode(
            "Use custom signal bindings for this instance",
          ),
        );
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
      } else
        panel.textContent = `Master bindings for “${reusableDefinition.name}” — linked instances inherit these by default.`;
      host.appendChild(panel);
    }
    if (!bindings.length) {
      host.insertAdjacentHTML(
        "beforeend",
        '<div class="signal-empty">No variables ending in “Signal” were detected.</div>',
      );
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
        label.append(
          checkbox,
          document.createTextNode(
            "Use custom signal bindings for this instance",
          ),
        );
        panel.appendChild(label);
        checkbox.onchange = () => {
          item.reusableBindingsOverride = checkbox.checked;
          if (!checkbox.checked) {
            const source = (reusableDefinition.items || []).find(
              (entry) => entry.reusableKey === item.reusableKey,
            );
            if (source) {
              item.signalBindings = structuredClone(
                source.signalBindings || {},
              );
              const signalKeys = new Set([
                "bindingMode",
                ...(definition.signals || [])
                  .map((signal) => signal.optionalProperty)
                  .filter(Boolean),
                ...(definition.properties || [])
                  .filter((property) => property.signalSetting)
                  .map((property) => property.key),
              ]);
              Object.entries(source.properties || {}).forEach(
                ([key, value]) => {
                  if (signalKeys.has(key))
                    item.properties[key] = structuredClone(value);
                },
              );
            }
          }
          renderItem(item);
          renderBindings(item);
          scheduleHistory();
        };
      } else
        panel.textContent = `Master bindings for “${reusableDefinition.name}” — linked instances inherit these by default.`;
      host.appendChild(panel);
    }
    if (
      (definition.properties || []).some(
        (property) => property.key === "bindingMode",
      )
    ) {
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
          property.type === "checkbox" &&
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
    const activeRangeBindings = resolvedRangeBindings(definition, item);
    activeRangeBindings.forEach((range) => {
      if (range.optionalProperty && !item.properties?.[range.optionalProperty]) return;
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
      if (item.properties && !Object.prototype.hasOwnProperty.call(item.properties, range.baseKey)) {
        if (bindingMode === "join") {
          const sameTypeSlot = activeRangeBindings.filter(entry => entry.type === range.type && activeRangeBindings.indexOf(entry) < activeRangeBindings.indexOf(range)).length,
            directSignals = (definition.signals || []).filter(signal => signal.type === range.type).length,
            count = configuredRangeCount(item, range);
          item.properties[range.baseKey] = String(1 + directSignals + sameTypeSlot * count);
        } else if (range.defaultValue) item.properties[range.baseKey] = range.defaultValue;
      }
      if (item.properties && !Object.prototype.hasOwnProperty.call(item.properties, range.incrementKey))
        item.properties[range.incrementKey] = 1;
      base.value = (item.properties && item.properties[range.baseKey]) || range.defaultValue || "";
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
          !activeRangeBindings.some(
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
        .querySelectorAll(
          ".signal-binding input,.signal-binding select,.signal-optional-toggle input",
        )
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
    if (e.composerSimulator) return;
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
  function embeddedDataBytes(value) {
    const source = String(value || ""),
      comma = source.indexOf(",");
    if (comma < 0) return 0;
    const payload = source.slice(comma + 1);
    return /;base64/i.test(source.slice(0, comma))
      ? Math.max(0, Math.floor((payload.length * 3) / 4) - (payload.match(/=*$/)?.[0].length || 0))
      : new TextEncoder().encode(decodeURIComponent(payload)).length;
  }
  function projectPerformanceAudit() {
    const embeddedAssetBytes = state.assets.reduce(
        (total, asset) => total + embeddedDataBytes(asset.dataUrl),
        0,
      ),
      exportedBytes = new TextEncoder().encode(
        window.ComposerExporter.exportProject(project()),
      ).length,
      continuousIds = new Set([
        "analog-clock",
        "loading-spinner",
        "please-wait-spinner",
        "shutdown-progress",
        "text-scramble",
      ]),
      itemProfiles = state.items.filter((item) => !item.systemManaged).map((item) => {
        const definition = item.componentId ? window.ComposerRuntime.get(item.componentId) : null,
          continuous = continuousIds.has(item.componentId),
          interactionCount = (item.interactions || []).length,
          actionCount = (item.actions || []).length,
          filterValues = Object.entries(item.properties || {}).filter(([key, value]) =>
            /(?:glowStrength|glowSize|blur|shadowSize|shadowDistance)/i.test(key) && Number(value) > 0,
          ),
          strongFilters = filterValues.filter(([, value]) => Number(value) >= 20),
          customFrame = !item.componentId || state.customComponents.some((entry) => entry.id === item.componentId),
          assetIds = new Set([item.assetId, item.backgroundAsset, item.graphicAsset, item.selectedGraphicAsset].filter(Boolean)),
          assetBytes = state.assets.filter((asset) => assetIds.has(asset.id)).reduce((total, asset) => total + embeddedDataBytes(asset.dataUrl), 0),
          score = 1 + (continuous ? 12 : 0) + interactionCount * 2 + actionCount + filterValues.length * 2 + strongFilters.length * 5 + (customFrame ? 5 : 0) + Math.ceil(assetBytes / (1024 * 1024));
        return { item, definition, continuous, interactionCount, actionCount, filterValues, strongFilters, customFrame, assetBytes, score };
      }),
      pageLoads = state.pages.map((page) => {
        const items = state.items.filter((item) =>
            itemVisibleOnPage(item, page.id),
          ),
          animated = items.filter(
            (item) =>
              continuousIds.has(item.componentId) ||
              (item.interactions || []).length > 2,
          ),
          profiles = itemProfiles.filter((entry) => itemVisibleOnPage(entry.item, page.id));
        return { page, items, animated, profiles, score: profiles.reduce((total, entry) => total + entry.score, 0) };
      }),
      customSourceBytes = state.customComponents.reduce(
        (total, component) =>
          total +
          new TextEncoder().encode(
            `${component.html || ""}${component.css || ""}${component.javascript || ""}`,
          ).length,
        0,
      );
    return {
      embeddedAssetBytes,
      exportedBytes,
      customSourceBytes,
      itemProfiles,
      pageLoads,
      peakWidgets: Math.max(0, ...pageLoads.map((entry) => entry.items.length)),
      peakAnimations: Math.max(
        0,
        ...pageLoads.map((entry) => entry.animated.length),
      ),
      peakPageScore: Math.max(0, ...pageLoads.map((entry) => entry.score)),
      continuousWidgets: itemProfiles.filter((entry) => entry.continuous).length,
      strongFilterWidgets: itemProfiles.filter((entry) => entry.strongFilters.length).length,
      customFrames: itemProfiles.filter((entry) => entry.customFrame).length,
    };
  }
  function panelPerformanceIssues(metrics) {
    const issues = [], compact = state.width <= 1280 || state.height <= 800,
      pageWarning = compact ? 115 : 180,
      add = (message, context = {}) => issues.push({ severity: "warning", category: "Panel performance", message, ...context });
    metrics.pageLoads.forEach((entry) => {
      if (entry.score >= pageWarning)
        add(`Page “${entry.page.name}” has an estimated rendering cost of ${entry.score}; reduce simultaneous animation, filters, or widget count.`, { pageId: entry.page.id, pageName: entry.page.name });
    });
    metrics.itemProfiles.forEach((entry) => {
      const item = entry.item, page = state.pages.find((candidate) => candidate.id === item.pageId), context = { pageId: item.pageId, pageName: page?.name || "", itemId: item.id, itemName: item.name };
      if (entry.strongFilters.length)
        add(`“${item.name}” uses ${entry.strongFilters.length} strong glow, blur, or shadow setting${entry.strongFilters.length === 1 ? "" : "s"}; large CSS filters are expensive on touch panels.`, context);
      if (entry.continuous && entry.interactionCount > 2)
        add(`“${item.name}” combines continuous animation with ${entry.interactionCount} timeline tracks.`, context);
      if (entry.assetBytes > 4 * 1024 * 1024)
        add(`“${item.name}” references ${formatMetricBytes(entry.assetBytes)} of embedded assets.`, context);
      if (entry.score >= 24)
        add(`“${item.name}” has a high estimated widget cost of ${entry.score}.`, context);
    });
    if (metrics.embeddedAssetBytes > 20 * 1024 * 1024)
      add(`Embedded assets total ${formatMetricBytes(metrics.embeddedAssetBytes)}; optimize large images and audio before panel deployment.`);
    if (metrics.customFrames > 20)
      add(`${metrics.customFrames} custom/iframe widgets may increase memory use and startup time.`);
    return issues;
  }
  function panelPerformanceReport(metrics, issues) {
    const lines = [
      "CRESTRON UI COMPOSER — PANEL PERFORMANCE REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Target: ${selectedDevice().name} (${state.width} × ${state.height})`,
      `Pages: ${state.pages.length} · Widgets: ${state.items.filter((item) => !item.systemManaged).length}`,
      `Exported HTML: ${formatMetricBytes(metrics.exportedBytes)} · Embedded assets: ${formatMetricBytes(metrics.embeddedAssetBytes)} · Custom source: ${formatMetricBytes(metrics.customSourceBytes)}`,
      `Continuous widgets: ${metrics.continuousWidgets} · Strong-filter widgets: ${metrics.strongFilterWidgets} · Custom frames: ${metrics.customFrames}`,
      `Peak page score: ${metrics.peakPageScore} · Findings: ${issues.length}`,
      "",
      "PAGE LOAD ESTIMATES",
      ...metrics.pageLoads.sort((a, b) => b.score - a.score).map((entry) => `  ${entry.page.name}: score ${entry.score} · ${entry.items.length} widgets · ${entry.animated.length} animated`),
      "",
      "HIGHEST-COST WIDGETS",
      ...metrics.itemProfiles.slice().sort((a, b) => b.score - a.score).slice(0, 20).map((entry) => {
        const page = state.pages.find((candidate) => candidate.id === entry.item.pageId);
        return `  ${page?.name || "Global"} · ${entry.item.name}: score ${entry.score}${entry.continuous ? " · continuous" : ""}${entry.strongFilters.length ? ` · ${entry.strongFilters.length} strong filters` : ""}${entry.assetBytes ? ` · ${formatMetricBytes(entry.assetBytes)} assets` : ""}`;
      }),
      "",
      "RECOMMENDATIONS",
      ...(issues.length ? issues.map((issue, index) => `${index + 1}. ${issue.message}`) : ["No performance risks exceeded the current target-panel thresholds."]),
      "",
      "Scores are static complexity estimates for comparison and preflight; confirm final frame rate, startup time, and memory on the target panel.",
    ];
    return lines.join("\r\n");
  }
  function runPanelPerformanceReport() {
    const metrics = projectPerformanceAudit(), issues = panelPerformanceIssues(metrics), errors = [];
    lastPerformanceMetrics = metrics;
    lastHealthIssues = issues;
    lastHealthReport = panelPerformanceReport(metrics, issues);
    healthIssueFilter = "all";
    $("health-search").value = "";
    document.querySelectorAll("[data-health-filter]").forEach((button) => button.classList.toggle("active", button.dataset.healthFilter === "all"));
    setHealthDisplayMode(true, true);
    renderHealthMetrics();
    renderHealthDashboard();
    $("health-fix-all").disabled = true;
    $("health-title").textContent = "Panel performance report";
    $("health-summary").textContent = issues.length ? `${issues.length} performance recommendation${issues.length === 1 ? "" : "s"}` : "No performance risks exceeded the current thresholds.";
    $("health-report").textContent = lastHealthReport;
    $("compatibility-device").hidden = true;
    $("compatibility-preview").hidden = true;
    $("compatibility-autofit").hidden = true;
    if (!$("health-dialog").open) $("health-dialog").showModal();
    setStatus(`Panel performance audit completed${issues.length ? ` with ${issues.length} recommendations` : ""}`);
    return { metrics, issues, errors };
  }
  function releaseReadinessAudit() {
    const validation = runValidation(false),
      contract = contractBuildData(),
      performance = lastPerformanceMetrics || projectPerformanceAudit(),
      performanceIssues = panelPerformanceIssues(performance),
      acceptance = acceptanceState(),
      acceptanceResults = acceptanceChecks.map(([, id, title]) => ({ id, title, ...acceptanceResult(id) })),
      failedAcceptance = acceptanceResults.filter((entry) => entry.status === "fail"),
      untestedAcceptance = acceptanceResults.filter((entry) => entry.status === "untested"),
      fingerprint = recoveryFingerprint(project()),
      settings = deploymentSettings(),
      currentArtifact = (settings.buildArtifacts || []).find((entry) => entry.fingerprint === fingerprint),
      successfulDeployment = (settings.history || []).find((entry) => entry.success === true && (!currentArtifact || normalizedArtifactPath(entry.packagePath) === normalizedArtifactPath(currentArtifact.path))),
      checks = [
        { name: "Project Health", pass: validation.errors.length === 0, detail: validation.errors.length ? `${validation.errors.length} blocking error${validation.errors.length === 1 ? "" : "s"}` : `${validation.issues.length} non-blocking warning${validation.issues.length === 1 ? "" : "s"}` },
        { name: "Contract generation", pass: contract.errors.length === 0 && contract.rows.length > 0, detail: contract.errors.length ? `${contract.errors.length} contract error${contract.errors.length === 1 ? "" : "s"}` : contract.rows.length ? `${contract.rows.length} mapped contract signals` : "No contract signals are assigned" },
        { name: "Acceptance checklist", pass: failedAcceptance.length === 0 && untestedAcceptance.length === 0, detail: failedAcceptance.length ? `${failedAcceptance.length} failed` : untestedAcceptance.length ? `${untestedAcceptance.length} untested` : `${acceptanceResults.length} passed` },
        { name: "Panel performance", pass: performanceIssues.length === 0, detail: performanceIssues.length ? `${performanceIssues.length} recommendation${performanceIssues.length === 1 ? "" : "s"} remain` : `Peak page score ${performance.peakPageScore}` },
        { name: "Current build artifact", pass: !!currentArtifact, detail: currentArtifact ? `${currentArtifact.targetName || currentArtifact.targetDevice} · ${formatMetricBytes(currentArtifact.size || 0)} · ${String(currentArtifact.sha256 || "").slice(0, 12) || "no hash"}` : "Build the current saved project after its latest changes" },
        { name: "Verified deployment", pass: !!successfulDeployment, detail: successfulDeployment ? `${successfulDeployment.host} · ${new Date(successfulDeployment.time).toLocaleString()}` : "Deploy the current build successfully to a target panel" },
      ],
      blockers = checks.filter((check) => !check.pass),
      lines = [
        `CRESTRON UI COMPOSER — RELEASE READINESS — ${blockers.length ? "NOT READY" : "PASSED"}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Application: ${document.title || "Crestron UI Composer"} · Project: ${state.contract.name || "Untitled"}`,
        `Target: ${selectedDevice().name} (${state.width} × ${state.height})`,
        `Project fingerprint: ${fingerprint}`,
        "",
        ...checks.flatMap((check) => [`[${check.pass ? "PASS" : "BLOCKED"}] ${check.name}`, `  ${check.detail}`]),
        "",
        blockers.length
          ? `Resolve ${blockers.length} blocked release gate${blockers.length === 1 ? "" : "s"}, rebuild, deploy, and run this audit again.`
          : "All project-level beta release gates passed. Perform clean-install and upgrade-install tests before publishing stable.",
      ];
    return { checks, blockers, report: lines.join("\r\n") };
  }
  function openReleaseReadiness() {
    const result = releaseReadinessAudit();
    lastHealthReport = result.report;
    setHealthDisplayMode(false);
    $("health-title").textContent = "Release readiness";
    $("health-summary").textContent = result.blockers.length
      ? `${result.blockers.length} release gate${result.blockers.length === 1 ? "" : "s"} blocked.`
      : "Project-level beta release gates passed.";
    $("health-report").textContent = result.report;
    $("compatibility-device").hidden = true;
    $("compatibility-preview").hidden = true;
    $("compatibility-autofit").hidden = true;
    if (!$("health-dialog").open) $("health-dialog").showModal();
    setStatus(result.blockers.length ? "Release readiness found blockers" : "Release readiness passed");
  }
  function runAuditUi(action, title) {
    try {
      return action();
    } catch (error) {
      lastHealthReport = `${title.toUpperCase()} — FAILED\r\n\r\n${error.stack || error.message || error}`;
      setHealthDisplayMode(false);
      $("health-title").textContent = title;
      $("health-summary").textContent = "The audit could not complete.";
      $("health-report").textContent = lastHealthReport;
      $("compatibility-device").hidden = true;
      $("compatibility-preview").hidden = true;
      $("compatibility-autofit").hidden = true;
      if (!$("health-dialog").open) $("health-dialog").showModal();
      setStatus(`${title} failed: ${error.message || error}`);
      return null;
    }
  }
  function formatMetricBytes(bytes) {
    if (bytes >= 1024 * 1024)
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.ceil(bytes / 1024)} KB`;
  }
  function componentPropertyValue(item, definition, property) {
    return item.properties?.[property.key] ?? property.defaultValue ?? "";
  }
  function parseAuditColor(value) {
    const source = String(value || "").trim();
    if (!source || /transparent|none/i.test(source)) return null;
    let match = source.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (match) {
      const hex =
        match[1].length === 3
          ? match[1]
              .split("")
              .map((entry) => entry + entry)
              .join("")
          : match[1];
      return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    }
    match = source.match(
      /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i,
    );
    return match ? match.slice(1, 4).map((entry) => Number(entry)) : null;
  }
  function auditContrast(foreground, background) {
    const luminance = (rgb) => {
        const channels = rgb.map((value) => {
          const channel = Math.min(255, Math.max(0, value)) / 255;
          return channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      },
      first = luminance(foreground),
      second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }
  function projectUsabilityAudit() {
    const issues = [];
    let interactiveCount = 0,
      smallTargets = 0,
      smallType = 0,
      unlabeled = 0,
      lowContrast = 0;
    state.items.forEach((item) => {
      if (item.systemManaged) return;
      const definition = item.componentId
          ? window.ComposerRuntime.get(item.componentId)
          : null,
        properties = definition?.properties || [],
        interactive =
          Boolean(item.targetPage) ||
          (item.actions || []).some((action) =>
            ["press", "release", "hold"].includes(action.event),
          ) ||
          (definition?.signals || []).some(
            (signal) => signal.direction === "output",
          );
      if (!interactive) return;
      interactiveCount++;
      if (item.w < 44 || item.h < 44) {
        smallTargets++;
        issues.push({
          severity: "warning",
          message: `“${item.name}” is ${Math.round(item.w)} × ${Math.round(item.h)}; interactive touch targets should be at least 44 × 44 pixels.`,
          item,
          fix: "touch-minimum",
        });
      }
      const typeSizes = properties.filter((property) =>
        /(?:text|label|font|icon).*size|size.*(?:text|label|font|icon)/i.test(
          `${property.key} ${property.label || ""}`,
        ),
      );
      typeSizes.forEach((property) => {
        const value = Number(componentPropertyValue(item, definition, property));
        if (Number.isFinite(value) && value > 0 && value < 12) {
          smallType++;
          issues.push({
            severity: "warning",
            message: `“${item.name}” uses ${property.label || property.key} of ${value}px; text and icons below 12px may be difficult to read.`,
            item,
            fix: "minimum-type",
            fixData: { propertyKey: property.key },
          });
        }
      });
      const identityProperties = properties.filter((property) =>
          /^(?:text|label|name|icon|symbol|standardText|standardIcon)$/i.test(
            property.key,
          ),
        ),
        hasIdentity = identityProperties.some((property) =>
          String(componentPropertyValue(item, definition, property)).trim(),
        ),
        hasGraphic = Boolean(
          item.assetId || item.graphicAsset || item.backgroundAsset,
        );
      if (identityProperties.length && !hasIdentity && !hasGraphic) {
        unlabeled++;
        issues.push({
          severity: "warning",
          message: `“${item.name}” has no text, icon, symbol, or graphic identifying its function.`,
          item,
        });
      }
      const textColors = properties.filter((property) =>
          /(?:text|label|font).*color|color.*(?:text|label|font)/i.test(
            `${property.key} ${property.label || ""}`,
          ),
        ),
        backgrounds = properties.filter((property) =>
          /(?:background|button).*color|color.*(?:background|button)/i.test(
            `${property.key} ${property.label || ""}`,
          ),
        );
      if (textColors.length && backgrounds.length) {
        const foreground = parseAuditColor(
            componentPropertyValue(item, definition, textColors[0]),
          ),
          background = parseAuditColor(
            componentPropertyValue(item, definition, backgrounds[0]),
          );
        if (foreground && background && auditContrast(foreground, background) < 3) {
          lowContrast++;
          issues.push({
            severity: "warning",
            message: `“${item.name}” has low text/background contrast in its standard state.`,
            item,
          });
        }
      }
    });
    return {
      issues,
      interactiveCount,
      smallTargets,
      smallType,
      unlabeled,
      lowContrast,
    };
  }
  function validateProject() {
    const issues = [],
      used = new Map(),
      validationCategory = (message) =>
        /asset/i.test(message)
          ? "Assets"
          : /contract|join|signal|binding/i.test(message)
            ? "Signals & contracts"
            : /page|navigate|navigation/i.test(message)
              ? "Navigation & pages"
              : /outside|bounds|margin|position|size|overlap|z-index/i.test(
                    message,
                  )
                ? "Layout"
                : /component|HTML|behavior|action|event|widget/i.test(message)
                  ? "Components & behavior"
                  : /support|capability|CH5|panel/i.test(message)
                    ? "Panel compatibility"
                    : "Project",
      add = (severity, message, details = {}) =>
        issues.push({
          severity,
          message,
          category: details.category || validationCategory(message),
          pageId: details.pageId || validationContext.pageId || "",
          itemId: details.itemId || validationContext.itemId || "",
          pageName: details.pageName || validationContext.pageName || "",
          itemName: details.itemName || validationContext.itemName || "",
          fix: details.fix || "",
          fixData: details.fixData || null,
        }),
      key = (type, direction, value) =>
        type + ":" + direction + ":" + String(value).trim();
    let validationContext = {};
    if (!state.items.length) add("warning", "The project has no components.");
    const device = selectedDevice();
    if (device.supportsCh5 === false)
      add("error", device.name + " does not support CH5 projects.");
    if (device.supportsCh5 == null)
      add("warning", device.name + " has not been verified for CH5.");
    if (!state.pages.length) add("error", "The project has no pages.");
    if (!state.pages.some((page) => page.id === state.activePage))
      add("error", "The active page no longer exists.", {
        fix: "active-page",
      });
    const pageIds = new Set(),
      pageNames = new Set();
    state.pages.forEach((page) => {
      validationContext = { pageId: page.id, pageName: page.name };
      if (!String(page.name || "").trim())
        add("error", "A page has no name.", { fix: "page-name" });
      if (pageIds.has(page.id))
        add("error", `Page ID “${page.id}” is duplicated.`);
      pageIds.add(page.id);
      const normalizedName = String(page.name || "")
        .trim()
        .toLowerCase();
      if (pageNames.has(normalizedName))
        add("warning", `Page name “${page.name}” is duplicated.`, {
          fix: "unique-page-name",
        });
      pageNames.add(normalizedName);
      if (page.bindingMode !== "none" && !String(page.binding || "").trim())
        add("error", `Page “${page.name}” has no external selection signal.`);
    });
    validationContext = {};

    const masterPageIds = new Set(state.pages.filter((page) => page.subpageMasterId).map((page) => page.id)),
      validateSubpageVisibility = (entry, resolved, page) => {
        if (!resolved.visibilityEnabled) return;
        const value = String(resolved.visibility || "").trim(), owner = page ? `Subpage “${entry.name}” on “${page.name}”` : `Subpage “${entry.name}”`;
        if (!value) add("error", `${owner} enables visibility but has no visibility binding.`, { category: "Subpages", pageId: page?.id || entry.sourcePageId, pageName: page?.name || state.pages.find((candidate) => candidate.id === entry.sourcePageId)?.name || "" });
        else if (resolved.bindingMode === "join" && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535))
          add("error", `${owner} has invalid visibility join “${value}”.`, { category: "Subpages", pageId: page?.id || entry.sourcePageId, pageName: page?.name || "" });
        else if (resolved.bindingMode !== "join" && !/^[A-Za-z_][A-Za-z0-9_.{}\[\]-]*$/.test(value))
          add("error", `${owner} has invalid visibility contract “${value}”.`, { category: "Subpages", pageId: page?.id || entry.sourcePageId, pageName: page?.name || "" });
      };
    state.subpages.forEach((entry) => {
      const masterPage = state.pages.find((page) => page.id === entry.sourcePageId),
        assignedPages = state.pages.filter((page) => subpageApplies(entry, page.id));
      if (!masterPage) {
        add("error", `Subpage “${entry.name}” references a missing master page.`, { category: "Subpages" });
        return;
      }
      if (masterPage.subpageMasterId !== entry.id)
        add("error", `Subpage “${entry.name}” and its master page are no longer linked correctly.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name });
      const width = Math.max(1, Number(entry.width) || 1), height = Math.max(1, Number(entry.height) || 1);
      if (Number(entry.width) <= 0 || Number(entry.height) <= 0)
        add("error", `Subpage “${entry.name}” has invalid dimensions.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name });
      if (width > state.width || height > state.height)
        add("warning", `Subpage “${entry.name}” is ${width} × ${height}, larger than the ${state.width} × ${state.height} target panel.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name });
      state.items.filter((item) => item.pageId === masterPage.id && !item.master).forEach((item) => {
        if (item.x < 0 || item.y < 0 || item.x + item.w > width || item.y + item.h > height)
          add("warning", `“${item.name}” extends outside subpage “${entry.name}” and will be clipped.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name, itemId: item.id, itemName: item.name });
      });
      if (!assignedPages.length)
        add("warning", `Subpage “${entry.name}” is assigned to no normal pages.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name });
      validateSubpageVisibility(entry, entry, null);
      assignedPages.forEach((page) => {
        const resolved = subpageResolved(entry, page.id), offset = subpageOffset(entry, page.id);
        if (resolved.width > state.width || resolved.height > state.height || offset.x < 0 || offset.y < 0 || offset.x + resolved.width > state.width || offset.y + resolved.height > state.height)
          add("warning", `Subpage “${entry.name}” exceeds the panel bounds on “${page.name}”.`, { category: "Subpages", pageId: page.id, pageName: page.name });
        if (entry.instanceOverrides?.[page.id]?.visibilityEnabled || entry.instanceOverrides?.[page.id]?.visibility)
          validateSubpageVisibility(entry, resolved, page);
      });
      Object.entries(entry.deviceOverrides || {}).forEach(([target, override]) => {
        if (Number(override.width) > Number(override.panelWidth) || Number(override.height) > Number(override.panelHeight))
          add("warning", `Subpage “${entry.name}” exceeds its saved ${target} responsive panel dimensions.`, { category: "Subpages", pageId: masterPage.id, pageName: masterPage.name });
      });
    });
    state.pages.filter((page) => !page.subpageMasterId).forEach((page) => {
      const placements = state.subpages.filter((entry) => subpageApplies(entry, page.id)).map((entry) => {
        const resolved = subpageResolved(entry, page.id), offset = subpageOffset(entry, page.id);
        return { entry, resolved, x: offset.x, y: offset.y };
      });
      for (let index = 0; index < placements.length; index++) for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex++) {
        const a = placements[index], b = placements[otherIndex], overlap = a.x < b.x + b.resolved.width && a.x + a.resolved.width > b.x && a.y < b.y + b.resolved.height && a.y + a.resolved.height > b.y;
        if (overlap && Math.abs((Number(a.resolved.z) || 9000) - (Number(b.resolved.z) || 9000)) < 2)
          add("warning", `Subpages “${a.entry.name}” and “${b.entry.name}” overlap at similar z-index values on “${page.name}”.`, { category: "Subpages", pageId: page.id, pageName: page.name });
      }
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
        checkAsset(
          item.selectedGraphicAsset,
          `Page template “${template.name}”`,
        );
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
      capabilities = new Set(device.capabilities || []),
      validatedCustomComponents = new Set();
    state.items.forEach((item) => {
      const itemPage = state.pages.find((page) => page.id === item.pageId);
      validationContext = {
        pageId: item.pageId,
        pageName: itemPage?.name || "Missing page",
        itemId: item.id,
        itemName: item.name,
      };
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
          { fix: "fit-bounds" },
        );
      const safeMargin = Math.max(0, Number(item.layout?.safeMargin) || 0);
      if (
        safeMargin &&
        !window.ComposerResponsiveLayout.fitsSafeArea(
          item,
          { width: state.width, height: state.height },
          safeMargin,
        )
      )
        add(
          "warning",
          `“${item.name}” crosses its ${safeMargin}px safe margin.`,
        );
      if (item.w < 20 || item.h < 20)
        add("error", `“${item.name}” is smaller than the editor minimum.`, {
          fix: "editor-minimum",
        });
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
      else if (item.targetPage && masterPageIds.has(item.targetPage))
        add("error", `“${item.name}” navigation targets a subpage master, which is not a deployable page.`);
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
        else if (action.type === "navigate" && masterPageIds.has(action.target))
          add("error", `${owner} targets a subpage master, which is not a deployable page.`);
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
      if (item.componentId === "widget-list") {
        const properties = item.properties || {}, nestedId = String(properties.widgetType || "standard-button"), nested = window.ComposerRuntime.get(nestedId), owner = `Widget List “${item.name}”`;
        if (!nested || nestedId === "widget-list")
          add("error", `${owner} selects an unavailable or recursive included widget “${nestedId}”.`, { category: "Widget List" });
        else {
          if (unsupported.has(nestedId)) add("error", `${device.name} does not support ${owner}'s included “${nested.name}”.`, { category: "Widget List" });
          if (supported && !supported.has(nestedId)) add("warning", `${owner}'s included “${nested.name}” is not listed as supported by ${device.name}.`, { category: "Widget List" });
          (nested.requiresCapabilities || []).forEach(capability => { if (!capabilities.has(capability)) add("error", `${owner}'s included “${nested.name}” requires unsupported capability “${capability}”.`, { category: "Widget List" }); });
          const useDefault = properties.useWidgetDefaultSize === true || properties.useWidgetDefaultSize === 1 || properties.useWidgetDefaultSize === "1" || String(properties.useWidgetDefaultSize).toLowerCase() === "true",
            width = useDefault ? Number(nested.defaultSize?.width) || 220 : Number(properties.itemWidth) || 220,
            height = useDefault ? Number(nested.defaultSize?.height) || 120 : Number(properties.itemHeight) || 120,
            visible = widgetListVisibleCount(item), total = Math.max(1, Number(properties.defaultCount) || 1);
          if (width < 44 || height < 44) add("warning", `${owner} contains ${Math.round(width)} × ${Math.round(height)} touch targets; use at least 44 × 44 pixels.`, { category: "Widget List" });
          if (visible < total) add("warning", `${owner} shows ${visible} of ${total} items without scrolling on ${device.name}.`, { category: "Widget List" });
        }
        checkAsset(properties.includedGraphicAsset, owner);
        checkAsset(properties.includedSelectedGraphicAsset, owner);
        if (properties.includedNavigationTrigger && properties.includedNavigationTrigger !== "none" && !pageIds.has(properties.includedNavigationTarget))
          add("error", `${owner} targets a missing page for its shared ${properties.includedNavigationTrigger} navigation.`, { category: "Widget List" });
        const ranges = resolvedRangeBindings(definition, item).filter(range => !range.visibilitySelector), addresses = new Map();
        ranges.forEach(range => { const value = String(properties[range.baseKey] || range.defaultValue || "").trim(); if (!value) add("error", `${owner}'s ${range.name} range has no address.`, { category: "Widget List" }); else { const signature = `${range.type}:${range.direction}:${value}`; if (addresses.has(signature)) add("error", `${owner} assigns “${value}” to both ${addresses.get(signature)} and ${range.name}.`, { category: "Widget List" }); else addresses.set(signature, range.name); } });
        if (Math.max(1, Number(properties.defaultCount) || 1) > 12 && Math.max(1, Number(properties.includedMaxEffects) || 6) > 8)
          add("warning", `${owner} allows more than eight simultaneous effects across a large list; reduce the effect limit for touch-panel performance.`, { category: "Widget List" });
      }
      (definition.requiresCapabilities || []).forEach((capability) => {
        if (!capabilities.has(capability))
          add(
            "error",
            `“${item.name}” requires unsupported panel capability “${capability}”.`,
          );
      });
      const customEntry = state.customComponents.find(
        (entry) => entry.id === item.componentId,
      );
      if (customEntry && !validatedCustomComponents.has(customEntry.id)) {
        validatedCustomComponents.add(customEntry.id);
        const propertyKeys = new Set(
            (customEntry.properties || []).map((entry) => entry.key),
          ),
          signalKeys = new Set(
            (customEntry.signals || []).map((entry) => entry.key),
          ),
          sourceDocument = new DOMParser().parseFromString(
            customEntry.html || "",
            "text/html",
          );
        (customEntry.behaviors || []).forEach((behavior, index) => {
          const sourceKeys =
            behavior.source === "property" ? propertyKeys : signalKeys;
          if (!sourceKeys.has(behavior.key))
            add(
              "error",
              `“${customEntry.name}” behavior ${index + 1} references missing ${behavior.source === "property" ? "property" : "signal"} “${behavior.key}”.`,
              { category: "Custom components" },
            );
          try {
            if (
              behavior.selector &&
              !sourceDocument.querySelector(behavior.selector)
            )
              add(
                "error",
                `“${customEntry.name}” behavior ${index + 1} target “${behavior.selector}” does not exist.`,
                { category: "Custom components" },
              );
          } catch (_) {
            add(
              "error",
              `“${customEntry.name}” behavior ${index + 1} has invalid selector “${behavior.selector}”.`,
              { category: "Custom components" },
            );
          }
        });
        customComponentDependencyReport(customEntry).errors.forEach((message) =>
          add("error", `“${customEntry.name}”: ${message}`, {
            category: "Custom components",
          }),
        );
      }
    });
    validationContext = {};
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
            ? state.pages
                .map((page) => page.id)
                .filter((pageId) => itemVisibleOnPage(item, pageId))
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
        const rowItem = state.items.find((item) => item.id === row.itemId),
          rowPage = state.pages.find((page) => page.id === row.pageId);
        validationContext = {
          itemId: row.itemId || rowItem?.id || "",
          itemName: row.widget || rowItem?.name || "",
          pageId: row.pageId || rowItem?.pageId || "",
          pageName: row.page || rowPage?.name || "",
        };
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
    validationContext = {};
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
    try {
      const performance = projectPerformanceAudit(),
        compactPanel = state.width <= 1280 || state.height <= 800,
        widgetWarning = compactPanel ? 60 : 100,
        animationWarning = compactPanel ? 8 : 14;
      lastPerformanceMetrics = performance;
      state.assets.forEach((asset) => {
        const bytes = embeddedDataBytes(asset.dataUrl);
        if (bytes > 4 * 1024 * 1024)
          add(
            "warning",
            `Asset “${asset.name || asset.id}” is ${formatMetricBytes(bytes)}; optimize it for faster panel startup.`,
            { category: "Performance" },
          );
      });
      if (performance.embeddedAssetBytes > 20 * 1024 * 1024)
        add(
          "warning",
          `Embedded assets total ${formatMetricBytes(performance.embeddedAssetBytes)}; panel startup and deployment may be slower.`,
          { category: "Performance" },
        );
      if (performance.exportedBytes > 30 * 1024 * 1024)
        add(
          "warning",
          `Exported HTML is ${formatMetricBytes(performance.exportedBytes)} before CH5 packaging.`,
          { category: "Performance" },
        );
      performance.pageLoads.forEach(({ page, items, animated }) => {
        if (items.length > widgetWarning)
          add(
            "warning",
            `Page “${page.name}” renders ${items.length} widgets; ${device.name} may respond more slowly.`,
            {
              category: "Performance",
              pageId: page.id,
              pageName: page.name,
            },
          );
        if (animated.length > animationWarning)
          add(
            "warning",
            `Page “${page.name}” has ${animated.length} continuously or heavily animated widgets.`,
            {
              category: "Performance",
              pageId: page.id,
              pageName: page.name,
            },
          );
      });
      state.customComponents.forEach((component) => {
        const bytes = new TextEncoder().encode(
          `${component.html || ""}${component.css || ""}${component.javascript || ""}`,
        ).length;
        if (bytes > 250 * 1024)
          add(
            "warning",
            `Custom component “${component.name}” contains ${formatMetricBytes(bytes)} of source code.`,
            { category: "Performance" },
          );
      });
    } catch (error) {
      lastPerformanceMetrics = null;
      add("warning", `Performance audit could not complete: ${error.message}.`, {
        category: "Performance",
      });
    }
    const usability = projectUsabilityAudit();
    lastUsabilityMetrics = usability;
    usability.issues.forEach(({ severity, message, item, fix, fixData }) => {
      const page = state.pages.find((entry) => entry.id === item.pageId);
      add(severity, message, {
        category: "Touch usability",
        pageId: item.pageId,
        pageName: page?.name || "",
        itemId: item.id,
        itemName: item.name,
        fix,
        fixData,
      });
    });
    for (let a = 0; a < state.items.length; a++)
      for (let b = a + 1; b < state.items.length; b++) {
        const x = state.items[a],
          y = state.items[b];
        if (x.systemManaged || y.systemManaged || x.hidden || y.hidden) continue;
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
            {
              pageId: x.pageId,
              pageName:
                state.pages.find((page) => page.id === x.pageId)?.name || "",
              itemId: x.id,
              itemName: x.name,
              category: "Layout",
            },
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
  function setHealthDisplayMode(dashboard, showMetrics = false) {
    $("health-dashboard-tools").hidden = !dashboard;
    $("health-dashboard").hidden = !dashboard;
    $("health-report").hidden = dashboard;
    $("health-metrics").hidden = !dashboard || !showMetrics;
  }
  function renderHealthMetrics() {
    const host = $("health-metrics"),
      metrics = lastPerformanceMetrics,
      compact = state.width <= 1280 || state.height <= 800,
      limits = {
        widgets: compact ? [45, 60] : [75, 100],
        animations: compact ? [4, 8] : [8, 14],
        pageScore: compact ? [80, 115] : [130, 180],
        filters: compact ? [3, 8] : [6, 12],
        assets: [10 * 1024 * 1024, 20 * 1024 * 1024],
        html: [15 * 1024 * 1024, 30 * 1024 * 1024],
        custom: [500 * 1024, 2 * 1024 * 1024],
        touch: [0, 5],
      },
      rating = (value, thresholds) =>
        Number(value) > thresholds[1] ? "high" : Number(value) > thresholds[0] ? "caution" : "recommended";
    host.replaceChildren();
    if (!metrics) return;
    [
      [metrics.peakWidgets, metrics.peakWidgets, "Peak widgets / page", `The greatest number visible on one page. Guideline for this target: recommended ≤${limits.widgets[0]}, caution ${limits.widgets[0] + 1}–${limits.widgets[1]}, high >${limits.widgets[1]}.`, limits.widgets],
      [metrics.peakAnimations, metrics.peakAnimations, "Peak animation load", `Continuously animated or animation-heavy widgets on one page. Recommended ≤${limits.animations[0]}, caution ${limits.animations[0] + 1}–${limits.animations[1]}, high >${limits.animations[1]}.`, limits.animations],
      [metrics.peakPageScore || 0, metrics.peakPageScore || 0, "Peak page cost", `Relative complexity score; it is not a measured frame rate (FPS). Recommended ≤${limits.pageScore[0]}, caution ${limits.pageScore[0] + 1}–${limits.pageScore[1]}, high ≥${limits.pageScore[1]}.`, limits.pageScore],
      [metrics.strongFilterWidgets || 0, metrics.strongFilterWidgets || 0, "Strong-filter widgets", `Widgets using large glow, blur, or shadow values. Recommended ≤${limits.filters[0]}, caution ${limits.filters[0] + 1}–${limits.filters[1]}, high >${limits.filters[1]}.`, limits.filters],
      [formatMetricBytes(metrics.embeddedAssetBytes), metrics.embeddedAssetBytes, "Embedded assets", "Decoded project assets. Recommended ≤10 MB, caution 10–20 MB, high >20 MB. Optimize large images and audio.", limits.assets],
      [formatMetricBytes(metrics.exportedBytes), metrics.exportedBytes, "Exported HTML", "Uncompressed generated project size. Recommended ≤15 MB, caution 15–30 MB, high >30 MB.", limits.html],
      [formatMetricBytes(metrics.customSourceBytes), metrics.customSourceBytes, "Custom source", "Combined custom HTML/CSS/JavaScript. Recommended ≤500 KB, caution 500 KB–2 MB, high >2 MB.", limits.custom],
      [lastUsabilityMetrics?.smallTargets || 0, lastUsabilityMetrics?.smallTargets || 0, "Small touch targets", "Controls below the recommended touch area. Recommended 0, caution 1–5, high >5. Enlarge interactive controls where possible.", limits.touch],
    ].forEach(([value, rawValue, label, note, thresholds]) => {
      const card = document.createElement("div"),
        strong = document.createElement("strong"),
        caption = document.createElement("span"),
        help = document.createElement("button");
      card.className = `health-metric ${rating(rawValue, thresholds)}`;
      strong.textContent = value;
      caption.textContent = label;
      help.type = "button";
      help.className = "health-metric-help";
      help.textContent = "?";
      help.title = note;
      help.setAttribute("aria-label", `${label}: ${note}`);
      help.onclick = () => alert(`${label}\n\n${note}`);
      caption.append(" ", help);
      card.append(strong, caption);
      host.append(card);
    });
    const guide = document.createElement("div");
    guide.className = "performance-guidelines";
    guide.innerHTML = `<strong>Guidelines for ${compact ? "1280 × 800-class touch panels" : "larger displays"}</strong><span><i class="recommended"></i> Recommended: suitable starting target</span><span><i class="caution"></i> Caution: test carefully on the actual panel</span><span><i class="high"></i> High: simplify before deployment when possible</span><small>These are conservative Composer engineering guidelines, not hard Crestron limits. Final approval should include startup, animation, scrolling, and touch-response testing on the lowest-powered target panel.</small>`;
    host.append(guide);
  }
  function navigateToHealthIssue(issue) {
    const item = issue.itemId
        ? state.items.find((entry) => entry.id === issue.itemId)
        : null,
      pageId = issue.pageId || item?.pageId;
    if (pageId && state.pages.some((page) => page.id === pageId)) {
      state.activePage = pageId;
      renderPage();
    }
    if (item) select(item.id);
    $("health-dialog").close();
    setStatus(
      item
        ? `Opened ${issue.pageName || "page"} · “${item.name}”`
        : `Opened ${issue.pageName || "project issue"}`,
    );
  }
  function applyHealthFix(issue) {
    const item = issue.itemId
        ? state.items.find((entry) => entry.id === issue.itemId)
        : null,
      page = issue.pageId
        ? state.pages.find((entry) => entry.id === issue.pageId)
        : null;
    switch (issue.fix) {
      case "active-page":
        if (state.pages[0]) state.activePage = state.pages[0].id;
        break;
      case "page-name":
        if (page) page.name = `Page ${state.pages.indexOf(page) + 1}`;
        break;
      case "unique-page-name":
        if (page) {
          const base = String(page.name || "Page").trim() || "Page";
          let suffix = 2;
          while (
            state.pages.some(
              (entry) =>
                entry !== page &&
                String(entry.name || "").toLowerCase() ===
                  `${base} ${suffix}`.toLowerCase(),
            )
          )
            suffix++;
          page.name = `${base} ${suffix}`;
        }
        break;
      case "fit-bounds":
        if (item) {
          item.w = Math.min(state.width, Math.max(20, Number(item.w) || 20));
          item.h = Math.min(state.height, Math.max(20, Number(item.h) || 20));
          item.x = Math.min(state.width - item.w, Math.max(0, Number(item.x) || 0));
          item.y = Math.min(state.height - item.h, Math.max(0, Number(item.y) || 0));
        }
        break;
      case "editor-minimum":
        if (item) {
          item.w = Math.min(state.width, Math.max(20, Number(item.w) || 20));
          item.h = Math.min(state.height, Math.max(20, Number(item.h) || 20));
        }
        break;
      case "touch-minimum":
        if (item) {
          item.w = Math.min(state.width, Math.max(44, Number(item.w) || 44));
          item.h = Math.min(state.height, Math.max(44, Number(item.h) || 44));
          item.x = Math.min(state.width - item.w, Math.max(0, item.x));
          item.y = Math.min(state.height - item.h, Math.max(0, item.y));
        }
        break;
      case "minimum-type":
        if (item && issue.fixData?.propertyKey) {
          item.properties ||= {};
          item.properties[issue.fixData.propertyKey] = 12;
        }
        break;
      default:
        return false;
    }
    return true;
  }
  function finishHealthFixes(count) {
    if (!count) return;
    renderPages();
    renderPage();
    commitHistory();
    runValidation(true);
    setStatus(`Fixed ${count} project health issue${count === 1 ? "" : "s"}`);
  }
  function fixHealthIssue(issue) {
    finishHealthFixes(applyHealthFix(issue) ? 1 : 0);
  }
  function fixAllHealthIssues() {
    let count = 0;
    lastHealthIssues.filter((issue) => issue.fix).forEach((issue) => {
      if (applyHealthFix(issue)) count++;
    });
    finishHealthFixes(count);
  }
  function renderHealthDashboard() {
    const host = $("health-dashboard"),
      search = String($("health-search").value || "").trim().toLowerCase(),
      visible = lastHealthIssues.filter((issue) => {
        if (
          healthIssueFilter !== "all" &&
          issue.severity !== healthIssueFilter
        )
          return false;
        return (
          !search ||
          [
            issue.message,
            issue.category,
            issue.pageName,
            issue.itemName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        );
      }),
      groups = new Map();
    host.replaceChildren();
    visible.forEach((issue) => {
      const groupName = issue.pageName || "Project-wide",
        key = `${groupName}\u0000${issue.category}`;
      if (!groups.has(key))
        groups.set(key, {
          title: `${groupName} — ${issue.category}`,
          issues: [],
        });
      groups.get(key).issues.push(issue);
    });
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "hint health-empty";
      empty.textContent = lastHealthIssues.length
        ? "No issues match the current filter."
        : "Validation passed. No project issues were found.";
      host.append(empty);
      return;
    }
    groups.forEach((group) => {
      const section = document.createElement("section"),
        heading = document.createElement("h3");
      section.className = "health-group";
      heading.textContent = `${group.title} (${group.issues.length})`;
      section.append(heading);
      group.issues.forEach((issue) => {
        const row = document.createElement("div"),
          severity = document.createElement("span"),
          message = document.createElement("div");
        row.className = `health-issue ${issue.severity}`;
        severity.className = "health-severity";
        severity.textContent = issue.severity;
        message.className = "health-message";
        message.textContent = issue.message;
        if (issue.itemName) {
          const context = document.createElement("small");
          context.textContent = `Widget: ${issue.itemName}`;
          message.append(context);
        }
        row.append(severity, message);
        if (issue.pageId || issue.itemId || issue.fix) {
          const actions = document.createElement("div");
          actions.className = "health-actions";
          if (issue.fix) {
            const fix = document.createElement("button");
            fix.type = "button";
            fix.className = "health-fix";
            fix.textContent = "Quick fix";
            fix.onclick = () => fixHealthIssue(issue);
            actions.append(fix);
          }
          if (issue.pageId || issue.itemId) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Go to problem";
          button.onclick = () => navigateToHealthIssue(issue);
            actions.append(button);
          }
          row.append(actions);
        }
        section.append(row);
      });
      host.append(section);
    });
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
      issues.length
        ? validationReport(issues)
        : "0 error(s), 0 warning(s)\n\nValidation passed. No project issues were found.",
    ].join("\n");
    if (interactive) {
      lastHealthIssues = issues;
      healthIssueFilter = "all";
      $("health-search").value = "";
      document
        .querySelectorAll("[data-health-filter]")
        .forEach((button) =>
          button.classList.toggle(
            "active",
            button.dataset.healthFilter === healthIssueFilter,
          ),
        );
      setHealthDisplayMode(true, false);
      renderHealthDashboard();
      $("health-fix-all").disabled = !issues.some((issue) => issue.fix);
      $("health-title").textContent = "Project health report";
      $("compatibility-device").hidden = true;
      $("compatibility-preview").hidden = true;
      $("compatibility-autofit").hidden = true;
      $("health-summary").textContent = issues.length
        ? `${errors.length} error(s), ${issues.length - errors.length} warning(s)`
        : "No project issues were found.";
      $("health-report").textContent = lastHealthReport;
      if (!$("health-dialog").open) $("health-dialog").showModal();
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
    setHealthDisplayMode(false);
    $("health-title").textContent = "Export/build self-test";
    $("health-summary").textContent =
      "Running widget export and Crestron CLI package checks…";
    $("health-report").textContent =
      "Preparing the complete widget catalog. This can take several seconds.";
    $("compatibility-device").hidden = true;
    $("compatibility-preview").hidden = true;
    $("compatibility-autofit").hidden = true;
    if (!dialog.open) dialog.showModal();
    setStatus("Running export/build self-test…");
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
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
      errors = projectResult.errors.map(
        (issue) => `Current project: ${issue.message}`,
      ),
      validTypes = new Set(["digital", "analog", "serial"]),
      validDirections = new Set(["input", "output"]);
    const translatedAcceptance = runTranslatedComponentAcceptance();
    errors.push(...translatedAcceptance.errors);
    const workflowAcceptance = runProjectWorkflowAcceptance();
    errors.push(...workflowAcceptance.errors);
    definitions.forEach((definition) => {
      const properties = new Map(
        (definition.properties || []).map((property) => [
          property.key,
          property,
        ]),
      );
      (definition.signals || []).forEach((signal) => {
        if (!signal.key) errors.push(`${definition.name}: signal has no key`);
        if (!validTypes.has(signal.type))
          errors.push(
            `${definition.name}.${signal.key}: invalid type ${signal.type}`,
          );
        if (!validDirections.has(signal.direction))
          errors.push(
            `${definition.name}.${signal.key}: invalid direction ${signal.direction}`,
          );
        if (
          signal.defaultValue &&
          !window.ComposerRuntime.resolveAddress(
            signal.defaultValue,
            signal.type,
            signal.direction,
            `SelfTest.${definition.id}`,
          )
        )
          errors.push(
            `${definition.name}.${signal.key}: address does not resolve`,
          );
      });
      [
        ...(definition.addressBindings || []).map((binding) => ({
          ...binding,
          propertyKey: binding.key,
        })),
        ...(definition.rangeBindings || []).map((binding) => ({
          ...binding,
          propertyKey: binding.baseKey,
        })),
      ].forEach((binding) => {
        const property = properties.get(binding.propertyKey);
        if (!property)
          errors.push(
            `${definition.name}: binding references missing property ${binding.propertyKey}`,
          );
        else if (!String(property.defaultValue || "").trim())
          errors.push(
            `${definition.name}.${binding.propertyKey}: binding has no default address`,
          );
      });
    });
    if (errors.length) {
      lastHealthReport = [
        "EXPORT/BUILD SELF-TEST — FAILED",
        "",
        ...errors.map((error) => `- ${error}`),
      ].join("\n");
      $("health-title").textContent = "Export/build self-test";
      $("health-summary").textContent =
        `${errors.length} blocking problem${errors.length === 1 ? "" : "s"} found.`;
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
        properties: Object.fromEntries(
          (definition.properties || []).map((property) => [
            property.key,
            property.defaultValue,
          ]),
        ),
        signalBindings: Object.fromEntries(
          (definition.signals || []).map((signal) => [
            signal.key,
            {
              mode: /^\d+$/.test(String(signal.defaultValue || ""))
                ? "join"
                : "contract",
              value: signal.defaultValue || "",
            },
          ]),
        ),
      })),
      catalog = {
        version: window.ComposerProjectMigrations.CURRENT_VERSION,
        width: columns * cellWidth,
        height: Math.ceil(items.length / columns) * cellHeight,
        targetDevice: "self-test",
        pages: [
          {
            id: "self-test-page",
            name: "Widget Catalog",
            background: "#182126",
            bindingMode: "none",
          },
        ],
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
      throw new Error(
        "The catalog export is missing its runtime or page markup.",
      );
    if (!native) {
      alert(
        "The HTML catalog passed. CH5 archive verification requires the Windows application.",
      );
      return;
    }
    setStatus(
      `Testing export and CH5 build for ${definitions.length} widgets…`,
    );
    try {
      const result = await nativeRequest("buildSelfTest", {
        html,
        device: {
          id: "self-test",
          width: catalog.width,
          height: catalog.height,
        },
      });
      lastHealthReport = [
        "EXPORT/BUILD SELF-TEST — PASSED",
        `Generated: ${new Date().toLocaleString()}`,
        `Widgets exported: ${definitions.length}`,
        `Component scripts loaded: ${state.components.length}`,
        `Current project assets validated: ${state.assets.length}`,
        `Import & Translate behaviors validated: ${translatedAcceptance.behaviorCount}`,
        `Custom package assets round-tripped: ${translatedAcceptance.packageAssetCount}`,
        `Project workflow checks passed: ${workflowAcceptance.checks.length}`,
        `Temporary CH5Z size: ${Math.ceil(result.size / 1024)} KB`,
        `Crestron CLI build time: ${result.elapsedMilliseconds} ms`,
        "",
        "The temporary archive contained a manifest, .ch5 payload, index.html, and CrComLib runtime.",
      ].join("\n");
      $("health-title").textContent = "Export/build self-test";
      $("health-summary").textContent =
        `PASS — ${definitions.length} widgets exported and a temporary CH5Z was validated.`;
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

  function runProjectWorkflowAcceptance() {
    const errors = [],
      checks = [],
      expect = (condition, message) => {
        if (condition) checks.push(message);
        else errors.push(`Project workflow: ${message}`);
      };
    try {
      const source = structuredClone(project()),
        serialized = JSON.stringify(source),
        parsed = JSON.parse(serialized),
        integrityErrors = projectIntegrityErrors(parsed),
        migrated = window.ComposerProjectMigrations.migrate(parsed).project,
        exported = window.ComposerExporter.exportProject(migrated),
        recovery = recoveryIntegrity({
          project: parsed,
          checksum: recoveryFingerprint(parsed),
        });
      expect(serialized.length > 0, "project serialized to JSON");
      expect(!integrityErrors.length, "saved project passed structural integrity");
      expect(
        migrated.version === window.ComposerProjectMigrations.CURRENT_VERSION,
        "saved project reopened at the current format version",
      );
      expect(
        migrated.pages.length === source.pages.length,
        "page count survived save/open round trip",
      );
      expect(
        migrated.items.length === source.items.length,
        "widget count survived save/open round trip",
      );
      expect(
        migrated.assets.length === source.assets.length,
        "asset count survived save/open round trip",
      );
      expect(
        migrated.pages.some((page) => page.id === migrated.activePage),
        "active page survived save/open round trip",
      );
      expect(recovery.valid, "recovery snapshot checksum and structure validated");
      expect(
        exported.includes('<script src="cr-com-lib.js">'),
        "export included the Crestron signal runtime",
      );
      migrated.pages.forEach((page) =>
        expect(
          exported.includes(`id="${page.id}"`),
          `export included page “${page.name}”`,
        ),
      );
      migrated.items.forEach((item) =>
        expect(
          exported.includes(`data-instance="${item.id}"`),
          `export included widget “${item.name}”`,
        ),
      );
      const ids = migrated.items.map((item) => item.id);
      expect(new Set(ids).size === ids.length, "widget IDs remained unique");
    } catch (error) {
      errors.push(
        `Project workflow threw an exception: ${error.message || error}`,
      );
    }
    return { errors, checks };
  }

  function runTranslatedComponentAcceptance() {
    const fixture = `<!doctype html><html><head><style>
      :root{--accent:#04dcb9}.fixture-button{border:1px solid #7ba7a3}
      .fixture-fill{width:35%;height:8px;background:var(--accent)}
      @keyframes fixturePulse{from{opacity:.5}to{opacity:1}}
    </style></head><body>
      <p>System level</p>
      <button class="fixture-button"><span>Apply</span></button>
      <input type="text" value="Room name">
      <input type="range" min="0" max="100" value="35">
      <div class="fixture-fill" role="progressbar" aria-valuenow="35"></div>
      <nav><button>One</button><button>Two</button><button>Three</button></nav>
      <script>
        const applyButton=document.querySelector('.fixture-button');
        applyButton.addEventListener('click',()=>applyButton.classList.toggle('active'));
        applyButton.style.setProperty('--level',50);
        applyButton.textContent='Ready';
        const fixtureItems=document.querySelectorAll('nav button');
        fixtureItems.forEach(item=>item.addEventListener('click',()=>item.classList.toggle('selected')));
        setTimeout(()=>applyButton.classList.add('ready'),250);
      </script>
    </body></html>`,
      analyzed = analyzeSnippet("translator-acceptance.html", fixture),
      detected = analyzed.features,
      properties = [
        { key: "textSize" },
        { key: "textColor" },
        { key: "faceColor" },
        { key: "selectedFaceColor" },
        { key: "borderColor" },
        { key: "selectedBorderColor" },
        { key: "glowColor" },
        { key: "selectedGlowColor" },
        { key: "glowStrength" },
        { key: "cornerRadius" },
        ...(detected.textKeys || []).map((key) => ({ key })),
      ],
      signals = [
        { key: "press" },
        { key: "selected" },
        { key: "name" },
        { key: "disabled" },
        { key: "visibility" },
        { key: "feedback1" },
        { key: "set1" },
        { key: "feedback2" },
        { key: "text" },
      ],
      plan = translatedBehaviorPlan(properties, signals, detected, "text"),
      errors = [],
      has = (source, key, action) =>
        plan.behaviors.some(
          (rule) =>
            rule.source === source &&
            rule.key === key &&
            (!action || rule.action === action),
        ),
      expect = (condition, message) => {
        if (!condition) errors.push(`Import & Translate: ${message}`);
      };
    expect(detected.buttonCount === 1, "standalone button detection failed");
    expect(
      detected.repeatedItems?.defaultCount === 3,
      "repeated-button detection failed",
    );
    expect(detected.numericCount === 2, "numeric control detection failed");
    expect(
      detected.interactiveNumericCount === 1,
      "interactive analog detection failed",
    );
    expect(
      detected.inferredBehaviors.some((entry) => entry.kind === "event") &&
        detected.inferredBehaviors.some((entry) => entry.kind === "class") &&
        detected.inferredBehaviors.some((entry) => entry.kind === "css-variable") &&
        detected.inferredBehaviors.some((entry) => entry.kind === "collection-event") &&
        detected.inferredBehaviors.some((entry) => entry.kind === "animation"),
      "CSS/JavaScript behavior inference failed",
    );
    expect(
      detected.inferenceSuggestions.some(
        (entry) => entry.title === "Repeated interactive collection",
      ) &&
        detected.inferenceSuggestions.some(
          (entry) => entry.title === "Timer-controlled behavior",
        ),
      "complex behavior suggestions failed",
    );
    expect(has("signal-output", "press", "press"), "Press output is missing");
    expect(
      has("signal-input", "selected", "selectedClass"),
      "Selected feedback is missing",
    );
    expect(has("signal-input", "name", "text"), "serial Name feedback is missing");
    expect(has("signal-output", "text", "input"), "serial text output is missing");
    expect(has("signal-input", "feedback1", "value"), "slider Feedback is missing");
    expect(has("signal-output", "set1", "input"), "slider Value Set is missing");
    expect(has("signal-input", "feedback2", "width"), "fill Feedback is missing");
    expect(has("signal-input", "visibility", "visibility"), "Visibility is missing");
    expect(has("signal-input", "disabled", "disabledState"), "Disabled is missing");
    expect(
      plan.stateStyles?.states?.standard && plan.stateStyles?.states?.selected,
      "Standard and Selected visual states are missing",
    );
    expect(
      analyzed.html.includes("data-translated-repeat-container") &&
        analyzed.html.includes('data-translated-numeric="0"'),
      "translated selectors were not written to the component markup",
    );
    const packageAsset = {
        id: "translator-acceptance-asset",
        name: "acceptance.svg",
        type: "image/svg+xml",
        dataUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
      },
      packageEntry = {
        id: "custom-translator-acceptance",
        name: "Translator Acceptance",
        category: "Custom",
        icon: "🧪",
        version: "1.0.0",
        html: analyzed.html,
        defaultSize: { width: 480, height: 280 },
        properties: [
          ...properties,
          {
            key: "standardAsset",
            name: "Standard asset",
            type: "asset",
            defaultValue: packageAsset.id,
          },
        ],
        signals,
        behaviors: plan.behaviors,
        stateStyles: {
          ...plan.stateStyles,
          states: {
            ...plan.stateStyles.states,
            standard: {
              ...plan.stateStyles.states.standard,
              asset: packageAsset.id,
              assetData: packageAsset.dataUrl,
            },
          },
        },
        repeatedItems: detected.repeatedItems,
        rangeBindings: [
          { baseKey: "repeatPressBase", patternKey: "repeatPressPattern" },
        ],
      },
      packageValue = createCustomComponentPackage(packageEntry, [packageAsset]),
      serialized = JSON.stringify(packageValue),
      imported = parseCustomComponentPackage(JSON.parse(serialized)),
      restoredAssets = [],
      restoredCount = restoreCustomComponentDependencies(
        packageValue,
        imported,
        restoredAssets,
      );
    expect(packageValue.version === 3, "component package version is not current");
    expect(restoredCount === 1, "embedded asset was not restored");
    expect(restoredAssets[0]?.dataUrl === packageAsset.dataUrl, "embedded asset data changed");
    expect(imported.behaviors.length === plan.behaviors.length, "generated behaviors changed during package round trip");
    expect(!!imported.stateStyles?.states?.selected, "visual states changed during package round trip");
    expect(imported.repeatedItems?.defaultCount === 3, "repeated-item settings changed during package round trip");
    expect(imported.rangeBindings?.length === 1, "range bindings changed during package round trip");
    return {
      errors,
      behaviorCount: plan.behaviors.length,
      packageAssetCount: packageValue.dependencies.assets.length,
    };
  }
  function runPanelCompatibility() {
    setHealthDisplayMode(false);
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
      const key = panelLayoutKey(device.id, device.width, device.height),
        problems = [];
      state.items.forEach((item) => {
        const layout = layoutDefaults(item),
          saved = item.deviceOverrides[key],
          rect =
            saved ||
            window.ComposerResponsiveLayout.adaptRect(
              item,
              { width: state.width, height: state.height },
              { width: device.width, height: device.height },
              layout,
            ),
          margin = Math.max(0, Number(layout.safeMargin) || 0),
          page =
            state.pages.find((entry) => entry.id === item.pageId)?.name ||
            "Unknown page";
        if (
          !window.ComposerResponsiveLayout.fitsSafeArea(
            rect,
            { width: device.width, height: device.height },
            margin,
          )
        )
          problems.push(
            `${page} / ${item.name}: ${rect.x},${rect.y} ${rect.w}×${rect.h}${margin ? ` (safe margin ${margin}px)` : ""}`,
          );
      });
      if (device.supportsCh5 === false)
        problems.unshift("This panel does not support CH5 projects.");
      problemCount += problems.length;
      lines.push(
        `${device.name} — ${device.width} × ${device.height}: ${problems.length ? `${problems.length} issue(s)` : "PASS"}`,
      );
      problems.forEach((problem) => lines.push(`  - ${problem}`));
      lines.push("");
    });
    lastHealthReport = lines.join("\n");
    $("health-title").textContent = "Panel compatibility report";
    const profileSelect = $("compatibility-device");
    profileSelect.innerHTML = profiles
      .map(
        (device) =>
          `<option value="${device.id}">${device.name} — ${device.width} × ${device.height}</option>`,
      )
      .join("");
    profileSelect.value = profiles.some(
      (device) => device.id === state.targetDevice,
    )
      ? state.targetDevice
      : profiles[0]?.id || "";
    profileSelect.hidden = false;
    $("compatibility-preview").hidden = false;
    $("compatibility-autofit").hidden = false;
    $("health-summary").textContent = problemCount
      ? `${problemCount} layout issue(s) across ${profiles.length} panel profiles.`
      : `All ${profiles.length} panel profiles fit.`;
    $("health-report").textContent = lastHealthReport;
    $("health-dialog").showModal();
    setStatus(
      problemCount
        ? `${problemCount} panel fit issues found`
        : "All panel profiles fit",
    );
  }
  async function createProjectBackup(reason = "manual") {
    if (!native)
      throw new Error(
        "Project backups are available in the Windows application.",
      );
    return nativeRequest("createProjectBackup", {
      contents: JSON.stringify(project(), null, 2),
      name: state.contract.name || "CrestronUiProject",
      reason,
    });
  }
  async function renderProjectBackups() {
    const host = $("backup-list");
    host.innerHTML =
      '<p class="hint" style="padding:14px">Loading backups…</p>';
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
          if (
            !confirm(
              `Restore “${backup.name}”? The current project will be backed up first.`,
            )
          )
            return;
          try {
            await createProjectBackup("before-restore");
            const result = await nativeRequest("readProjectBackup", {
              path: backup.path,
            });
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
      if (!backups.length)
        host.innerHTML =
          '<p class="hint" style="padding:14px">No project backups have been created yet.</p>';
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
    const host = $("storage-location-list"),
      settings = await nativeRequest("getStorageSettings");
    host.innerHTML = "";
    Object.entries(storageLabels).forEach(([key, label]) => {
      const row = document.createElement("div"),
        name = document.createElement("strong"),
        path = document.createElement("div"),
        choose = document.createElement("button"),
        open = document.createElement("button");
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
        } catch (error) {
          if (error.message !== "cancelled") alert(error.message);
        }
      };
      open.onclick = () =>
        nativeRequest("openStorageFolder", { key }).catch((error) =>
          alert(error.message),
        );
      row.append(name, path, choose, open);
      host.appendChild(row);
    });
  }
  async function checkForUpdates() {
    const dialog = $("update-dialog"),
      downloadButton = $("update-download");
    $("update-summary").textContent = "Checking the public GitHub repository…";
    $("update-current-version").textContent = "—";
    $("update-latest-version").textContent = "—";
    $("update-notes").textContent = "";
    downloadButton.hidden = true;
    if (!dialog.open) dialog.showModal();
    if (!native) {
      $("update-summary").textContent =
        "Update checking is available in the Windows application.";
      return;
    }
    try {
      const result = await nativeRequest("checkForUpdates");
      $("update-current-version").textContent = result.currentVersion;
      $("update-latest-version").textContent =
        result.latestVersion || "No published release";
      $("update-notes").textContent =
        result.releaseNotes || "No GitHub release has been published yet.";
      $("update-summary").textContent = result.updateAvailable
        ? `Version ${result.latestVersion} is available.`
        : result.latestVersion
          ? "You have the latest published version."
          : "No published releases were found.";
      if (result.downloadUrl || result.releaseUrl) {
        downloadButton.hidden = !result.updateAvailable;
        downloadButton.onclick = () =>
          nativeRequest(
            "openExternalUrl",
            result.downloadUrl || result.releaseUrl,
          ).catch((error) => alert(error.message));
      }
    } catch (error) {
      $("update-summary").textContent = "The update check failed.";
      $("update-notes").textContent = error.message;
    }
  }
  function selectedCompatibilityDevice() {
    return deviceProfiles.find(
      (device) => device.id === $("compatibility-device").value,
    );
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
      items = state.items.filter((item) =>
        itemVisibleOnPage(item, state.activePage),
      );
    let changed = 0;
    items.forEach((item) => {
      const margin = Math.max(0, Number(layoutDefaults(item).safeMargin) || 0),
        availableWidth = Math.max(20, state.width - margin * 2),
        availableHeight = Math.max(20, state.height - margin * 2),
        before = `${item.x},${item.y},${item.w},${item.h}`;
      item.w = Math.min(item.w, availableWidth);
      item.h = Math.min(item.h, availableHeight);
      item.x = Math.max(
        margin,
        Math.min(item.x, state.width - margin - item.w),
      );
      item.y = Math.max(
        margin,
        Math.min(item.y, state.height - margin - item.h),
      );
      item.deviceOverrides[key] = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        panelWidth: state.width,
        panelHeight: state.height,
      };
      if (before !== `${item.x},${item.y},${item.w},${item.h}`) changed++;
    });
    renderPage();
    commitHistory();
    runPanelCompatibility();
    setStatus(
      `Auto-fit ${changed} widget${changed === 1 ? "" : "s"} on ${currentPage().name} for ${device.name}`,
    );
  }
  function approveExport() {
    const fingerprint = recoveryFingerprint(project());
    if (fingerprint === lastApprovedPreflightFingerprint) return true;
    const result = runValidation(false);
    if (result.errors.length) {
      runValidation(true);
      setStatus(
        `Build/deploy blocked by ${result.errors.length} project health error${result.errors.length === 1 ? "" : "s"}`,
      );
      return false;
    }
    if (
      result.issues.length &&
      !confirm(
        validationReport(result.issues) +
          "\n\nContinue anyway? Choose Cancel to review these warnings in Project Health.",
      )
    ) {
      runValidation(true);
      return false;
    }
    lastApprovedPreflightFingerprint = fingerprint;
    setStatus("Project Health preflight passed");
    return true;
  }
  const acceptanceChecks = [
    ["Automatic", "health", "Project Health passes", "No blocking project, signal, navigation, asset, or panel problems."],
    ["Automatic", "roundtrip", "Save/open round trip", "Pages, widgets, assets, reusable symbols, custom components, and test results survive serialization."],
    ["Automatic", "export", "HTML runtime export", "Export contains pages, component runtime, CrComLib, Web XPanel, and interaction actions."],
    ["Automatic", "signals", "Signal coverage", "Representative digital, analog, serial, single-widget, and repeated-item bindings are present."],
    ["Automatic", "responsive", "Responsive target coverage", "Representative widgets have a saved alternate-panel override."],
    ["Automatic", "font", "Embedded custom font", "An imported font is selected and emitted through @font-face."],
    ["Editor", "editor-render", "Editor visual inspection", "All acceptance pages render without component errors, clipped glow, or unexpected overflow."],
    ["Editor", "editor-simulate", "Signal simulation", "Digital Selected, analog Feedback, and serial Name visibly update representative widgets."],
    ["Editor", "editor-navigation", "Navigation and actions", "Local navigation, contract page selection, timeline animation, and actions execute correctly."],
    ["Preview", "preview-render", "Preview rendering", "Layout, fonts, assets, animations, and widget states match the Editor."],
    ["Preview", "preview-signals", "Preview signal behavior", "Simulator-driven digital, analog, serial, and repeated-item behavior matches the Editor."],
    ["CH5 Desktop", "desktop-load", "CH5 Desktop load", "The same CH5Z opens without a blank page or component runtime errors."],
    ["CH5 Desktop", "desktop-signals", "CH5 Desktop communication", "Button presses and processor feedback work through the selected contract mapping."],
    ["TSW-1070", "panel-load", "Panel install and load", "Deployment verifies the package, installs it, and the intended project remains active."],
    ["TSW-1070", "panel-signals", "Physical-panel signals", "Digital, analog, serial, page, and multi-device signals operate with SIMPL Windows."],
    ["TSW-1070", "panel-performance", "Panel performance", "Startup, page transitions, scrolling, animations, memory, and touch response remain acceptable."],
    ["Packaging", "portable", "Portable project round trip", "Save/open portable package preserves assets, fonts, custom components, and reusable designs."],
    ["Packaging", "component-package", "Component package round trip", "Export/import of a custom component preserves properties, signals, assets, and behavior."],
    ["Packaging", "contract", "Contract Editor and SIMPL", "CCE import, .cse2j build mapping, and SIMPL component hierarchy/names are correct."],
  ];
  function acceptanceState() {
    state.acceptance ||= { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} };
    state.acceptance.results ||= {};
    return state.acceptance;
  }
  function escapeAcceptanceHtml(value) {
    const span = document.createElement("span");
    span.textContent = String(value ?? "");
    return span.innerHTML;
  }
  function acceptanceResult(id) {
    return acceptanceState().results[id] || { status: "untested", notes: "", testedAt: "" };
  }
  function setAcceptanceResult(id, status, notes = "") {
    const acceptance = acceptanceState(), previous = acceptanceResult(id);
    acceptance.startedAt ||= new Date().toISOString();
    acceptance.updatedAt = new Date().toISOString();
    acceptance.results[id] = { status, notes: notes || previous.notes || "", testedAt: status === "untested" ? "" : new Date().toISOString() };
    projectDirty = true;
    setAutosaveState("Unsaved changes");
  }
  function renderAcceptanceEnvironment() {
    const environment = acceptanceState().environment || {}, artifact = (deploymentSettings().buildArtifacts || [])[0], entries = [
      ["Application", environment.appVersion || "—"], ["Windows", environment.os || navigator.userAgent],
      ["WebView2", environment.webView2 || "—"], ["Node / NPM", `${environment.node || "—"} / ${environment.npm || "—"}`],
      ["Crestron CLI", environment.ch5Cli || "—"], ["Project", `${state.contract.name || "Untitled"} · ${state.pages.length} pages · ${state.items.length} widgets`],
      ["Target", `${selectedDevice().name} · ${state.width}×${state.height}`], ["Latest CH5Z", artifact ? `${artifact.path} · ${artifact.sha256 || "no hash"}` : "No verified build artifact"],
    ];
    $("acceptance-environment").innerHTML = entries.map(([key, value]) => `<div><strong>${escapeAcceptanceHtml(key)}:</strong> ${escapeAcceptanceHtml(String(value))}</div>`).join("");
  }
  function renderAcceptanceChecklist() {
    const host = $("acceptance-checklist"), acceptance = acceptanceState(), completed = acceptanceChecks.filter(([, id]) => acceptanceResult(id).status !== "untested").length,
      passed = acceptanceChecks.filter(([, id]) => acceptanceResult(id).status === "pass").length, failed = acceptanceChecks.filter(([, id]) => acceptanceResult(id).status === "fail").length;
    $("acceptance-summary").textContent = `${completed}/${acceptanceChecks.length} checked · ${passed} passed · ${failed} failed. Results are saved with this project.`;
    host.innerHTML = "";
    [...new Set(acceptanceChecks.map(([group]) => group))].forEach((group) => {
      const section = document.createElement("section"), heading = document.createElement("h3"); section.className = "acceptance-group"; heading.textContent = group; section.appendChild(heading);
      acceptanceChecks.filter(([entryGroup]) => entryGroup === group).forEach(([, id, title, description]) => {
        const result = acceptanceResult(id), row = document.createElement("div"), copy = document.createElement("div"), status = document.createElement("select"), notes = document.createElement("input");
        row.className = "acceptance-row"; row.dataset.status = result.status; copy.innerHTML = `<strong>${escapeAcceptanceHtml(title)}</strong><small>${escapeAcceptanceHtml(description)}</small>`;
        [["untested","Not tested"],["pass","Pass"],["fail","Fail"],["blocked","Blocked"]].forEach(([value,label]) => { const option=document.createElement("option"); option.value=value; option.textContent=label; status.appendChild(option); });
        status.value = result.status; status.onchange = () => { setAcceptanceResult(id, status.value, notes.value); renderAcceptanceChecklist(); scheduleHistory(); };
        notes.type="text"; notes.placeholder="Notes / evidence"; notes.value=result.notes || ""; notes.onchange=()=>{ setAcceptanceResult(id,status.value,notes.value); scheduleHistory(); };
        row.append(copy,status,notes); section.appendChild(row);
      }); host.appendChild(section);
    });
    $("acceptance-notes").value = acceptance.notes || "";
  }
  async function openAcceptanceTest() {
    const acceptance = acceptanceState();
    if (native) try { acceptance.environment = await nativeRequest("systemDiagnostics"); } catch (error) { acceptance.environment = { error:error.message }; }
    renderAcceptanceEnvironment(); renderAcceptanceChecklist();
    if (!$("acceptance-dialog").open) $("acceptance-dialog").showModal();
  }
  function acceptanceItem(componentId, pageId, x, y, overrides = {}) {
    const definition = window.ComposerRuntime.get(componentId); if (!definition) return null;
    const itemId=uid("acceptance-"), contractName=`Acceptance.${componentId.replace(/[^A-Za-z0-9_]/g,"_")}_${itemId.replace(/[^A-Za-z0-9_]/g,"_")}`;
    return { id:itemId, pageId, name:overrides.name || definition.name, componentId, source:"", x,y,
      w:overrides.w || definition.defaultSize?.width || 240, h:overrides.h || definition.defaultSize?.height || 140, z:state.items.length+1,
      properties:{ ...Object.fromEntries((definition.properties || []).map((property)=>[property.key,structuredClone(property.defaultValue)])), ...(overrides.properties || {}) },
      signalBindings:Object.fromEntries((definition.signals || []).map((signal)=>[signal.key,{mode:"contract",value:`${contractName}.${signal.key.replace(/[^A-Za-z0-9_]/g,"_")}`}])) ,
      targetPage:overrides.targetPage || "", actions:overrides.actions || [], interactions:overrides.interactions || [],
      layout:{anchorX:overrides.anchorX || "left",anchorY:overrides.anchorY || "top",scaleMode:overrides.scaleMode || "fixed",safeMargin:12}, deviceOverrides:{} };
  }
  function createAcceptanceProject() {
    if ((state.items.length || state.pages.length > 1) && !confirm("Replace the current project with the acceptance test project? Save it first if needed.")) return;
    const retainedFonts=state.assets.filter((asset)=>String(asset.type || "").includes("font")), asset={id:"acceptance-graphic",name:"Acceptance Graphic.svg",type:"image/svg+xml",size:100,dataUrl:"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0iIzA0YWFlOCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjQiLz48L3N2Zz4="},
      pages=[{id:"acceptance-home",name:"Acceptance Home",background:"#182126",bindingMode:"contract",binding:"AcceptanceHome",transition:"slide-left",transitionDuration:350},{id:"acceptance-signals",name:"Signals",background:"#122022",bindingMode:"contract",binding:"AcceptanceSignals",transition:"fade",transitionDuration:300},{id:"acceptance-media",name:"Media & Motion",background:"#182126",bindingMode:"contract",binding:"AcceptanceMedia",transition:"scale",transitionDuration:350}];
    state.pages=pages; state.activePage=pages[0].id; state.items=[]; state.assets=[asset,...retainedFonts]; state.reusables=[]; state.pageTemplates=[]; state.themes=[]; state.customComponents=[];
    const customAcceptance={id:"custom-acceptance-button",name:"Acceptance Custom Button",category:"Custom",icon:"🧪",version:"1.0.0",defaultSize:{width:260,height:120},
      html:'<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:transparent}.acceptance-custom{width:100%;height:100%;border:1px solid #fff;border-radius:14px;background:#203332;color:#fff;box-shadow:0 0 14px #04dcb9;font:700 22px Segoe UI}</style></head><body><button class="acceptance-custom">CUSTOM</button><script>var b=document.querySelector("button"),up=function(){window.ComposerSignals.publish("press",false)};b.onpointerdown=function(){window.ComposerSignals.publish("press",true)};b.onpointerup=up;b.onpointercancel=up;window.ComposerSignals.subscribe("selected",function(v){b.style.background=v?"#04aa8e":"#203332"});window.ComposerSignals.subscribe("name",function(v){if(v!=null&&v!=="")b.textContent=String(v)});<\/script></body></html>',
      properties:[{key:"textSize",name:"Text size",type:"number",defaultValue:22}],signals:[{key:"press",name:"Press",type:"digital",direction:"output",defaultValue:"Acceptance.Custom.Press"},{key:"selected",name:"Selected",type:"digital",direction:"input",defaultValue:"Acceptance.Custom.Selected"},{key:"name",name:"Name",type:"serial",direction:"input",defaultValue:"Acceptance.Custom.Name"}]};
    state.customComponents.push(customAcceptance); registerCustomComponent(customAcceptance);
    const fontFamily=retainedFonts[0]?fontAssetFamily(retainedFonts[0]):"", add=(id,page,x,y,overrides)=>{const item=acceptanceItem(id,page,x,y,overrides);if(item)state.items.push(item);return item;};
    const nav=add("standard-button",pages[0].id,40,40,{name:"Navigate to Signals",targetPage:pages[1].id,properties:{text:"SIGNALS",fontAsset:fontFamily},interactions:[{trigger:"press",preset:"glow",duration:300,delay:0,easing:"ease-out",pressEffect:"particle"}]});
    if(nav){nav.graphicAsset=asset.id;nav.graphicAssetMode="overlay";nav.graphicAssetWidth=24;nav.graphicAssetHeight=24;nav.graphicAssetX=16;}
    add("volume-slider",pages[0].id,390,40,{name:"Analog Volume"}); add("rolling-menu",pages[0].id,40,260,{name:"Repeated Rolling Menu"}); add("text-block",pages[0].id,470,280,{name:"Font and Serial Text",properties:{text:"CUSTOM FONT / SERIAL",fontAsset:fontFamily}});
    add("standard-button",pages[1].id,20,30,{name:"Digital Button",w:240,h:110}); add("rotary-knob",pages[1].id,300,20,{name:"Analog Rotary",w:280,h:330}); add("lighting-control",pages[1].id,620,20,{name:"Multi Lighting",w:620,h:330}); add("microphone-control",pages[1].id,20,400,{name:"Multi Microphones",w:1220,h:360});
    add("horizontal-scrolling-text",pages[2].id,40,40,{name:"Scrolling Serial Text"}); add("video-input",pages[2].id,40,210,{name:"Video and PTZ",w:620,h:360}); add("loading-spinner",pages[2].id,760,210,{name:"Animated Loading"}); add("custom-acceptance-button",pages[2].id,950,40,{name:"Custom Component"});
    const reusableSource=add("standard-button",pages[0].id,900,40,{name:"Reusable Master",properties:{text:"MASTER"}}); if(reusableSource){const reusableId=uid("reusable-"),instanceId=uid("instance-");reusableSource.reusableId=reusableId;reusableSource.reusableKey="button";reusableSource.linkedInstanceId=instanceId;state.reusables.push({id:reusableId,name:"Acceptance Navigation Symbol",masterInstanceId:instanceId,items:reusableSnapshot([reusableSource])});}
    const alternateKey=panelLayoutKey("ipad-landscape",1920,1080); state.items.forEach((item)=>{item.deviceOverrides[alternateKey]=window.ComposerResponsiveLayout.adaptRect(item,{width:1280,height:800},{width:1920,height:1080},item.layout);});
    state.contract={name:"ComposerAcceptance",description:"Cross-runtime acceptance test",company:"",client:"",author:"",version:"1.0.0.0"}; state.acceptance={startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),results:{},notes:"",environment:{}};
    state.targetDevice="tsw-1070";state.width=1280;state.height=800;$("target-device").value=state.targetDevice;$("panel-width").value=state.width;$("panel-height").value=state.height;resize(state.width,state.height);renderPage();history.length=0;historyIndex=-1;commitHistory();renderAcceptanceEnvironment();renderAcceptanceChecklist();setStatus("Acceptance test project created");
  }
  async function runAcceptanceAutomaticChecks() {
    const test=(id,condition,message)=>setAcceptanceResult(id,condition?"pass":"fail",message),p=project(),serialized=JSON.stringify(p),reopened=JSON.parse(serialized),html=window.ComposerExporter.exportProject(p),validation=runValidation(false),signals=collectProjectSignals(),font=state.assets.find((asset)=>String(asset.type || "").includes("font"));
    test("health",validation.errors.length===0,validation.issues.length?`0 blocking errors; ${validation.issues.length} warning(s). Open Project Health for details.`:"No Project Health issues.");
    test("roundtrip",reopened.pages.length===state.pages.length&&reopened.items.length===state.items.length&&reopened.assets.length===state.assets.length&&!!reopened.acceptance,"Project JSON serialized and reopened with acceptance results.");
    test("export",html.includes("cr-com-lib.js")&&html.includes("ch5-webxpanel.js")&&html.includes("composer-interaction"),`Exported ${Math.ceil(html.length/1024)} KB HTML runtime.`);
    test("signals",["digital","analog","serial"].every((type)=>signals.some((row)=>row.type===type))&&signals.some((row)=>row.range),`${signals.length} signal rows inspected.`);
    test("responsive",state.items.some((item)=>Object.keys(item.deviceOverrides || {}).length),"Alternate-panel overrides found.");
    test("font",!!font&&html.includes("@font-face")&&html.includes(font.dataUrl),font?`Embedded ${font.name}.`:"Import a TTF, OTF, WOFF, or WOFF2 font, select it on a text widget, and rerun.");
    if(native)try{acceptanceState().environment=await nativeRequest("systemDiagnostics");}catch(_){} renderAcceptanceEnvironment();renderAcceptanceChecklist();scheduleHistory();setStatus("Acceptance automated checks completed");
  }
  function acceptanceReport() {
    const acceptance=acceptanceState(),lines=["CRESTRON UI COMPOSER — CROSS-RUNTIME ACCEPTANCE REPORT",`Generated: ${new Date().toLocaleString()}`,`Project: ${state.contract.name || "Untitled"}`,`Target: ${selectedDevice().name} (${state.width}×${state.height})`,`Started: ${acceptance.startedAt || "Not started"}`,`Last updated: ${acceptance.updatedAt || "—"}`,"","ENVIRONMENT",JSON.stringify(acceptance.environment || {},null,2),""]; let lastGroup="";
    acceptanceChecks.forEach(([group,id,title,description])=>{if(group!==lastGroup){lines.push(group.toUpperCase());lastGroup=group;}const result=acceptanceResult(id);lines.push(`[${result.status.toUpperCase()}] ${title}`,`  ${description}`,result.notes?`  Evidence: ${result.notes}`:"",result.testedAt?`  Tested: ${new Date(result.testedAt).toLocaleString()}`:"");}); lines.push("","OVERALL NOTES",acceptance.notes || "None"); return lines.filter((line,index,array)=>line!==""||array[index-1]!=="").join("\n");
  }
  function project() {
    return {
      version: window.ComposerProjectMigrations.CURRENT_VERSION,
      ...projectSnapshot(),
      targetDeviceProfile: {
        ...selectedDevice(),
        width: state.width,
        height: state.height,
      },
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
        rect =
          saved ||
          window.ComposerResponsiveLayout.adaptRect(
            item,
            { width: state.width, height: state.height },
            { width: device.width, height: device.height },
            layoutDefaults(item),
          );
      Object.assign(copy, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      return copy;
    });
    return output;
  }
  function renderBuildPanelList() {
    const host = $("build-panel-list");
    host.innerHTML = "";
    deviceProfiles
      .filter((device) => device.id !== "custom")
      .forEach((device) => {
        const label = document.createElement("label"),
          input = document.createElement("input"),
          name = document.createElement("span"),
          size = document.createElement("small");
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
            itemVisibleOnPage(item, state.activePage) &&
            !item.systemManaged &&
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
  let translateSource = null;
  const translatePresets = {
    button: {
      category: "Standard Buttons",
      signals: [
        {
          key: "press",
          name: "Press",
          type: "digital",
          direction: "output",
          suffix: "Press",
        },
        {
          key: "selected",
          name: "Selected",
          type: "digital",
          direction: "input",
          suffix: "Selected",
        },
        {
          key: "label",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    toggle: {
      category: "Toggle Buttons",
      signals: [
        {
          key: "press",
          name: "Press",
          type: "digital",
          direction: "output",
          suffix: "Press",
        },
        {
          key: "selected",
          name: "Selected",
          type: "digital",
          direction: "input",
          suffix: "Selected",
        },
        {
          key: "label",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    slider: {
      category: "Sliders & Levels",
      signals: [
        {
          key: "set",
          name: "Value Set",
          type: "analog",
          direction: "output",
          suffix: "ValueSet",
        },
        {
          key: "feedback",
          name: "Feedback",
          type: "analog",
          direction: "input",
          suffix: "Feedback",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    gauge: {
      category: "Status & Information",
      signals: [
        {
          key: "feedback",
          name: "Feedback",
          type: "analog",
          direction: "input",
          suffix: "Feedback",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    text: {
      category: "Text & Input",
      signals: [
        {
          key: "text",
          name: "Text",
          type: "serial",
          direction: "output",
          suffix: "Text",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    navigation: {
      category: "Navigation & Menus",
      signals: [
        {
          key: "press",
          name: "Press",
          type: "digital",
          direction: "output",
          suffix: "Press",
        },
        {
          key: "selected",
          name: "Selected",
          type: "digital",
          direction: "input",
          suffix: "Selected",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          suffix: "Name",
        },
      ],
    },
    custom: { category: "Custom", signals: [] },
  };
  function translatorKey(value, fallback = "property") {
    const words = String(value || "")
      .replace(/^--/, "")
      .replace(/[^A-Za-z0-9]+(.)/g, (_, next) => next.toUpperCase())
      .replace(/^[^A-Za-z_$]+/, "");
    return words || fallback;
  }
  function inferSnippetBehaviors(javascript, styles) {
    const candidates = [],
      seen = new Set(),
      variables = new Map(),
      collections = new Map(),
      add = (candidate) => {
        const signature = `${candidate.kind}|${candidate.selector}|${candidate.action}|${candidate.event || ""}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          candidates.push({ id: `inferred-${candidates.length + 1}`, ...candidate });
        }
      };
    for (const match of javascript.matchAll(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?querySelector\(\s*(["'`])(.+?)\2\s*\)/g,
    ))
      variables.set(match[1], match[3]);
    for (const match of javascript.matchAll(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?querySelectorAll\(\s*(["'`])(.+?)\2\s*\)/g,
    ))
      collections.set(match[1], match[3]);
    for (const match of javascript.matchAll(
      /(?:document\.)?querySelector\(\s*(["'`])(.+?)\1\s*\)\.addEventListener\(\s*(["'])(click|pointerdown|pointerup|input|change)\3/g,
    ))
      add({
        kind: "event",
        label: `${match[4]} handler`,
        selector: match[2],
        event: match[4],
        source: "signal-output",
        type: match[4] === "input" || match[4] === "change" ? "analog" : "digital",
        direction: "output",
        action: match[4] === "input" || match[4] === "change" ? "input" : match[4] === "click" ? "click" : match[4] === "pointerup" ? "release" : "press",
      });
    variables.forEach((selector, variable) => {
      const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      for (const match of javascript.matchAll(
        new RegExp(`${escaped}\\.addEventListener\\(\\s*(["'])(click|pointerdown|pointerup|input|change)\\1`, "g"),
      ))
        add({
          kind: "event",
          label: `${match[2]} handler`,
          selector,
          event: match[2],
          source: "signal-output",
          type: match[2] === "input" || match[2] === "change" ? "analog" : "digital",
          direction: "output",
          action: match[2] === "input" || match[2] === "change" ? "input" : match[2] === "click" ? "click" : match[2] === "pointerup" ? "release" : "press",
        });
      for (const match of javascript.matchAll(
        new RegExp(`${escaped}\\.classList\\.(?:toggle|add|remove)\\(\\s*(["'])([^"']+)\\1`, "g"),
      ))
        add({ kind: "class", label: `Class “${match[2]}” state`, selector, source: "signal-input", type: "digital", direction: "input", action: "classToggle", parameter: match[2] });
      for (const match of javascript.matchAll(
        new RegExp(`${escaped}\\.style\\.setProperty\\(\\s*(["'])(--[^"']+)\\1`, "g"),
      ))
        add({ kind: "css-variable", label: `${match[2]} value`, selector, source: "signal-input", type: "analog", direction: "input", action: "cssVariable", parameter: match[2] });
      if (new RegExp(`${escaped}\\.textContent\\s*=`).test(javascript))
        add({ kind: "text", label: "Dynamic text", selector, source: "signal-input", type: "serial", direction: "input", action: "text" });
      const styleActions = [
        ["width", "width", "%"],
        ["height", "height", "%"],
        ["opacity", "opacity", ""],
      ];
      styleActions.forEach(([property, action, unit]) => {
        if (new RegExp(`${escaped}\\.style\\.${property}\\s*=`).test(javascript))
          add({ kind: "numeric-style", label: `${property} value`, selector, source: "signal-input", type: "analog", direction: "input", action, parameter: unit });
      });
      const transformMatch = javascript.match(
        new RegExp(`${escaped}\\.style\\.transform\\s*=\\s*[^;\\n]*(rotate|translateX|translateY|scale)`, "i"),
      );
      if (transformMatch) {
        const transform = transformMatch[1].toLowerCase(),
          action = transform === "rotate" ? "rotate" : transform === "translatex" ? "translateX" : transform === "translatey" ? "translateY" : "scale";
        add({ kind: "numeric-transform", label: `${action} value`, selector, source: "signal-input", type: "analog", direction: "input", action, parameter: action === "rotate" ? "deg" : action === "scale" ? "" : "px" });
      }
    });
    collections.forEach((selector, variable) => {
      const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        block = new RegExp(`${escaped}\\.forEach\\([\\s\\S]{0,600}?addEventListener\\(\\s*(["'])(click|pointerdown|pointerup|input|change)\\1`, "g").exec(javascript);
      if (block)
        add({ kind: "collection-event", label: `Repeated ${block[2]} handlers`, selector, event: block[2], source: "signal-output", type: block[2] === "input" || block[2] === "change" ? "analog" : "digital", direction: "output", action: block[2] === "input" || block[2] === "change" ? "input" : block[2] === "click" ? "click" : block[2] === "pointerup" ? "release" : "press" });
      if (new RegExp(`${escaped}\\.forEach\\([\\s\\S]{0,600}?classList\\.(?:toggle|add|remove)`).test(javascript))
        add({ kind: "collection-state", label: "Repeated selected state", selector, source: "signal-input", type: "digital", direction: "input", action: "selectedClass" });
    });
    for (const match of javascript.matchAll(
      /\.addEventListener\(\s*(["'])click\1\s*,[\s\S]{0,500}?\.closest\(\s*(["'`])(.+?)\2\s*\)/g,
    ))
      add({ kind: "delegated-event", label: "Delegated item press", selector: match[3], event: "click", source: "signal-output", type: "digital", direction: "output", action: "click" });
    const animationNames = [
      ...styles.matchAll(/@keyframes\s+([A-Za-z_][\w-]*)/g),
    ].map((match) => match[1]);
    animationNames.forEach((name) =>
      add({ kind: "animation", label: `CSS animation “${name}”`, selector: "", source: "local", type: "digital", direction: "input", action: "animation", parameter: name }),
    );
    if (/\btransition\s*:/i.test(styles))
      add({ kind: "animation", label: "CSS transition", selector: "", source: "local", type: "digital", direction: "input", action: "transition" });
    const usedKeys = new Set();
    return candidates.map((candidate, index) => {
      const base = translatorKey(candidate.label, `inferred${index + 1}`);
      let key = base,
        suffix = 2;
      while (usedKeys.has(key)) key = `${base}${suffix++}`;
      usedKeys.add(key);
      return { ...candidate, key, mode: "local" };
    });
  }
  function inferSnippetSuggestions(javascript, styles, inferred) {
    const suggestions = [],
      add = (action, title, detail, confidence = "medium") => {
        if (!suggestions.some((entry) => entry.title === title))
          suggestions.push({ action, title, detail, confidence });
      };
    if (/querySelectorAll\s*\(/.test(javascript) && /\.forEach\s*\(/.test(javascript))
      add("repeated", "Repeated interactive collection", "The script iterates a group of elements. Generate zero-based Press, Selected, and Name ranges.", "high");
    if (/createElement\s*\(|insertAdjacentHTML\s*\(|\.appendChild\s*\(/.test(javascript))
      add("dynamic-count", "Dynamic item creation", "The component creates elements at runtime. Add Default Count and analog item-count behavior.", "high");
    if (/\b(next|previous|prev|increment|decrement)\b/i.test(javascript))
      add("navigation", "Next / previous navigation", "Increment/decrement logic was found. Generate directional Press outputs.", "medium");
    if (/classList\.(?:toggle|add|remove)\s*\(\s*["'](?:open|opened|expanded|show|visible)/i.test(javascript))
      add("open-state", "Open / close state", "A class appears to control a menu or popup. Map it to digital Selected feedback.", "high");
    if (/setInterval\s*\(|setTimeout\s*\(/.test(javascript))
      add("timing", "Timer-controlled behavior", "Delays or intervals are present. Add an editable timing property for component setup.", "high");
    if (/\.closest\s*\(|\.matches\s*\(/.test(javascript) && /addEventListener/.test(javascript))
      add("delegated", "Delegated event handling", "A parent handles events for child items. Generate an item Press rule and ranges.", "medium");
    if (inferred.filter((entry) => ["numeric-style", "numeric-transform", "css-variable"].includes(entry.kind)).length > 1)
      add("shared-analog", "Shared numeric relationship", "Multiple visual targets can share one analog Feedback contract.", "medium");
    if (/@keyframes\s+/i.test(styles) || /\banimation\s*:/i.test(styles))
      add("animation", "Existing animation", "Add a digital animation trigger while retaining the original animation locally.", "high");
    return suggestions;
  }
  function analyzeSnippet(name, source) {
    const documentValue = new DOMParser().parseFromString(
        String(source || ""),
        "text/html",
      ),
      styles = [...documentValue.querySelectorAll("style")]
        .map((element) => element.textContent)
        .join("\n"),
      javascript = [...documentValue.querySelectorAll("script")]
        .map((element) => element.textContent)
        .join("\n"),
      body = documentValue.body.cloneNode(true),
      variableValues = new Set();
    body
      .querySelectorAll("script,style")
      .forEach((element) => element.remove());
    const editables = [],
      seen = new Set(),
      add = (entry) => {
        if (!seen.has(entry.key)) {
          seen.add(entry.key);
          editables.push(entry);
        }
      };
    for (const match of styles.matchAll(
      /(--[A-Za-z0-9_-]+)\s*:\s*([^;}{]+)\s*;/g,
    )) {
      const raw = match[2].trim(),
        type = /^#[0-9a-f]{6}$/i.test(raw)
          ? "color"
          : /^-?\d+(?:\.\d+)?(?:px)?$/i.test(raw)
            ? "number"
            : "text";
      variableValues.add(raw.toLowerCase());
      const semantic = {
        "--bg": "Button color",
        "--background": "Button color",
        "--glow": "Glow color",
        "--text": "Icon / text color",
        "--color": "Color",
      }[match[1].toLowerCase()];
      add({
        key: translatorKey(match[1]),
        label:
          semantic ||
          match[1]
            .replace(/^--/, "")
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        type,
        value: raw,
        kind: "css-variable",
        source: match[1],
      });
    }
    const literalColors = [
      ...new Set(
        [...styles.matchAll(/#[0-9a-f]{6}\b/gi)].map((match) =>
          match[0].toLowerCase(),
        ),
      ),
    ].filter((value) => !variableValues.has(value));
    literalColors.forEach((value, index) => {
      const before = styles.slice(
          Math.max(0, styles.toLowerCase().indexOf(value) - 50),
          styles.toLowerCase().indexOf(value),
        ),
        property = before.match(/([a-z-]+)\s*:\s*[^;{}]*$/i)?.[1] || "color",
        role = /border/.test(property)
          ? "Border color"
          : /background/.test(property)
            ? "Background color"
            : /shadow/.test(property)
              ? "Shadow color"
              : /stroke|fill|color/.test(property)
                ? "Text / icon color"
                : `Additional color ${index + 1}`,
        key = translatorKey(role) + (index ? index + 1 : "");
      add({
        key,
        label: role,
        type: "color",
        value,
        kind: "literal",
        source: value,
      });
    });
    const allButtonElements = [
        ...body.querySelectorAll(
          'button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],.btn,.button',
        ),
      ],
      repeatedGroups = [...body.querySelectorAll("*")]
        .map((container) => ({
          container,
          items: [...container.children].filter((child) =>
            allButtonElements.includes(child),
          ),
        }))
        .filter((group) => group.items.length >= 2)
        .sort((a, b) => b.items.length - a.items.length),
      repeatedGroup = repeatedGroups[0] || null,
      repeatedSet = new Set(repeatedGroup?.items || []),
      buttonElements = allButtonElements.filter(
        (element) => !repeatedSet.has(element),
      ),
      numericElements = [
        ...body.querySelectorAll(
          'input[type="range"],input[type="number"],meter,progress,[role="slider"],[role="progressbar"],.gauge,.meter,.level,.fill,.progress,.slider',
        ),
      ].filter((element, index, all) => all.indexOf(element) === index),
      interactiveNumeric = numericElements.filter((element) =>
        element.matches('input,[role="slider"],.slider'),
      );
    if (repeatedGroup) {
      repeatedGroup.container.setAttribute(
        "data-translated-repeat-container",
        "",
      );
      repeatedGroup.items.forEach((item) =>
        item.setAttribute("data-translated-repeat-item", ""),
      );
    }
    buttonElements.forEach(
      (element, index) => (element.dataset.translatedButton = String(index)),
    );
    numericElements.forEach(
      (element, index) => (element.dataset.translatedNumeric = String(index)),
    );
    let textIndex = 1;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (
      let node = walker.nextNode();
      node && textIndex <= 8;
      node = walker.nextNode()
    ) {
      const value = node.textContent.replace(/\s+/g, " ").trim();
      if (
        value &&
        value.length <= 80 &&
        !node.parentElement?.closest("[data-translated-repeat-item]")
      ) {
        const key = textIndex === 1 ? "text" : `text${textIndex}`;
        node.parentElement?.setAttribute("data-translated-text", key);
        add({
          key,
          label: `Text: ${value}`,
          type: "text",
          value,
          kind: "text",
          source: value,
        });
        textIndex++;
      }
    }
    const inferredBehaviors = inferSnippetBehaviors(javascript, styles);
    return {
      fileName: name,
      source,
      html: body.innerHTML.trim(),
      css: styles,
      javascript,
      editables,
      features: {
        buttonCount: buttonElements.length,
        numericCount: numericElements.length,
        interactiveNumericCount: interactiveNumeric.length,
        numericTargets: numericElements.map((element, index) => ({
          selector: `[data-translated-numeric="${index}"]`,
          interactive: interactiveNumeric.includes(element),
          visualFill: element.matches(".fill,.progress,.level,[role='progressbar']"),
          min: Number(element.getAttribute("min")) || 0,
          max: Number(element.getAttribute("max")) || 100,
        })),
        textKeys: editables
          .filter((entry) => entry.kind === "text")
          .map((entry) => entry.key),
        repeatedItems: repeatedGroup
          ? {
              containerSelector: "[data-translated-repeat-container]",
              itemSelector: "[data-translated-repeat-item]",
              labelSelector: "",
              defaultCount: repeatedGroup.items.length,
              maxCount: 20,
            }
          : null,
        inferredBehaviors,
        inferenceSuggestions: inferSnippetSuggestions(
          javascript,
          styles,
          inferredBehaviors,
        ),
      },
    };
  }
  function renderTranslateEditables() {
    if (!translateSource) return;
    const preset = $("translate-preset").value,
      buttonLike = ["button", "toggle", "navigation"].includes(preset),
      editables = [
        ...translateSource.editables,
        ...(translateSource.addedEditables || []),
      ].filter(
        (entry) =>
          !(
            buttonLike &&
            /shadow[-_ ]?(dark|light)/i.test(`${entry.key} ${entry.label}`)
          ),
      );
    if (buttonLike || translateSource.features.buttonCount)
      editables.push(
        {
          key: "shadowSize",
          label: "Shadow size",
          type: "number",
          value: 6,
          kind: "button-style",
        },
        {
          key: "glowStrength",
          label: "Glow strength",
          type: "number",
          value: 3,
          kind: "button-style",
        },
        {
          key: "faceColor",
          label: "Standard state — background color",
          type: "color",
          value: "#263b3c",
          kind: "button-style",
        },
        {
          key: "selectedFaceColor",
          label: "Selected state — background color",
          type: "color",
          value: "#078f7d",
          kind: "button-style",
        },
        {
          key: "textColor",
          label: "Standard state — text / icon color",
          type: "color",
          value: "#ffffff",
          kind: "button-style",
        },
        {
          key: "selectedTextColor",
          label: "Selected state — text / icon color",
          type: "color",
          value: "#ffffff",
          kind: "button-style",
        },
        {
          key: "borderColor",
          label: "Standard state — border color",
          type: "color",
          value: "#7ba7a3",
          kind: "button-style",
        },
        {
          key: "selectedBorderColor",
          label: "Selected state — border color",
          type: "color",
          value: "#04dcb9",
          kind: "button-style",
        },
        {
          key: "glowColor",
          label: "Standard state — glow color",
          type: "color",
          value: "#04dcb9",
          kind: "button-style",
        },
        {
          key: "selectedGlowColor",
          label: "Selected state — glow color",
          type: "color",
          value: "#04dcb9",
          kind: "button-style",
        },
        {
          key: "cornerRadius",
          label: "Corner radius",
          type: "number",
          value: 18,
          kind: "button-style",
        },
        {
          key: "iconSize",
          label: "Icon size",
          type: "number",
          value: 24,
          kind: "button-style",
        },
      );
    if (
      !editables.some(
        (entry) => entry.key === "textSize" || /font.?size/i.test(entry.key),
      )
    )
      editables.push({
        key: "textSize",
        label: "Text size",
        type: "number",
        value: 16,
        kind: "standard-style",
      });
    if (
      translateSource.features.textKeys.length &&
      !editables.some((entry) => entry.key === "textColor")
    )
      editables.push({
        key: "textColor",
        label: "Text color",
        type: "color",
        value: "#ffffff",
        kind: "standard-style",
      });
    translateSource.currentEditables = editables;
    $("translate-editables").innerHTML = editables.length
      ? editables
          .map(
            (entry, index) =>
              `<label><input type="checkbox" checked data-index="${index}"><span>${entry.label}<small>${entry.type} · ${String(entry.value).replace(/</g, "&lt;")}</small></span></label>`,
          )
          .join("")
      : '<p class="hint">No editable values were detected. You can add properties manually in the component editor.</p>';
    renderTranslateReview();
  }
  function translateEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function selectedTranslateProperties() {
    if (!translateSource) return [];
    return [...$("translate-editables").querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => translateSource.currentEditables[Number(input.dataset.index)])
      .filter(Boolean);
  }
  function selectedTranslateSignals() {
    return [...$("translate-signals").querySelectorAll(".translate-signal-row")]
      .filter((row) => row.querySelector('input[type="checkbox"]')?.checked)
      .map((row) => ({
        key: row.dataset.key,
        name: row.querySelector(".translate-signal-name").value.trim() || row.dataset.key,
        type: row.querySelector(".translate-signal-type").value,
        direction: row.querySelector(".translate-signal-direction").value,
        defaultValue: row.querySelector(".translate-signal-address").value.trim(),
        ...(row.dataset.optionalProperty
          ? { optionalProperty: row.dataset.optionalProperty }
          : {}),
      }));
  }
  function selectedTranslateInferences() {
    return [...$("translate-inferences").querySelectorAll(".translate-inference-row")]
      .map((row) => ({
        id: row.dataset.id,
        label: row.dataset.label,
        mode: row.querySelector(".translate-inference-mode").value,
        key: translatorKey(row.querySelector(".translate-inference-key").value, "inferred"),
        selector: row.querySelector(".translate-inference-selector").value.trim(),
        source: row.dataset.source,
        type: row.dataset.type,
        direction: row.dataset.direction,
        action: row.dataset.action,
        parameter: row.dataset.parameter || "",
        animationName: row.dataset.animationName || "",
      }))
      .filter((entry) => entry.mode !== "ignore");
  }
  function renderTranslateInferences() {
    const candidates = translateSource?.features?.inferredBehaviors || [],
      suggestions = translateSource?.features?.inferenceSuggestions || [];
    $("translate-suggestions").innerHTML = suggestions.length
      ? suggestions
          .map(
            (entry) =>
              `<div><strong>${translateEscape(entry.title)}</strong><small>${translateEscape(entry.confidence)} confidence · ${translateEscape(entry.detail)}</small><button type="button" data-translate-apply="${translateEscape(entry.action)}">Apply</button></div>`,
          )
          .join("")
      : "";
    $("translate-inferences").innerHTML = candidates.length
      ? candidates
          .map(
            (entry) =>
              `<div class="translate-inference-row" data-id="${translateEscape(entry.id)}" data-label="${translateEscape(entry.label)}" data-source="${translateEscape(entry.source)}" data-type="${translateEscape(entry.type)}" data-direction="${translateEscape(entry.direction)}" data-action="${translateEscape(entry.action)}" data-parameter="${translateEscape(entry.parameter || "")}"><span>${translateEscape(entry.label)}<small>${translateEscape(entry.kind)} · ${translateEscape(entry.type)} ${translateEscape(entry.direction)}</small></span><select class="translate-inference-mode"><option value="local" selected>Keep local</option>${entry.source === "local" ? "" : '<option value="generated">Generate Crestron rule</option>'}<option value="ignore">Ignore</option></select><input class="translate-inference-key" value="${translateEscape(entry.key)}" aria-label="Generated signal key"><input class="translate-inference-selector" value="${translateEscape(entry.selector)}" placeholder="CSS selector" aria-label="Target selector"><small>${translateEscape(entry.action)}</small></div>`,
          )
          .join("")
      : '<p class="hint">No existing scripted or animated behaviors were detected. Standard component behaviors will still be generated.</p>';
  }
  function addTranslateEditable(entry) {
    translateSource.addedEditables ||= [];
    if (
      !translateSource.editables.some((candidate) => candidate.key === entry.key) &&
      !translateSource.addedEditables.some((candidate) => candidate.key === entry.key)
    )
      translateSource.addedEditables.push(entry);
  }
  function setTranslateInferenceGenerated(row, key) {
    if (!row) return false;
    const mode = row.querySelector(".translate-inference-mode");
    if (![...mode.options].some((option) => option.value === "generated"))
      mode.add(new Option("Generate Crestron rule", "generated"));
    mode.value = "generated";
    if (key) row.querySelector(".translate-inference-key").value = key;
    return true;
  }
  function configureTranslatedRepeatedItems() {
    if (translateSource.features.repeatedItems) return true;
    const collection = translateSource.features.inferredBehaviors.find(
        (entry) => entry.kind === "collection-event",
      ),
      selector = collection?.selector;
    if (!selector) return false;
    const split = selector.trim().match(/^(.*?)([^\s>+~]+)$/),
      documentValue = new DOMParser().parseFromString(
        translateSource.html,
        "text/html",
      ),
      count = documentValue.querySelectorAll(selector).length;
    translateSource.features.repeatedItems = {
      containerSelector: split?.[1]?.trim() || "body",
      itemSelector: split?.[2] || selector,
      labelSelector: "",
      defaultCount: Math.max(1, count),
      maxCount: Math.max(20, count),
    };
    return true;
  }
  function applyTranslateSuggestion(action, button) {
    const rows = [...$("translate-inferences").querySelectorAll(".translate-inference-row")];
    let applied = false;
    if (action === "repeated" || action === "delegated") {
      applied = configureTranslatedRepeatedItems();
      rows
        .filter((row) =>
          ["collection-event", "delegated-event"].includes(
            translateSource.features.inferredBehaviors.find(
              (entry) => entry.id === row.dataset.id,
            )?.kind,
          ),
        )
        .forEach((row) => {
          applied = setTranslateInferenceGenerated(row, "itemPress") || applied;
        });
    } else if (action === "dynamic-count") {
      applied = configureTranslatedRepeatedItems();
      addTranslateEditable({ key: "defaultCount", label: "Default item count", type: "number", value: translateSource.features.repeatedItems?.defaultCount || 3, kind: "generated-structure" });
      applied = true;
    } else if (action === "navigation") {
      rows
        .filter((row) => /next|previous|prev|increment|decrement/i.test(row.querySelector(".translate-inference-selector").value))
        .forEach((row) => {
          const selector = row.querySelector(".translate-inference-selector").value;
          applied = setTranslateInferenceGenerated(
            row,
            /prev|decrement/i.test(selector) ? "previousPress" : "nextPress",
          ) || applied;
        });
    } else if (action === "open-state") {
      rows
        .filter(
          (row) =>
            row.dataset.action === "classToggle" &&
            /^(open|opened|expanded|show|visible)$/i.test(
              row.dataset.parameter,
            ),
        )
        .forEach((row) => {
          applied = setTranslateInferenceGenerated(row, "selected") || applied;
        });
    } else if (action === "timing") {
      addTranslateEditable({ key: "timingMs", label: "Animation / action timing (ms)", type: "number", value: 500, kind: "generated-timing" });
      applied = true;
    } else if (action === "shared-analog") {
      rows
        .filter((row) => ["width", "height", "opacity", "rotate", "translateX", "translateY", "scale", "cssVariable"].includes(row.dataset.action))
        .forEach((row) => {
          applied = setTranslateInferenceGenerated(row, "feedback") || applied;
        });
    } else if (action === "animation") {
      const row = rows.find((candidate) => candidate.dataset.action === "animation");
      if (row) {
        row.dataset.animationName = row.dataset.parameter;
        row.dataset.source = "signal-input";
        row.dataset.type = "digital";
        row.dataset.direction = "input";
        row.dataset.action = "classToggle";
        row.dataset.parameter = "composer-animation-active";
        row.querySelector(".translate-inference-selector").value = "body";
        addTranslateEditable({ key: "timingMs", label: "Animation / action timing (ms)", type: "number", value: 500, kind: "generated-timing" });
        applied = setTranslateInferenceGenerated(row, "animationTrigger");
      }
    }
    if (!applied) {
      $("translate-test-result").textContent =
        "This recommendation needs a selector adjustment before it can be applied automatically.";
      return;
    }
    translateSource.appliedSuggestions ||= new Set();
    translateSource.appliedSuggestions.add(action);
    if (["dynamic-count", "timing", "animation"].includes(action))
      renderTranslateEditables();
    renderTranslateSignals();
    renderTranslateReview();
    button.disabled = true;
    button.textContent = "Applied";
  }
  function renderTranslateReview() {
    if (!translateSource || !$("translate-detection-summary")) return;
    const detected = translateSource.features,
      properties = selectedTranslateProperties(),
      signals = selectedTranslateSignals(),
      inferences = selectedTranslateInferences(),
      plan = translatedBehaviorPlan(
        properties,
        signals,
        detected,
        $("translate-preset").value,
        inferences,
      ),
      externalReferences = [
        ...translateSource.source.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)/gi),
      ].map((match) => match[1]),
      warnings = [];
    if (!detected.buttonCount && !detected.numericCount && !detected.textKeys.length)
      warnings.push("No interactive or editable elements were confidently detected.");
    if (externalReferences.length)
      warnings.push(`${externalReferences.length} external file reference${externalReferences.length === 1 ? "" : "s"} may need to be imported as embedded assets.`);
    if (detected.repeatedItems)
      warnings.push(`A repeated group of ${detected.repeatedItems.defaultCount} items will use zero-based generated ranges.`);
    const generatedInferences = inferences.filter((entry) => entry.mode === "generated"),
      localInferences = inferences.filter((entry) => entry.mode === "local");
    if (localInferences.length)
      warnings.push(`${localInferences.length} inferred behavior${localInferences.length === 1 ? " remains" : "s remain"} controlled by the original JavaScript/CSS.`);
    if (generatedInferences.some((entry) => !entry.selector && entry.action !== "animation" && entry.action !== "transition"))
      warnings.push("An inferred Crestron behavior needs a target selector.");
    const blankAddresses = signals.filter((signal) => !signal.defaultValue),
      duplicateAddresses = signals
        .map((signal) => signal.defaultValue)
        .filter(
          (address, index, values) =>
            address && values.indexOf(address) !== index,
        ),
      mismatchedBehaviors = plan.behaviors.filter((rule) => {
        const signal = signals.find((entry) => entry.key === rule.key);
        return (
          signal &&
          ((rule.source === "signal-input" && signal.direction !== "input") ||
            (rule.source === "signal-output" && signal.direction !== "output"))
        );
      });
    if (blankAddresses.length)
      warnings.push(`${blankAddresses.length} enabled signal${blankAddresses.length === 1 ? " has" : "s have"} no contract name or join.`);
    if (duplicateAddresses.length)
      warnings.push("Two or more enabled signals use the same contract name or join.");
    if (mismatchedBehaviors.length)
      warnings.push(`${mismatchedBehaviors.length} signal direction${mismatchedBehaviors.length === 1 ? " does" : "s do"} not match the generated behavior.`);
    $("translate-detection-summary").innerHTML = [
      [detected.buttonCount, "Standalone buttons"],
      [detected.repeatedItems?.defaultCount || 0, "Repeated items"],
      [detected.textKeys.length, "Text elements"],
      [detected.numericCount, "Numeric controls"],
      [plan.behaviors.length, "Generated behaviors"],
    ].map(([count, label]) => `<div><strong>${count}</strong><small>${label}</small></div>`).join("");
    const status = $("translate-review-status");
    status.classList.toggle("warning", !!warnings.length);
    status.textContent = warnings.length
      ? `Review recommended: ${warnings.join(" ")}`
      : "High-confidence translation. Review the generated bindings, then test the mappings or continue.";
    $("translate-behaviors").innerHTML = plan.behaviors.length || localInferences.length
      ? [
          ...plan.behaviors.map((rule) => `<div>${translateEscape(rule.name)}<small>${translateEscape(rule.source)} · ${translateEscape(rule.key)} → ${translateEscape(rule.selector)} · ${translateEscape(rule.action)}</small></div>`),
          ...localInferences.map((rule) => `<div>${translateEscape(rule.label)}<small>local · preserved in original CSS/JavaScript</small></div>`),
        ].join("")
      : '<p class="hint">No behaviors are generated by the current selections.</p>';
  }
  let translateSignalTestStats = null;
  function translatePreviewConfiguration() {
    const properties = selectedTranslateProperties(),
      signals = selectedTranslateSignals(),
      inferences = selectedTranslateInferences(),
      plan = translatedBehaviorPlan(
        properties,
        signals,
        translateSource.features,
        $("translate-preset").value,
        inferences,
      );
    return { properties, signals, inferences, plan };
  }
  function refreshTranslateSimulator() {
    if (!translateSource) return;
    const { properties, signals, plan } = translatePreviewConfiguration(),
      propertyValues = Object.fromEntries(
        properties.map((entry) => [
          entry.key,
          entry.type === "number" ? Number(entry.value) || 0 : entry.value,
        ]),
      );
    let html = translateSource.html,
      css = translateSource.css;
    properties.forEach((entry) => {
      if (entry.kind === "css-variable")
        css = css.replace(
          new RegExp(
            `(${entry.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*)${String(entry.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          ),
          `$1${entry.value}`,
        );
      else if (entry.kind === "literal")
        css = css.replaceAll(entry.source, String(entry.value));
      else if (entry.kind === "text")
        html = html.replace(entry.source, String(entry.value));
    });
    const repeated = translateSource.features.repeatedItems,
      repeatedConfig = repeated
        ? {
            ...repeated,
            namespace:
              $("translate-name").value.replace(/[^A-Za-z0-9_]/g, "") ||
              "CustomComponent",
          }
        : null,
      simulatorSignals = [
        ...signals,
        ...(repeated
          ? [
              { key: "itemCount", name: "Repeated item count", type: "analog", direction: "input", simulatorOnly: true },
              { key: "__repeatSelected:0", name: "Item 0 Selected", type: "digital", direction: "input", simulatorOnly: true },
              { key: "__repeatName:0", name: "Item 0 Name", type: "serial", direction: "input", simulatorOnly: true },
              { key: "__repeatPress:0", name: "Item 0 Press", type: "digital", direction: "output", simulatorOnly: true },
            ]
          : []),
      ],
      rules = plan.behaviors,
      bridge = `<script>(function(){var callbacks={},rules=${JSON.stringify(rules)};function signature(rule){var nodes;try{nodes=document.querySelectorAll(rule.selector)}catch(error){return 'missing'}return Array.from(nodes).map(function(node){return node.outerHTML+'|'+node.getAttribute('style')+'|'+node.className}).join('||')}function repeatSignature(key){var item=document.querySelector('[data-repeat-index="0"]');return key==='itemCount'?(item?.parentElement?.outerHTML||''):(item?.outerHTML||'')}window.ComposerSignals={publish:function(key,value){parent.postMessage({type:'composer-translate-publish',key:key,value:value},'*')},subscribe:function(key,callback){(callbacks[key]||(callbacks[key]=[])).push(callback)}};window.ComposerComponent={publish:window.ComposerSignals.publish};function deliver(key,value){(callbacks[key]||[]).slice().forEach(function(callback){callback(value)})}window.addEventListener('message',function(event){var data=event.data||{};if(data.type==='composer-signal')deliver(data.key,data.value);if(data.type==='composer-translate-test-input'){var related=rules.filter(function(rule){return rule.source==='signal-input'&&rule.key===data.key}),before=related.map(signature),repeatBefore=repeatSignature(data.key);deliver(data.key,data.value);requestAnimationFrame(function(){var changed=related.filter(function(rule,index){return signature(rule)!==before[index]}).length,repeatAfter=repeatSignature(data.key);if(data.key.indexOf('__repeat')===0||data.key==='itemCount')changed+=repeatBefore!==repeatAfter?1:0;parent.postMessage({type:'composer-translate-input-result',key:data.key,value:data.value,targets:related.length+(data.key.indexOf('__repeat')===0||data.key==='itemCount'?1:0),changed:changed},'*')})}if(data.type==='composer-translate-test-outputs'){var missing=[];rules.filter(function(rule){return rule.source==='signal-output'}).forEach(function(rule){var target;try{target=document.querySelector(rule.selector)}catch(error){}if(!target){missing.push(rule.selector);return}function fire(name){target.dispatchEvent(new Event(name,{bubbles:true,cancelable:true}))}if(rule.action==='click')target.click();else if(rule.action==='release')fire('pointerup');else if(rule.action==='input'||rule.action==='change'){if('value'in target)target.value=target.type==='range'?String((Number(target.min||0)+Number(target.max||100))/2):'SELF_TEST';fire(rule.action)}else{fire('pointerdown');fire('pointerup')}});var repeated=document.querySelector('[data-repeat-index="0"]');if(repeated){repeated.dispatchEvent(new Event('pointerdown',{bubbles:true,cancelable:true}));repeated.dispatchEvent(new Event('pointerup',{bubbles:true,cancelable:true}))}parent.postMessage({type:'composer-translate-output-result',missing:missing},'*')}});window.addEventListener('error',function(event){parent.postMessage({type:'composer-translate-error',message:event.message},'*')})})();<\/script>`,
      stateCss = customStateCss(plan.stateStyles);
    let source =
        `<style>${css}\n${stateCss}</style>` +
        bridge +
        html +
        `<script>${translateSource.javascript}<\/script>` +
        customRepeatedFrameRuntime(repeatedConfig) +
        customStateRuntime(plan.stateStyles) +
        customBehaviorRuntime(rules, propertyValues);
    Object.entries(propertyValues).forEach(([key, value]) => {
      source = source.replaceAll(`{{${key}}}`, String(value ?? ""));
    });
    $("translate-live-preview").srcdoc = safeDoc(
      `<style>html,body{margin:0;width:100%;height:100%;box-sizing:border-box;background:#182126;color:#fff}body{padding:10px}body>*{box-sizing:border-box}</style>${source}`,
      "",
    );
    $("translate-signal-simulator").innerHTML = simulatorSignals.length
      ? simulatorSignals
          .map((signal) => {
            if (signal.direction === "output")
              return `<div class="translate-simulator-control"><span>${translateEscape(signal.name)}<small>output · ${translateEscape(signal.type)}${signal.simulatorOnly ? " · generated range" : ""}</small></span><output data-output-key="${translateEscape(signal.key)}">waiting</output></div>`;
            const control =
              signal.type === "digital"
                ? `<input type="checkbox" data-translate-signal="${translateEscape(signal.key)}" data-signal-type="digital">`
                : signal.type === "analog"
                  ? `<input type="range" min="0" max="65535" value="32768" data-translate-signal="${translateEscape(signal.key)}" data-signal-type="analog">`
                  : `<input type="text" value="TEST" data-translate-signal="${translateEscape(signal.key)}" data-signal-type="serial">`;
            return `<label class="translate-simulator-control"><span>${translateEscape(signal.name)}<small>input · ${translateEscape(signal.type)}${signal.simulatorOnly ? " · generated range" : ""}</small></span>${control}</label>`;
          })
          .join("")
      : '<p class="hint">Enable signals to create simulator controls.</p>';
    $("translate-signal-log").textContent = "Simulator loaded. Change an input or run Auto-test signals.";
  }
  function sendTranslateSimulatorSignal(input) {
    const value =
      input.dataset.signalType === "digital"
        ? input.checked
        : input.dataset.signalType === "analog"
          ? Number(input.value)
          : input.value;
    $("translate-live-preview").contentWindow?.postMessage(
      {
        type: "composer-translate-test-input",
        key: input.dataset.translateSignal,
        value,
      },
      "*",
    );
  }
  function appendTranslateSignalLog(line) {
    const log = $("translate-signal-log");
    log.textContent += `\n${line}`;
    log.scrollTop = log.scrollHeight;
  }
  function renderTranslateSignals(preserveValues = true) {
    const preserved = new Map(
        preserveValues
          ?
        [...$("translate-signals").querySelectorAll(".translate-signal-row")].map(
          (row) => [row.dataset.key, {
            enabled: row.querySelector('input[type="checkbox"]')?.checked,
            name: row.querySelector(".translate-signal-name")?.value,
            address: row.querySelector(".translate-signal-address")?.value,
            type: row.querySelector(".translate-signal-type")?.value,
            direction: row.querySelector(".translate-signal-direction")?.value,
          }],
        )
          : [],
      ),
      preset =
        translatePresets[$("translate-preset").value] ||
        translatePresets.custom,
      namespace =
        $("translate-name").value.replace(/[^A-Za-z0-9]+/g, "") ||
        "CustomComponent",
      detected = translateSource?.features || {},
      signals = [],
      addSignal = (signal) => {
        if (!signals.some((entry) => entry.key === signal.key))
          signals.push(signal);
      },
      buttonCount = detected.buttonCount || 0;
    preset.signals.forEach(addSignal);
    if (buttonCount) {
      ["press", "selected", "label"].forEach((key) => {
        const existing = signals.find((entry) => entry.key === key);
        if (existing && buttonCount > 1)
          signals.splice(signals.indexOf(existing), 1);
      });
      for (let index = 0; index < buttonCount; index++) {
        const suffix = buttonCount === 1 ? "" : String(index + 1),
          title = buttonCount === 1 ? "" : ` ${index + 1}`;
        addSignal({
          key: `press${suffix}`,
          name: `Press${title}`,
          type: "digital",
          direction: "output",
          suffix: buttonCount === 1 ? "Press" : `Button${index + 1}.Press`,
        });
        addSignal({
          key: `selected${suffix}`,
          name: `Selected${title}`,
          type: "digital",
          direction: "input",
          suffix:
            buttonCount === 1 ? "Selected" : `Button${index + 1}.Selected`,
        });
        addSignal({
          key: `name${suffix}`,
          name: `Name${title}`,
          type: "serial",
          direction: "input",
          suffix: buttonCount === 1 ? "Name" : `Button${index + 1}.Name`,
        });
      }
      addSignal({
        key: "disabled",
        name: "Disabled",
        type: "digital",
        direction: "input",
        suffix: "Disabled",
      });
    }
    (detected.textKeys || []).forEach((key, index) =>
      addSignal({
        key: `name${index ? index + 1 : ""}`,
        name: index ? `Text ${index + 1} Name` : "Name",
        type: "serial",
        direction: "input",
        suffix: index ? `Text${index + 1}.Name` : "Name",
      }),
    );
    if (detected.numericCount > 1)
      ["feedback", "set"].forEach((key) => {
        const existing = signals.find((entry) => entry.key === key);
        if (existing) signals.splice(signals.indexOf(existing), 1);
      });
    (detected.numericTargets || []).forEach((target, index) => {
      const suffix = detected.numericCount === 1 ? "" : String(index + 1),
        title = detected.numericCount === 1 ? "" : ` ${index + 1}`;
      addSignal({
        key: `feedback${suffix}`,
        name: `Feedback${title}`,
        type: "analog",
        direction: "input",
        suffix: detected.numericCount === 1 ? "Feedback" : `Value${index + 1}.Feedback`,
      });
      if (target.interactive)
        addSignal({
          key: `set${suffix}`,
          name: `Value Set${title}`,
          type: "analog",
          direction: "output",
          suffix: detected.numericCount === 1 ? "ValueSet" : `Value${index + 1}.ValueSet`,
        });
    });
    addSignal({
      key: "visibility",
      name: "Visibility",
      type: "digital",
      direction: "input",
      suffix: "Visibility",
      optionalProperty: "visibilityEnabled",
    });
    selectedTranslateInferences()
      .filter((entry) => entry.mode === "generated")
      .forEach((entry) =>
        addSignal({
          key: entry.key,
          name: entry.label,
          type: entry.type,
          direction: entry.direction,
          suffix: translatorKey(entry.label, entry.key),
        }),
      );
    $("translate-category").value = preset.category;
    $("translate-signals").innerHTML = signals
      .map(
        (signal) => {
          const prior = preserved.get(signal.key),
            name = prior?.name || signal.name,
            address = prior?.address || `${namespace}.${signal.suffix}`,
            type = prior?.type || signal.type,
            direction = prior?.direction || signal.direction;
          return `<label class="translate-signal-row" data-key="${translateEscape(signal.key)}" data-optional-property="${translateEscape(signal.optionalProperty || "")}"><input type="checkbox"${prior?.enabled === false ? "" : " checked"}><span><span class="translate-signal-key">${translateEscape(signal.key)}</span><input class="translate-signal-name" type="text" value="${translateEscape(name)}" aria-label="Signal label"></span><input class="translate-signal-address" type="text" value="${translateEscape(address)}" aria-label="Contract name or join"><select class="translate-signal-type" aria-label="Signal type">${["digital", "analog", "serial"].map((value) => `<option${value === type ? " selected" : ""}>${value}</option>`).join("")}</select><select class="translate-signal-direction" aria-label="Signal direction"><option${direction === "input" ? " selected" : ""}>input</option><option${direction === "output" ? " selected" : ""}>output</option></select></label>`;
        },
      )
      .join("");
    renderTranslateReview();
  }
  function openTranslateWizard(name, source) {
    translateSource = analyzeSnippet(name, source);
    $("translate-name").value = name
      .replace(/\.html?$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (value) => value.toUpperCase());
    $("translate-source-name").value = name;
    $("translate-source-preview").value = source;
    const features = translateSource.features,
      guessed = /toggle|switch/i.test(name)
        ? "toggle"
        : features.interactiveNumericCount ||
            /slider|knob|volume|dial/i.test(name)
          ? "slider"
          : features.numericCount || /gauge|meter|status/i.test(name)
            ? "gauge"
            : /input|text|search/i.test(name) && !features.buttonCount
              ? "text"
              : /nav|menu/i.test(name)
                ? "navigation"
                : "button";
    $("translate-preset").value = guessed;
    renderTranslateInferences();
    renderTranslateEditables();
    renderTranslateSignals();
    $("translate-test-result").textContent = "";
    $("translate-snippet-dialog").showModal();
    refreshTranslateSimulator();
  }
  $("translate-preset").onchange = () => {
    renderTranslateEditables();
    renderTranslateSignals();
  };
  $("translate-name").oninput = () => renderTranslateSignals(false);
  $("translate-editables").onchange = renderTranslateReview;
  $("translate-signals").oninput = renderTranslateReview;
  $("translate-signals").onchange = renderTranslateReview;
  $("translate-inferences").onchange = () => {
    renderTranslateSignals();
    renderTranslateReview();
  };
  $("translate-inferences").oninput = renderTranslateReview;
  $("translate-suggestions").onclick = (event) => {
    const button = event.target.closest("[data-translate-apply]");
    if (button)
      applyTranslateSuggestion(button.dataset.translateApply, button);
  };
  $("translate-select-all").onclick = () => {
    $("translate-editables")
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => (input.checked = true));
    renderTranslateReview();
  };
  $("translate-preview-refresh").onclick = refreshTranslateSimulator;
  $("translate-signal-simulator").oninput = (event) => {
    const input = event.target.closest("[data-translate-signal]");
    if (input) sendTranslateSimulatorSignal(input);
  };
  $("translate-test").onclick = async () => {
    if (!translateSource) return;
    refreshTranslateSimulator();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const { plan } = translatePreviewConfiguration(),
      documentValue = new DOMParser().parseFromString(translateSource.html, "text/html"),
      missing = [],
      simulatorInputs = [
        ...$("translate-signal-simulator").querySelectorAll(
          "[data-translate-signal]",
        ),
      ];
    plan.behaviors.forEach((rule) => {
      try {
        if (!documentValue.querySelector(rule.selector)) missing.push(rule.selector);
      } catch {
        missing.push(rule.selector);
      }
    });
    const uniqueMissing = [...new Set(missing)];
    translateSignalTestStats = {
      expectedInputs: simulatorInputs.length,
      results: 0,
      changed: 0,
      unchanged: 0,
      missing: uniqueMissing.length,
      outputs: 0,
    };
    $("translate-signal-log").textContent = "AUTO-TEST STARTED";
    for (const input of simulatorInputs) {
      const type = input.dataset.signalType,
        value =
        type === "digital"
          ? true
          : type === "analog"
            ? 49151
            : "TRANSLATOR_TEST";
      $("translate-live-preview").contentWindow?.postMessage(
        {
          type: "composer-translate-test-input",
          key: input.dataset.translateSignal,
          value,
        },
        "*",
      );
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    $("translate-live-preview").contentWindow?.postMessage(
      { type: "composer-translate-test-outputs" },
      "*",
    );
    setTimeout(() => {
      if (!translateSignalTestStats) return;
      const stats = translateSignalTestStats,
        failures = stats.missing + stats.unchanged;
      $("translate-test-result").textContent = failures
        ? `Completed with review items — ${stats.changed} visible input change(s), ${stats.unchanged} unchanged input(s), ${stats.missing} missing target(s), ${stats.outputs} output event(s).`
        : `PASS — ${stats.changed} input behavior(s) changed the preview and ${stats.outputs} output event(s) were captured.`;
      $("translate-test-result").classList.toggle("failed", !!failures);
    }, 500);
  };
  window.addEventListener("message", (event) => {
    if (event.source !== $("translate-live-preview").contentWindow) return;
    const data = event.data || {};
    if (data.type === "composer-translate-publish") {
      appendTranslateSignalLog(
        `OUTPUT ${data.key} = ${JSON.stringify(data.value)}`,
      );
      const output = $("translate-signal-simulator").querySelector(
        `[data-output-key="${CSS.escape(data.key)}"]`,
      );
      if (output) output.textContent = String(data.value);
      if (translateSignalTestStats) translateSignalTestStats.outputs++;
    } else if (data.type === "composer-translate-input-result") {
      const changed = data.changed > 0;
      appendTranslateSignalLog(
        `INPUT ${data.key} = ${JSON.stringify(data.value)} · ${data.targets} target(s) · ${changed ? `${data.changed} changed` : "NO VISIBLE CHANGE"}`,
      );
      if (translateSignalTestStats) {
        translateSignalTestStats.results++;
        if (changed) translateSignalTestStats.changed++;
        else translateSignalTestStats.unchanged++;
      }
    } else if (data.type === "composer-translate-output-result") {
      if (data.missing?.length) {
        translateSignalTestStats &&
          (translateSignalTestStats.missing += data.missing.length);
        appendTranslateSignalLog(
          `OUTPUT TEST missing: ${data.missing.join(", ")}`,
        );
      }
    } else if (data.type === "composer-translate-error") {
      appendTranslateSignalLog(`RUNTIME ERROR: ${data.message}`);
      if (translateSignalTestStats) translateSignalTestStats.unchanged++;
    }
  });
  $("translate-snippet").onclick = async () => {
    if (!native) {
      $("translate-snippet-file").click();
      return;
    }
    try {
      const files = await nativeRequest("importSnippets");
      if (files.length) openTranslateWizard(files[0].name, files[0].html);
      if (files.length > 1)
        setStatus(`Translating the first of ${files.length} selected snippets`);
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("translate-snippet-file").onchange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) openTranslateWizard(file.name, await file.text());
  };
  function translatedBehaviorPlan(
    properties,
    signals,
    detected,
    preset,
    inferredBehaviors = [],
  ) {
    const propertyKeys = new Set(properties.map((entry) => entry.key)),
      signalKeys = new Set(signals.map((entry) => entry.key)),
      behaviors = [],
      add = (rule) => {
        if (
          signalKeys.has(rule.key) ||
          (rule.source === "property" && propertyKeys.has(rule.key))
        )
          behaviors.push({ enabled: true, ...rule });
      },
      buttonSelector = "[data-translated-button]",
      textSelector =
        'button,input,textarea,[data-translated-text],[data-custom-text],.label,.text,.value',
      propertyRules = [
        ["textSize", textSelector, "fontSize"],
        ["textColor", textSelector, "color"],
        ["faceColor", buttonSelector, "backgroundColor"],
        ["borderColor", buttonSelector, "borderColor"],
        ["glowStrength", buttonSelector, "glowStrength", "{{glowColor}}"],
        ["cornerRadius", buttonSelector, "borderRadius"],
      ];
    propertyRules.forEach(([key, selector, action, parameter]) =>
      add({
        name: `Editable ${key}`,
        source: "property",
        key,
        selector,
        action,
        ...(parameter ? { parameter } : {}),
      }),
    );
    (detected.textKeys || []).forEach((key, index) => {
      add({
        name: `Editable text ${index + 1}`,
        source: "property",
        key,
        selector: `[data-translated-text="${key}"]`,
        action: "text",
      });
      add({
        name: `Serial text ${index + 1}`,
        source: "signal-input",
        key: `name${index ? index + 1 : ""}`,
        selector: `[data-translated-text="${key}"]`,
        action: "text",
      });
    });
    for (let index = 0; index < (detected.buttonCount || 0); index++) {
      const suffix = detected.buttonCount === 1 ? "" : String(index + 1),
        target = `[data-translated-button="${index}"]`,
        label = `${target} [data-translated-text],${target}[data-translated-text],${target} [data-custom-text],${target} .label,${target} span`;
      add({ name: `Button ${index + 1} Press`, source: "signal-output", key: `press${suffix}`, selector: target, action: "press" });
      add({ name: `Button ${index + 1} Selected`, source: "signal-input", key: `selected${suffix}`, selector: target, action: "selectedClass" });
      add({ name: `Button ${index + 1} Name`, source: "signal-input", key: `name${suffix}`, selector: label, action: "text" });
    }
    add({ name: "Component Disabled", source: "signal-input", key: "disabled", selector: buttonSelector, action: "disabledState" });
    add({ name: "Component Visibility", source: "signal-input", key: "visibility", selector: "body", action: "visibility" });
    (detected.numericTargets || []).forEach((target, index) => {
      const suffix = detected.numericCount === 1 ? "" : String(index + 1);
      add({
        name: `Numeric feedback ${index + 1}`,
        source: "signal-input",
        key: `feedback${suffix}`,
        selector: target.selector,
        action: target.visualFill ? "width" : "value",
        mapping: {
          enabled: true,
          inputMin: 0,
          inputMax: 65535,
          outputMin: target.visualFill ? 0 : target.min,
          outputMax: target.visualFill ? 100 : target.max,
          unit: target.visualFill ? "%" : "",
        },
      });
      if (target.interactive)
        add({
          name: `Numeric Value Set ${index + 1}`,
          source: "signal-output",
          key: `set${suffix}`,
          selector: target.selector,
          action: "input",
          mapping: {
            enabled: true,
            inputMin: target.min,
            inputMax: target.max,
            outputMin: 0,
            outputMax: 65535,
            unit: "",
          },
        });
    });
    if (preset === "text") {
      add({ name: "Text output", source: "signal-output", key: "text", selector: "input,textarea", action: "input" });
      add({ name: "Text feedback", source: "signal-input", key: "name", selector: "input,textarea", action: "value" });
    }
    inferredBehaviors
      .filter((entry) => entry.mode === "generated")
      .forEach((entry) =>
        add({
          name: `Inferred: ${entry.label}`,
          source: entry.source,
          key: entry.key,
          selector: entry.selector || "body",
          action: entry.action,
          ...(entry.parameter ? { parameter: entry.parameter } : {}),
          ...(entry.type === "analog"
            ? {
                mapping: {
                  enabled: true,
                  inputMin: 0,
                  inputMax: 65535,
                  outputMin: 0,
                  outputMax:
                    entry.action === "rotate"
                      ? 360
                      : entry.action === "scale"
                        ? 100
                        : 100,
                  unit: ["width", "height"].includes(entry.action)
                    ? "%"
                    : ["translateX", "translateY"].includes(entry.action)
                      ? "px"
                      : entry.action === "rotate"
                        ? "deg"
                        : "",
                },
              }
            : {}),
        }),
      );
    const token = (key, fallback) =>
        propertyKeys.has(key) ? `{{${key}}}` : fallback,
      stateStyles = (detected.buttonCount || 0)
        ? {
            selector: buttonSelector,
            states: {
              standard: { text: "", asset: "", assetData: "", background: token("faceColor", "#263b3c"), color: token("textColor", "#ffffff"), border: token("borderColor", "#7ba7a3"), glow: token("glowColor", "#04dcb9"), opacity: "100", scale: "100" },
              pressed: { text: "", asset: "", assetData: "", background: token("faceColor", "#1b2b2c"), color: token("textColor", "#ffffff"), border: token("borderColor", "#04dcb9"), glow: token("glowColor", "#04dcb9"), opacity: "100", scale: "96" },
              selected: { text: "", asset: "", assetData: "", background: token("selectedFaceColor", "#078f7d"), color: token("selectedTextColor", "#ffffff"), border: token("selectedBorderColor", "#04dcb9"), glow: token("selectedGlowColor", "#04dcb9"), opacity: "100", scale: "100" },
              disabled: { text: "", asset: "", assetData: "", background: "#303838", color: "#888888", border: "#555555", glow: "#000000", opacity: "55", scale: "100" },
            },
          }
        : null;
    return { behaviors, stateStyles };
  }
  $("translate-continue").onclick = () => {
    if (!translateSource) return;
    let html = translateSource.html,
      css = translateSource.css,
      javascript = translateSource.javascript;
    const properties = selectedTranslateProperties();
    properties.forEach((entry) => {
      if (entry.kind === "css-variable")
        css = css.replace(
          new RegExp(
            `(${entry.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*)${String(entry.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          ),
          `$1{{${entry.key}}}${/px$/i.test(String(entry.value)) ? "px" : ""}`,
        );
      else if (entry.kind === "literal")
        css = css.replaceAll(entry.source, `{{${entry.key}}}`);
      else if (entry.kind === "text")
        html = html.replace(entry.source, `{{${entry.key}}}`);
    });
    const signals = selectedTranslateSignals();
    if (
      signals.some((signal) => signal.key === "visibility") &&
      !properties.some((property) => property.key === "visibilityEnabled")
    )
      properties.push({
        key: "visibilityEnabled",
        label: "Enable visibility signal",
        type: "checkbox",
        value: true,
        kind: "generated-signal-option",
      });
    const preset = $("translate-preset").value,
      detected = translateSource.features,
      buttonLike =
        ["button", "toggle", "navigation"].includes(preset) ||
        detected.buttonCount > 0,
      hasShadowSize = properties.some((entry) => entry.key === "shadowSize"),
      hasGlowStrength = properties.some(
        (entry) => entry.key === "glowStrength",
      );
    if (buttonLike)
      css += `\nhtml,body{background:transparent!important;}\n${hasShadowSize ? `:root{--translated-shadow-size:{{shadowSize}}px;}` : ""}\nbutton,[role="button"],.btn{background:{{faceColor}};color:{{textColor}};border-color:{{borderColor}};border-radius:{{cornerRadius}}px;}\nbutton.active,[role="button"].active,.btn.active{background:{{selectedFaceColor}};color:{{selectedTextColor}};border-color:{{selectedBorderColor}};}\n${hasShadowSize ? `button,[role="button"],.btn{box-shadow:var(--translated-shadow-size) var(--translated-shadow-size) calc(var(--translated-shadow-size) * 2) var(--shadow-dark,#1a1c21),calc(var(--translated-shadow-size) * -1) calc(var(--translated-shadow-size) * -1) calc(var(--translated-shadow-size) * 2) var(--shadow-light,#3e444f);}` : ""}\n${hasGlowStrength ? `button,[role="button"],.btn{--translated-glow:{{glowColor}};}button.active,[role="button"].active,.btn.active{--translated-glow:{{selectedGlowColor}};box-shadow:inset 4px 4px 10px var(--shadow-dark,#1a1c21),inset -4px -4px 10px var(--shadow-light,#3e444f),0 0 calc({{glowStrength}}px * 2) var(--translated-glow);}` : ""}\nbutton svg,button img,[role="button"] svg,[role="button"] img,.btn svg,.btn img{width:{{iconSize}}px;height:{{iconSize}}px;}`;
    if (properties.some((entry) => entry.key === "textSize"))
      css +=
        "\nbutton,input,textarea,[data-translated-text],[data-custom-text],.label,.text,.value{font-size:{{textSize}}px;}";
    if (properties.some((entry) => entry.key === "textColor"))
      css +=
        "\nbutton,input,textarea,[data-translated-text],[data-custom-text],.label,.text,.value{color:{{textColor}};}";
    selectedTranslateInferences()
      .filter(
        (entry) => entry.mode === "generated" && entry.animationName,
      )
      .forEach((entry) => {
        const duration = properties.some((property) => property.key === "timingMs")
          ? "{{timingMs}}ms"
          : "500ms";
        css += `\nbody.composer-animation-active{animation:${entry.animationName} ${duration} both;}`;
      });
    if (translateSource.appliedSuggestions?.has("timing"))
      javascript = javascript.replace(
        /((?:setTimeout|setInterval)\s*\([\s\S]{0,300}?,\s*)\d+(\s*\))/g,
        "$1{{timingMs}}$2",
      );
    $("translate-snippet-dialog").close();
    openCustomBuilder();
    $("custom-component-name").value = $("translate-name").value;
    $("custom-component-category").value = $("translate-category").value;
    $("custom-source-html").value = html;
    $("custom-source-css").value = css;
    $("custom-source-javascript").value = javascript;
    $("custom-property-list").innerHTML = "";
    properties.forEach((entry) =>
      addCustomPropertyRow({
        key: entry.key,
        name: entry.label,
        type: entry.type,
        defaultValue:
          entry.type === "number" ? parseFloat(entry.value) || 0 : entry.value,
      }),
    );
    $("custom-signal-list").innerHTML = "";
    signals.forEach(addCustomSignalRow);
    const generatedPlan = translatedBehaviorPlan(
      properties,
      signals,
      detected,
      preset,
      selectedTranslateInferences(),
    );
    $("custom-behavior-list").innerHTML = "";
    generatedPlan.behaviors.forEach(addCustomBehaviorRow);
    setCustomStateStyles(generatedPlan.stateStyles);
    refreshCustomPreview();
    if (translateSource.features.repeatedItems) {
      const namespace =
        $("translate-name").value.replace(/[^A-Za-z0-9]+/g, "") ||
        "CustomComponent";
      setCustomRepeatedControls({
        ...translateSource.features.repeatedItems,
        namespace,
      });
      syncCustomRepeatedRows();
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
      state.assets.push(
        ...files.map((file) => ({ ...file, id: uid("asset-") })),
      );
      renderAssets();
      commitHistory();
      setStatus(
        `Imported ${files.length} asset${files.length === 1 ? "" : "s"} from the asset library`,
      );
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
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
          item.selectedGraphicAsset === asset.id ||
          Object.values(item.properties || {}).includes(asset.id),
      )
      .forEach((item) => {
        if (item.assetId === asset.id) {
          item.name = asset.name;
          item.source = assetSource(asset);
        }
        Object.entries(item.properties || {}).forEach(([key, value]) => {
          if (value === asset.id) item.properties[`${key}Data`] = asset.dataUrl;
        });
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
          i.deviceOverrides[key] = {
            x: i.x,
            y: i.y,
            w: i.w,
            h: i.h,
            panelWidth: state.width,
            panelHeight: state.height,
          };
          renderResponsiveEditor(i);
        }
      }),
  );
  function updateSelectedGraphic() {
    const item = current();
    if (!item) return;
    item.graphicAsset = $("prop-asset").value;
    item.selectedGraphicAsset = $("prop-asset-selected").value;
    item.graphicAssetMode =
      item.graphicAsset || item.selectedGraphicAsset
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
  $("prop-hide-on-page").onchange = (e) => {
    const item = current();
    if (!item || item.master !== true || item.systemManaged) {
      $("prop-hide-on-page-wrap").hidden = true;
      return;
    }
    const excluded = new Set(item.excludedPages || []);
    e.target.checked
      ? excluded.add(state.activePage)
      : excluded.delete(state.activePage);
    item.excludedPages = [...excluded];
    renderItem(item);
    setStatus(
      `${e.target.checked ? "Hid" : "Showed"} "${item.name}" on "${currentPage().name}"`,
    );
  };
  $("toast-queue-page-enabled").onchange = (e) => {
    const item = ensureToastQueueItem(),
      excluded = new Set(item.excludedPages || []);
    e.target.checked
      ? excluded.delete(state.activePage)
      : excluded.add(state.activePage);
    item.excludedPages = [...excluded];
    renderItem(item);
    setStatus(
      `${e.target.checked ? "Enabled" : "Disabled"} toast notifications on "${currentPage().name}"`,
    );
  };
  $("toast-queue-configure").onclick = () => select(ensureToastQueueItem().id);
  $("toast-queue-simulate").onclick = () =>
    openSignalSimulator(ensureToastQueueItem().id);
  $("toast-queue-editor-badge-close").onclick = () => select(null);
  function copySelected() {
    const items = selectedItems().filter((item) => !item.systemManaged);
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
      masterSubpage = state.subpages.find((entry) => entry.sourcePageId === state.activePage),
      canvasBounds = masterSubpage ? subpageResolved(masterSubpage, state.activePage) : { width: state.width, height: state.height },
      sourceBounds = {
        left: Math.min(...sourceItems.map((item) => Number(item.x) || 0)),
        top: Math.min(...sourceItems.map((item) => Number(item.y) || 0)),
        right: Math.max(...sourceItems.map((item) => (Number(item.x) || 0) + Math.max(20, Number(item.w) || 20))),
        bottom: Math.max(...sourceItems.map((item) => (Number(item.y) || 0) + Math.max(20, Number(item.h) || 20))),
      },
      groupWidth = sourceBounds.right - sourceBounds.left,
      groupHeight = sourceBounds.bottom - sourceBounds.top,
      fitOrigin = (start, end, groupSize, canvasSize) =>
        start < 0 || end > canvasSize
          ? Math.max(0, snap((canvasSize - groupSize) / 2))
          : Math.max(0, Math.min(Math.max(0, canvasSize - groupSize), snap(start + 20))),
      pasteOriginX = fitOrigin(sourceBounds.left, sourceBounds.right, groupWidth, canvasBounds.width),
      pasteOriginY = fitOrigin(sourceBounds.top, sourceBounds.bottom, groupHeight, canvasBounds.height),
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
        item.x = pasteOriginX + (Number(item.x) || 0) - sourceBounds.left;
        item.y = pasteOriginY + (Number(item.y) || 0) - sourceBounds.top;
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
        ? `Pasted “${pasted[0].name}”${masterSubpage ? ` inside subpage “${masterSubpage.name}”` : ""}`
        : `Pasted ${pasted.length} components${masterSubpage ? ` inside subpage “${masterSubpage.name}”` : ""}`,
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
  const subpageContextMenu = $("subpage-context-menu");
  function hideContextMenu() {
    contextMenu.hidden = true;
    layerContextMenu.hidden = true;
    subpageContextMenu.hidden = true;
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
  function showSubpageContextMenu(event, subpageId, pageId) {
    event.preventDefault(); event.stopPropagation();
    const entry = state.subpages.find((subpage) => subpage.id === subpageId), key = `${subpageId}:${pageId}`;
    if (!entry) return;
    contextSubpageId = subpageId; contextSubpagePageId = pageId;
    $("subpage-context-title").textContent = entry.name;
    $("subpage-context-highlight").textContent = highlightedSubpageInstances.has(key) ? "Remove boundary highlight" : "Highlight boundary";
    $("subpage-context-visibility").textContent = hiddenSubpageInstances.has(key) ? "Show in editor" : "Hide in editor";
    contextMenu.hidden = true; layerContextMenu.hidden = true; positionContextMenu(subpageContextMenu, event);
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
    $("edit-source").disabled = selection.length !== 1;
    $("create-custom-component").disabled = selection.length !== 1;
    $("duplicate").disabled = !selection.length;
    $("create-custom-component").textContent =
      selection.length === 1 &&
      state.customComponents.some((entry) => entry.id === item?.componentId)
        ? "Edit palette component"
        : "Create palette component";
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
    const contextAlign = $("context-align"),
      contextLayer = $("context-layer");
    contextAlign.value = "";
    contextLayer.value = "";
    contextAlign.disabled =
      !selection.length || selection.some((entry) => entry.locked);
    [...contextAlign.options].forEach((option) => {
      if (option.value.startsWith("distribute"))
        option.disabled = selection.length < 3;
    });
    contextLayer.disabled =
      selection.length !== 1 || selection.some((entry) => entry.locked);
    $("context-save-reusable").disabled = !selection.length;
    $("context-update-reusable").disabled =
      !selection.length || !selection[0]?.reusableId;
    $("context-detach-reusable").disabled =
      !selection.length || !selection[0]?.linkedInstanceId;
    $("context-reusable-master").disabled =
      !selection.length ||
      !selection[0]?.linkedInstanceId ||
      isReusableMaster(selection[0]);
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
  $("subpage-context-edit").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId);
    hideContextMenu(); if (!entry) return; state.activePage = entry.sourcePageId; renderPage(); setStatus(`Editing “${entry.name}” master`);
  };
  $("subpage-context-simulate").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId), pageId = contextSubpagePageId;
    hideContextMenu(); if (entry) simulateSubpage(entry, pageId);
  };
  $("subpage-context-highlight").onclick = () => {
    const key = `${contextSubpageId}:${contextSubpagePageId}`;
    if (highlightedSubpageInstances.has(key)) highlightedSubpageInstances.delete(key); else highlightedSubpageInstances.add(key);
    hideContextMenu(); renderPage();
  };
  $("subpage-context-visibility").onclick = () => {
    const key = `${contextSubpageId}:${contextSubpagePageId}`;
    if (hiddenSubpageInstances.has(key)) hiddenSubpageInstances.delete(key); else hiddenSubpageInstances.add(key);
    hideContextMenu(); renderPage();
  };
  $("subpage-context-properties").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId), pageId = contextSubpagePageId;
    hideContextMenu(); if (!entry) return; openSubpageProperties(entry); $("subpage-property-page").value = pageId; refreshSubpagePropertyFields();
  };
  $("subpage-context-detach").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId), pageId = contextSubpagePageId;
    hideContextMenu(); if (entry && confirm(`Detach “${entry.name}” on this page into independent normal widgets?`)) detachSubpageInstance(entry, pageId);
  };
  $("subpage-context-convert").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId);
    hideContextMenu(); if (entry) convertSubpageToNormalContent(entry);
  };
  $("subpage-context-duplicate").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId);
    hideContextMenu(); if (entry) duplicateSubpage(entry);
  };
  $("subpage-context-refactor").onclick = () => {
    const entry = state.subpages.find((subpage) => subpage.id === contextSubpageId);
    hideContextMenu(); if (entry) refactorSubpageNamespace(entry);
  };
  document.addEventListener("pointerdown", (e) => {
    if (
      (!contextMenu.hidden && !contextMenu.contains(e.target)) ||
      (!layerContextMenu.hidden && !layerContextMenu.contains(e.target)) ||
      (!subpageContextMenu.hidden && !subpageContextMenu.contains(e.target))
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
    if (items.some((item) => item.systemManaged)) {
      alert("Toast Notifications is a system component and can't be deleted.");
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
    if (!current() || current().systemManaged) return;
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
    return `${css ? `<style>${css}</style>` : ""}${html}${javascript ? (runtime ? customJavascriptRuntime(javascript) : `<script>${javascript}<\/script>`) : ""}`;
  }
  function prepareCustomSource(source) {
    if (String(source || "").includes("window.ComposerSignals=signals"))
      return source;
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
      '<input data-field="key" placeholder="key"><input data-field="name" placeholder="Label"><select data-field="type"><option>text</option><option>number</option><option>color</option><option>select</option><option>checkbox</option><option>asset</option></select><input data-field="defaultValue" placeholder="Default"><button type="button" class="custom-row-delete">×</button>';
    row.querySelector('[data-field="key"]').value = property.key || "";
    row.querySelector('[data-field="name"]').value = property.name || "";
    row.querySelector('[data-field="type"]').value = property.type || "text";
    row.querySelector('[data-field="defaultValue"]').value =
      property.type === "select"
        ? (property.options || []).map((option) => option.value).join(",")
        : (property.defaultValue ?? "");
    const keyInput = row.querySelector('[data-field="key"]');
    let previousKey = normalizeCustomKey(keyInput.value);
    row.querySelector("button").onclick = () => {
      removeCustomBehaviorReferences("property", previousKey);
      row.remove();
      refreshCustomPreview();
    };
    row
      .querySelectorAll("input,select")
      .forEach((input) => (input.oninput = refreshCustomPreview));
    keyInput.oninput = () => {
      const nextKey = normalizeCustomKey(keyInput.value);
      if (nextKey) {
        updateCustomBehaviorReferences(
          "property",
          previousKey,
          "property",
          nextKey,
        );
        previousKey = nextKey;
      }
      refreshCustomPreview();
    };
    $("custom-property-list").appendChild(row);
  }
  function addCustomSignalRow(signal = {}) {
    const row = document.createElement("div");
    row.className = "custom-signal-row";
    row.dataset.optionalProperty = signal.optionalProperty || "";
    row.innerHTML =
      '<input data-field="key" placeholder="key"><input data-field="name" placeholder="Label"><select data-field="type"><option>digital</option><option>analog</option><option>serial</option></select><select data-field="direction"><option>output</option><option>input</option></select><input data-field="defaultValue" placeholder="Join / contract"><button type="button" class="custom-row-delete">×</button>';
    ["key", "name", "type", "direction", "defaultValue"].forEach((key) => {
      row.querySelector(`[data-field="${key}"]`).value = signal[key] || "";
    });
    const keyInput = row.querySelector('[data-field="key"]'),
      directionInput = row.querySelector('[data-field="direction"]');
    let previousKey = normalizeCustomKey(keyInput.value),
      previousSource = `signal-${directionInput.value}`;
    row.querySelector("button").onclick = () => {
      removeCustomBehaviorReferences(previousSource, previousKey);
      row.remove();
      refreshCustomPreview();
    };
    row
      .querySelectorAll("input,select")
      .forEach((input) => (input.oninput = refreshCustomPreview));
    keyInput.oninput = () => {
      const nextKey = normalizeCustomKey(keyInput.value);
      if (nextKey) {
        updateCustomBehaviorReferences(
          previousSource,
          previousKey,
          previousSource,
          nextKey,
        );
        previousKey = nextKey;
      }
      refreshCustomPreview();
    };
    directionInput.onchange = () => {
      const nextSource = `signal-${directionInput.value}`;
      updateCustomBehaviorReferences(
        previousSource,
        previousKey,
        nextSource,
        previousKey,
      );
      previousSource = nextSource;
      refreshCustomPreview();
    };
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
              : type === "checkbox"
                ? /^(true|1|yes|on)$/i.test(rawDefault)
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
              ...(row.dataset.optionalProperty
                ? { optionalProperty: row.dataset.optionalProperty }
                : {}),
            }
          : null;
      })
      .filter(Boolean);
  }
  function normalizeCustomKey(value) {
    return String(value || "").replace(/[^A-Za-z0-9_$]/g, "_");
  }
  function updateCustomBehaviorReferences(
    previousSource,
    previousKey,
    nextSource,
    nextKey,
  ) {
    if (!previousKey || !nextKey) return;
    [...$("custom-behavior-list").children].forEach((row) => {
      const source = row.querySelector('[data-field="source"]'),
        key = row.querySelector('[data-field="key"]');
      if (source.value !== previousSource || key.value !== previousKey) return;
      source.value = nextSource;
      row.refreshBehaviorChoices?.(nextKey);
    });
  }
  function removeCustomBehaviorReferences(sourceValue, keyValue) {
    if (!keyValue) return;
    [...$("custom-behavior-list").children].forEach((row) => {
      if (
        row.querySelector('[data-field="source"]').value === sourceValue &&
        row.querySelector('[data-field="key"]').value === keyValue
      )
        row.remove();
    });
  }
  const customBehaviorActions = {
    value: [
      ["text", "Text content"],
      ["color", "Text / icon color"],
      ["backgroundColor", "Background color"],
      ["borderColor", "Border color"],
      ["fontSize", "Font size (px)"],
      ["opacity", "Opacity"],
      ["width", "Width (%)"],
      ["height", "Height (%)"],
      ["visibility", "Visibility"],
      ["selectedClass", "Selected class"],
      ["disabledState", "Disabled state"],
      ["value", "Form value"],
      ["cssProperty", "Custom CSS property"],
      ["cssVariable", "CSS variable"],
      ["attribute", "HTML attribute"],
      ["classToggle", "Custom class toggle"],
      ["scale", "Scale (0–100%)"],
      ["glowStrength", "Glow strength"],
      ["borderRadius", "Corner radius"],
      ["translateX", "Horizontal position"],
      ["translateY", "Vertical position"],
      ["rotate", "Rotation"],
      ["imageSource", "Image / asset source"],
      ["backgroundImage", "Background asset"],
    ],
    output: [
      ["press", "Pointer press / release"],
      ["click", "Click pulse"],
      ["release", "Release pulse"],
      ["hold", "Hold-complete pulse"],
      ["input", "Input value"],
      ["change", "Change value"],
    ],
  };
  function customBehaviorKeys(source) {
    return source === "property"
      ? collectCustomProperties().map((entry) => [entry.key, entry.name])
      : collectCustomSignals()
          .filter((entry) =>
            source === "signal-output"
              ? entry.direction === "output"
              : entry.direction === "input",
          )
          .map((entry) => [entry.key, entry.name]);
  }
  function behaviorOptions(entries, selected) {
    return entries
      .map(
        ([value, label]) =>
          `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`,
      )
      .join("");
  }
  function addCustomBehaviorRow(rule = {}) {
    const row = document.createElement("div");
    row.className = "custom-behavior-row";
    row.innerHTML =
      '<select data-field="source"><option value="property">Property</option><option value="signal-input">Input signal</option><option value="signal-output">Output signal</option></select><select data-field="key"></select><input data-field="selector" placeholder=".target"><select data-field="action"></select><input data-field="parameter" placeholder="Optional"><button type="button" class="custom-row-delete">×</button><div class="custom-behavior-mapping"><label><input data-field="mapEnabled" type="checkbox"> Map numeric range</label><label>Input min<input data-field="inputMin" type="number" value="0"></label><label>Input max<input data-field="inputMax" type="number" value="65535"></label><label>Output min<input data-field="outputMin" type="number" value="0"></label><label>Output max<input data-field="outputMax" type="number" value="30"></label><label>Unit<input data-field="unit" placeholder="px"></label><label><input data-field="booleanMapEnabled" type="checkbox"> Map digital states</label><label class="custom-map-wide">False / Standard value<input data-field="falseValue" placeholder="Standard value"></label><label class="custom-map-wide">True / Selected value<input data-field="trueValue" placeholder="Selected value"></label></div>';
    const source = row.querySelector('[data-field="source"]'),
      key = row.querySelector('[data-field="key"]'),
      selector = row.querySelector('[data-field="selector"]'),
      action = row.querySelector('[data-field="action"]'),
      parameter = row.querySelector('[data-field="parameter"]'),
      mapEnabled = row.querySelector('[data-field="mapEnabled"]'),
      booleanMapEnabled = row.querySelector(
        '[data-field="booleanMapEnabled"]',
      );
    const assetListId = `custom-behavior-assets-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      assetList = document.createElement("datalist");
    assetList.id = assetListId;
    state.assets
      .filter((asset) => asset.type?.startsWith("image/"))
      .forEach((asset) => {
        const option = document.createElement("option");
        option.value = asset.dataUrl;
        option.label = asset.name;
        assetList.appendChild(option);
      });
    row.appendChild(assetList);
    row.querySelector('[data-field="falseValue"]').setAttribute("list", assetListId);
    row.querySelector('[data-field="trueValue"]').setAttribute("list", assetListId);
    source.value = rule.source || "property";
    selector.value = rule.selector || $("custom-element-selector").value || "";
    parameter.value = rule.parameter || "";
    mapEnabled.checked = Boolean(rule.mapping?.enabled);
    booleanMapEnabled.checked = Boolean(rule.booleanMapping?.enabled);
    ["inputMin", "inputMax", "outputMin", "outputMax", "unit"].forEach(
      (field) => {
        const input = row.querySelector(`[data-field="${field}"]`);
        if (rule.mapping?.[field] !== undefined)
          input.value = rule.mapping[field];
      },
    );
    row.querySelector('[data-field="falseValue"]').value =
      rule.booleanMapping?.falseValue ?? "";
    row.querySelector('[data-field="trueValue"]').value =
      rule.booleanMapping?.trueValue ?? "";
    const tools = document.createElement("div");
    tools.className = "custom-behavior-tools";
    tools.innerHTML =
      '<label><input data-field="enabled" type="checkbox" checked> Enabled</label><input data-field="ruleName" placeholder="Optional rule name"><button type="button" data-action="up" title="Move up">↑</button><button type="button" data-action="down" title="Move down">↓</button><button type="button" data-action="duplicate">Duplicate</button>';
    tools.querySelector('[data-field="enabled"]').checked =
      rule.enabled !== false;
    tools.querySelector('[data-field="ruleName"]').value = rule.name || "";
    row.appendChild(tools);
    function refreshMapping() {
      row
        .querySelectorAll(
          '[data-field="inputMin"],[data-field="inputMax"],[data-field="outputMin"],[data-field="outputMax"],[data-field="unit"]',
        )
        .forEach((input) => (input.disabled = !mapEnabled.checked));
      row
        .querySelectorAll('[data-field="falseValue"],[data-field="trueValue"]')
        .forEach((input) => (input.disabled = !booleanMapEnabled.checked));
    }
    function refreshChoices(preferredKey) {
      const keys = customBehaviorKeys(source.value);
      key.innerHTML = behaviorOptions(
        keys,
        preferredKey || key.value || rule.key,
      );
      const actions =
        source.value === "signal-output"
          ? customBehaviorActions.output
          : customBehaviorActions.value;
      action.innerHTML = behaviorOptions(actions, action.value || rule.action);
      const parameterHints = {
        cssProperty: "CSS property, e.g. box-shadow",
        cssVariable: "CSS variable, e.g. --level",
        attribute: "Attribute, e.g. aria-label",
        classToggle: "Class name, e.g. active",
        glowStrength: "Glow color or CSS variable",
        hold: "Hold duration in ms, e.g. 1000",
      };
      parameter.placeholder = parameterHints[action.value] || "Not required";
      parameter.disabled = !parameterHints[action.value];
    }
    row.refreshBehaviorChoices = refreshChoices;
    refreshChoices();
    refreshMapping();
    row.querySelector("button").onclick = () => {
      row.remove();
      refreshCustomPreview();
    };
    tools.querySelector('[data-action="up"]').onclick = () => {
      const previous = row.previousElementSibling;
      if (previous) row.parentElement.insertBefore(row, previous);
      refreshCustomPreview();
    };
    tools.querySelector('[data-action="down"]').onclick = () => {
      const next = row.nextElementSibling;
      if (next) row.parentElement.insertBefore(next, row);
      refreshCustomPreview();
    };
    tools.querySelector('[data-action="duplicate"]').onclick = () => {
      addCustomBehaviorRow(collectCustomBehaviorRow(row));
      refreshCustomPreview();
    };
    source.onchange = () => {
      rule.key = "";
      rule.action = "";
      refreshChoices();
      refreshCustomPreview();
    };
    action.onchange = () => {
      refreshChoices();
      refreshCustomPreview();
    };
    mapEnabled.onchange = () => {
      if (mapEnabled.checked) booleanMapEnabled.checked = false;
      refreshMapping();
      refreshCustomPreview();
    };
    booleanMapEnabled.onchange = () => {
      if (booleanMapEnabled.checked) mapEnabled.checked = false;
      refreshMapping();
      refreshCustomPreview();
    };
    row.querySelectorAll("input,select").forEach((input) => {
      if (input !== source) input.oninput = refreshCustomPreview;
    });
    $("custom-behavior-list").appendChild(row);
  }
  function customContractBase() {
    return (
      $("custom-name")
        .value.trim()
        .replace(/[^A-Za-z0-9_]/g, "") || "CustomComponent"
    );
  }
  function ensureCustomProperty(property) {
    const existing = collectCustomProperties().find(
      (entry) => entry.key === property.key,
    );
    if (!existing) addCustomPropertyRow(property);
  }
  function ensureCustomSignal(signal) {
    const existing = collectCustomSignals().find(
      (entry) => entry.key === signal.key,
    );
    if (!existing) addCustomSignalRow(signal);
  }
  function uniqueCustomBehaviorKey(baseKey, source, selector, action) {
    const behaviors = collectCustomBehaviors(),
      sameRule = behaviors.find(
        (rule) =>
          rule.source === source &&
          rule.action === action &&
          rule.selector === selector,
      );
    if (sameRule) return { key: baseKey, duplicate: true };
    const keys = new Set(
      source === "property"
        ? collectCustomProperties().map((entry) => entry.key)
        : collectCustomSignals().map((entry) => entry.key),
    );
    if (!keys.has(baseKey)) return { key: baseKey, duplicate: false };
    let index = 2;
    while (keys.has(`${baseKey}${index}`)) index += 1;
    return { key: `${baseKey}${index}`, duplicate: false };
  }
  function addCustomBehaviorPreset() {
    const selector = $("custom-element-selector").value.trim();
    if (!selector) {
      alert("Pick a preview element or enter its CSS selector first.");
      return;
    }
    const base = customContractBase(),
      preset = $("custom-behavior-preset").value,
      definitions = {
        propertyText: {
          property: { key: "text", name: "Text", type: "text", defaultValue: "Text" },
          behavior: { source: "property", key: "text", action: "text" },
        },
        propertyTextColor: {
          property: { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
          behavior: { source: "property", key: "textColor", action: "color" },
        },
        propertyBackground: {
          property: { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#26383a" },
          behavior: { source: "property", key: "backgroundColor", action: "backgroundColor" },
        },
        propertyFontSize: {
          property: { key: "textSize", name: "Text size", type: "number", defaultValue: 18 },
          behavior: { source: "property", key: "textSize", action: "fontSize" },
        },
        propertyGlow: {
          property: { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 12 },
          behavior: { source: "property", key: "glowStrength", action: "glowStrength", parameter: "#00e5c3" },
        },
        propertyAsset: {
          property: { key: "asset", name: "Image / asset", type: "asset", defaultValue: state.assets.find((asset) => asset.type?.startsWith("image/"))?.id || "" },
          behavior: { source: "property", key: "asset", action: "imageSource" },
        },
        serialText: {
          signal: { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: `${base}.Name` },
          behavior: { source: "signal-input", key: "name", action: "text" },
        },
        analogGlow: {
          signal: { key: "glowFeedback", name: "Glow Feedback", type: "analog", direction: "input", defaultValue: `${base}.GlowFeedback` },
          behavior: { source: "signal-input", key: "glowFeedback", action: "glowStrength", parameter: "#00e5c3", mapping: { enabled: true, inputMin: 0, inputMax: 65535, outputMin: 0, outputMax: 30, unit: "px" } },
        },
        digitalVisibility: {
          signal: { key: "visibility", name: "Visibility", type: "digital", direction: "input", defaultValue: `${base}.Visibility` },
          behavior: { source: "signal-input", key: "visibility", action: "visibility" },
        },
        digitalSelected: {
          signal: { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: `${base}.Selected` },
          behavior: { source: "signal-input", key: "selected", action: "selectedClass" },
        },
        pressOutput: {
          signal: { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: `${base}.Press` },
          behavior: { source: "signal-output", key: "press", action: "press" },
        },
      },
      definition = structuredClone(definitions[preset]);
    if (!definition) return;
    const entry = definition.property || definition.signal,
      keyResult = uniqueCustomBehaviorKey(
        entry.key,
        definition.behavior.source,
        selector,
        definition.behavior.action,
      );
    if (keyResult.duplicate) {
      alert("That preset is already connected to the selected element.");
      return;
    }
    if (keyResult.key !== entry.key) {
      const suffix = keyResult.key.slice(entry.key.length);
      entry.key = keyResult.key;
      entry.name = `${entry.name} ${suffix}`;
      definition.behavior.key = keyResult.key;
      if (definition.signal)
        definition.signal.defaultValue = `${base}.${definition.signal.name.replace(/\s+/g, "")}`;
    }
    if (definition.property) ensureCustomProperty(definition.property);
    if (definition.signal) ensureCustomSignal(definition.signal);
    addCustomBehaviorRow({ ...definition.behavior, selector });
    refreshCustomPreview();
  }
  function collectCustomBehaviorRow(row) {
        const value = (key) =>
            row.querySelector(`[data-field="${key}"]`)?.value.trim() || "",
          source = value("source"),
          key = value("key"),
          selector = value("selector"),
          action = value("action"),
          parameter = value("parameter"),
          mapEnabled = row.querySelector('[data-field="mapEnabled"]')?.checked,
          mapping = mapEnabled
            ? {
                enabled: true,
                inputMin: Number(value("inputMin")),
                inputMax: Number(value("inputMax")),
                outputMin: Number(value("outputMin")),
                outputMax: Number(value("outputMax")),
                unit: value("unit"),
              }
            : null,
          booleanMapEnabled = row.querySelector(
            '[data-field="booleanMapEnabled"]',
          )?.checked,
          booleanMapping = booleanMapEnabled
            ? {
                enabled: true,
                falseValue: value("falseValue"),
                trueValue: value("trueValue"),
              }
            : null,
          enabled = row.querySelector('[data-field="enabled"]')?.checked !== false,
          name = value("ruleName");
        return source && key && selector && action
          ? {
              source,
              key,
              selector,
              action,
              ...(parameter ? { parameter } : {}),
              ...(mapping ? { mapping } : {}),
              ...(booleanMapping ? { booleanMapping } : {}),
              enabled,
              ...(name ? { name } : {}),
            }
          : null;
  }
  function collectCustomBehaviors() {
    return [...$("custom-behavior-list").children]
      .map(collectCustomBehaviorRow)
      .filter(Boolean);
  }
  function customBehaviorRuntime(rules, properties = {}) {
    if (!rules?.length) return "";
    return `<script>(function(){
var rules=${JSON.stringify(rules)},properties=${JSON.stringify(properties)};
function truthy(value){return value===true||value===1||value==='1'||String(value).toLowerCase()==='true'}
function mapped(rule,value){if(rule.booleanMapping&&rule.booleanMapping.enabled)return truthy(value)?rule.booleanMapping.trueValue:rule.booleanMapping.falseValue;if(!rule.mapping||!rule.mapping.enabled)return value;var m=rule.mapping,n=Number(value),span=Number(m.inputMax)-Number(m.inputMin);if(!Number.isFinite(n)||!span)return Number(m.outputMin)||0;var ratio=Math.max(0,Math.min(1,(n-Number(m.inputMin))/span));return Number(m.outputMin)+ratio*(Number(m.outputMax)-Number(m.outputMin))}
function transforms(target){target.style.transform='translateX(var(--composer-translate-x,0px)) translateY(var(--composer-translate-y,0px)) rotate(var(--composer-rotate,0deg)) scale(var(--composer-scale,1))'}
function apply(rule,value){var targets;try{targets=document.querySelectorAll(rule.selector)}catch(error){return}var mappedValue=mapped(rule,value),unit=rule.mapping&&rule.mapping.enabled?(rule.mapping.unit||''):'';targets.forEach(function(target){switch(rule.action){case'text':target.textContent=mappedValue==null?'':String(mappedValue);break;case'color':target.style.color=String(mappedValue||'');break;case'backgroundColor':target.style.backgroundColor=String(mappedValue||'');break;case'borderColor':target.style.borderColor=String(mappedValue||'');break;case'fontSize':target.style.fontSize=(Number(mappedValue)||0)+(unit||'px');break;case'opacity':target.style.opacity=String(Math.max(0,Math.min(1,Number(mappedValue)>1?Number(mappedValue)/100:Number(mappedValue))));break;case'width':target.style.width=Math.max(0,Number(mappedValue)||0)+(unit||'%');break;case'height':target.style.height=Math.max(0,Number(mappedValue)||0)+(unit||'%');break;case'visibility':target.style.visibility=truthy(mappedValue)?'visible':'hidden';break;case'selectedClass':target.classList.toggle('selected',truthy(mappedValue));target.classList.toggle('active',truthy(mappedValue));break;case'disabledState':var disabled=truthy(mappedValue);target.classList.toggle('disabled',disabled);if('disabled'in target)target.disabled=disabled;target.setAttribute('aria-disabled',String(disabled));break;case'value':target.value=mappedValue==null?'':String(mappedValue);break;case'cssProperty':if(rule.parameter)target.style.setProperty(rule.parameter,String(mappedValue??'')+unit);break;case'cssVariable':if(rule.parameter)target.style.setProperty(rule.parameter.indexOf('--')===0?rule.parameter:'--'+rule.parameter,String(mappedValue??''));break;case'attribute':if(rule.parameter){if(mappedValue==null||mappedValue===false)target.removeAttribute(rule.parameter);else target.setAttribute(rule.parameter,String(mappedValue))}break;case'classToggle':if(rule.parameter)target.classList.toggle(rule.parameter,truthy(mappedValue));break;case'scale':target.style.setProperty('--composer-scale',String(Math.max(0,Number(mappedValue)||0)/100));transforms(target);break;case'glowStrength':var strength=Math.max(0,Number(mappedValue)||0),color=rule.parameter||'var(--glow-color,#00e5c3)';target.style.boxShadow='0 0 '+strength+(unit||'px')+' '+color+',0 0 '+strength*2+(unit||'px')+' '+color;break;case'borderRadius':target.style.borderRadius=Math.max(0,Number(mappedValue)||0)+(unit||'px');break;case'translateX':target.style.setProperty('--composer-translate-x',String(Number(mappedValue)||0)+(unit||'px'));transforms(target);break;case'translateY':target.style.setProperty('--composer-translate-y',String(Number(mappedValue)||0)+(unit||'px'));transforms(target);break;case'rotate':target.style.setProperty('--composer-rotate',String(Number(mappedValue)||0)+(unit||'deg'));transforms(target);break;case'imageSource':if(target.tagName==='IMG')target.src=String(mappedValue||'');else target.style.backgroundImage=mappedValue?'url("'+String(mappedValue).replace(/"/g,'\\"')+'")':'none';break;case'backgroundImage':target.style.backgroundImage=mappedValue?'url("'+String(mappedValue).replace(/"/g,'\\"')+'")':'none';target.style.backgroundRepeat='no-repeat';target.style.backgroundPosition='center';target.style.backgroundSize='contain';break;}})}
function pulse(key){window.ComposerSignals.publish(key,true);setTimeout(function(){window.ComposerSignals.publish(key,false)},50)}
rules.forEach(function(rule){if(rule.enabled===false)return;if(rule.source==='property'){apply(rule,properties[rule.key]);return}if(rule.source==='signal-input'){window.ComposerSignals.subscribe(rule.key,function(value){apply(rule,value)});return}var targets;try{targets=document.querySelectorAll(rule.selector)}catch(error){return}targets.forEach(function(target){if(rule.action==='press'){var release=function(){window.ComposerSignals.publish(rule.key,false)};target.addEventListener('pointerdown',function(event){event.preventDefault();window.ComposerSignals.publish(rule.key,true)});target.addEventListener('pointerup',release);target.addEventListener('pointercancel',release);target.addEventListener('pointerleave',release)}else if(rule.action==='click')target.addEventListener('click',function(){pulse(rule.key)});else if(rule.action==='release')target.addEventListener('pointerup',function(){pulse(rule.key)});else if(rule.action==='hold'){var timer=0,complete=false,cancel=function(){clearTimeout(timer);timer=0;complete=false};target.addEventListener('pointerdown',function(){cancel();timer=setTimeout(function(){complete=true;pulse(rule.key)},Math.max(1,Number(rule.parameter)||1000))});target.addEventListener('pointerup',cancel);target.addEventListener('pointercancel',cancel);target.addEventListener('pointerleave',cancel)}else target.addEventListener(rule.action,function(){var raw=target.type==='range'||target.type==='number'?Number(target.value):target.type==='checkbox'?target.checked:target.value;window.ComposerSignals.publish(rule.key,mapped(rule,raw))})})});
})();<\/script>`;
  }
  function customBehaviorCss(rules) {
    const declarations = {
      color: "color",
      backgroundColor: "background-color",
      borderColor: "border-color",
      fontSize: "font-size",
      opacity: "opacity",
      width: "width",
      height: "height",
    };
    return (rules || [])
      .filter((rule) => rule.enabled !== false && rule.source === "property" && declarations[rule.action])
      .map((rule) => {
        const suffix = ["fontSize"].includes(rule.action)
          ? "px"
          : ["width", "height"].includes(rule.action)
            ? "%"
            : "";
        return `${rule.selector} { ${declarations[rule.action]}: {{${rule.key}}}${suffix}; }`;
      })
      .join("\n");
  }
  function collectCustomStateStyles() {
    const selector = $("custom-state-selector").value.trim();
    if (!selector) return null;
    const states = {};
    $("custom-state-grid")
      .querySelectorAll(".custom-state-row")
      .forEach((row) => {
        const values = {};
        row.querySelectorAll("[data-style]").forEach((input) => {
          values[input.dataset.style] = input.value.trim();
        });
        const asset = state.assets.find(
          (entry) => entry.id === values.asset,
        );
        values.assetData = asset?.dataUrl || "";
        states[row.dataset.state] = values;
      });
    return { selector, states };
  }
  function setCustomStateStyles(config) {
    const defaults = {
      standard: { text: "", asset: "", background: "#263b3c", color: "#ffffff", border: "#7ba7a3", glow: "#00e5c3", opacity: "100", scale: "100" },
      pressed: { text: "", asset: "", background: "#1b2b2c", color: "#ffffff", border: "#04dcb9", glow: "#00e5c3", opacity: "100", scale: "96" },
      selected: { text: "", asset: "", background: "#078f7d", color: "#ffffff", border: "#04dcb9", glow: "#00e5c3", opacity: "100", scale: "100" },
      disabled: { text: "", asset: "", background: "#303838", color: "#888888", border: "#555555", glow: "#000000", opacity: "55", scale: "100" },
    };
    $("custom-state-selector").value = config?.selector || "";
    $("custom-state-grid")
      .querySelectorAll(".custom-state-row")
      .forEach((row) => {
        const values = config?.states?.[row.dataset.state] || defaults[row.dataset.state];
        const assetSelect = row.querySelector('[data-style="asset"]'),
          emptyLabel = row.dataset.state === "standard"
            ? "No state asset"
            : "Use Standard asset";
        assetSelect.innerHTML = `<option value="">${emptyLabel}</option>`;
        state.assets
          .filter((asset) => asset.type?.startsWith("image/"))
          .forEach((asset) => {
            const option = document.createElement("option");
            option.value = asset.id;
            option.textContent = asset.name;
            assetSelect.appendChild(option);
          });
        if (
          values.asset &&
          ![...assetSelect.options].some((option) => option.value === values.asset)
        ) {
          const embedded = document.createElement("option");
          embedded.value = values.asset;
          embedded.textContent = "Embedded component asset";
          assetSelect.appendChild(embedded);
        }
        row.querySelectorAll("[data-style]").forEach((input) => {
          if (values[input.dataset.style] != null)
            input.value = values[input.dataset.style];
        });
      });
  }
  function customStateCss(config) {
    if (!config?.selector || !config.states) return "";
    const suffixes = {
        standard: "",
        pressed: ":active",
        selected: ".selected",
        disabled: ".disabled",
      },
      aliases = {
        pressed: `${config.selector}.composer-pressed`,
        selected: `${config.selector}.active`,
        disabled: `${config.selector}[disabled]`,
      };
    return Object.entries(config.states)
      .map(([stateName, values]) => {
        const selector = `${config.selector}${suffixes[stateName] || ""}`,
          selectors = aliases[stateName]
            ? `${selector},${aliases[stateName]}`
            : selector,
          opacity = Math.max(0, Math.min(100, Number(values.opacity) || 0)) / 100,
          scale = Math.max(0, Number(values.scale) || 0) / 100;
        return `${selectors}{background-color:${values.background}!important;color:${values.color}!important;border-color:${values.border}!important;box-shadow:0 0 12px ${values.glow}!important;opacity:${opacity}!important;transform:scale(${scale})!important;transition:background-color .16s,color .16s,border-color .16s,box-shadow .16s,opacity .16s,transform .12s!important;${stateName === "disabled" ? "pointer-events:none!important;" : ""}}`;
      })
      .join("\n");
  }
  function customStateRuntime(config) {
    if (!config?.selector || !config.states) return "";
    return `<script>(function(){var config=${JSON.stringify(config)},hasStateText=Object.keys(config.states).some(function(key){return!!config.states[key].text});function setup(target){var textTarget=target.querySelector('[data-state-text],[data-custom-text],.button-label,.label')||target,originalText=textTarget.textContent,pressed=false;function current(){if(target.classList.contains('disabled')||target.hasAttribute('disabled'))return'disabled';if(target.classList.contains('selected')||target.classList.contains('active'))return'selected';if(pressed)return'pressed';return'standard'}function apply(){var name=current(),state=config.states[name]||{},standard=config.states.standard||{},text=state.text||standard.text,asset=state.assetData||standard.assetData;if(text)textTarget.textContent=text;else if(hasStateText)textTarget.textContent=originalText;if(target.tagName==='IMG'){if(asset)target.src=asset}else target.style.backgroundImage=asset?'url("'+String(asset).replace(/"/g,'\\"')+'")':''}target.addEventListener('pointerdown',function(){pressed=true;target.classList.add('composer-pressed');apply()});['pointerup','pointercancel','pointerleave'].forEach(function(eventName){target.addEventListener(eventName,function(){pressed=false;target.classList.remove('composer-pressed');apply()})});new MutationObserver(apply).observe(target,{attributes:true,attributeFilter:['class','disabled']});apply()}document.querySelectorAll(config.selector).forEach(setup)})();<\/script>`;
  }
  function refreshCustomGeneratedCode() {
    const rules = collectCustomBehaviors(),
      properties = Object.fromEntries(
        collectCustomProperties().map((property) => [
          property.key,
          `{{${property.key}}}`,
        ]),
      );
    $("custom-generated-css").value =
      [customStateCss(collectCustomStateStyles()), customBehaviorCss(rules)]
        .filter(Boolean)
        .join("\n") || "/* No generated CSS rules yet. */";
    $("custom-generated-javascript").value =
      customBehaviorRuntime(rules, properties) ||
      "// No generated JavaScript behaviors yet.";
  }
  function collectCustomRepeatedItems() {
    if (!$("custom-repeat-enabled").checked) return null;
    const namespace =
      $("custom-repeat-namespace")
        .value.trim()
        .replace(/[^A-Za-z0-9_]/g, "") || "CustomComponent";
    return {
      containerSelector:
        $("custom-repeat-container").value.trim() || ".split-menu",
      itemSelector: $("custom-repeat-item").value.trim() || "button",
      labelSelector: $("custom-repeat-label").value.trim(),
      defaultCount: Math.max(
        0,
        Math.min(
          100,
          Math.round(Number($("custom-repeat-default").value) || 0),
        ),
      ),
      maxCount: Math.max(
        1,
        Math.min(100, Math.round(Number($("custom-repeat-max").value) || 20)),
      ),
      namespace,
    };
  }
  function repeatedItemProperties(config) {
    if (!config) return [];
    return [
      {
        key: "defaultCount",
        name: "Default sub-items",
        type: "number",
        defaultValue: config.defaultCount,
      },
      {
        key: "signalIncrement",
        name: "Join increment",
        type: "number",
        defaultValue: 1,
      },
      {
        key: "pressBase",
        name: "Digital item press base / pattern",
        type: "text",
        defaultValue: `${config.namespace}.Items[{index}].Press`,
      },
      {
        key: "feedbackBase",
        name: "Digital item selected base / pattern",
        type: "text",
        defaultValue: `${config.namespace}.Items[{index}].Selected`,
      },
      {
        key: "labelBase",
        name: "Serial item name base / pattern",
        type: "text",
        defaultValue: `${config.namespace}.Items[{index}].Name`,
      },
    ];
  }
  function repeatedItemSignals(config) {
    return config
      ? [
          {
            key: "itemCount",
            name: "Number of sub-items",
            type: "analog",
            direction: "input",
            defaultValue: `${config.namespace}.ItemCount`,
          },
        ]
      : [];
  }
  function repeatedItemRanges(config) {
    if (!config) return [];
    return [
      {
        name: "Digital sub-item press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital sub-item selected range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial sub-item name range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "signalIncrement",
      },
    ];
  }
  function mergeCustomRows(base, generated) {
    const result = base.filter(
      (entry) => !generated.some((item) => item.key === entry.key),
    );
    return [...result, ...generated];
  }
  function customRepeatedFrameRuntime(config) {
    if (!config) return "";
    return `<script>(function(){
var config=${JSON.stringify(config)},container=document.querySelector(config.containerSelector);if(!container)return;
var originals=Array.prototype.slice.call(container.querySelectorAll(config.itemSelector)),template=originals[0]?originals[0].cloneNode(true):document.createElement('button'),labels=originals.map(function(item){var label=config.labelSelector?item.querySelector(config.labelSelector):item.querySelector('[data-repeat-label],.label,.text,span');return (label||item).textContent.trim()});
function target(item){return (config.labelSelector&&item.querySelector(config.labelSelector))||item.querySelector('[data-repeat-label],.label,.text,span')||item}
function truthy(value){return value===true||value===1||value==='1'||String(value).toLowerCase()==='true'}
function wire(item,index){item.dataset.repeatIndex=String(index);if(item.dataset.repeatWired==='1')return;item.dataset.repeatWired='1';var release=function(){window.ComposerSignals.publish('__repeatPress:'+index,false)};item.addEventListener('pointerdown',function(event){event.preventDefault();window.ComposerSignals.publish('__repeatPress:'+index,true)});item.addEventListener('pointerup',release);item.addEventListener('pointercancel',release);item.addEventListener('pointerleave',release);window.ComposerSignals.subscribe('__repeatSelected:'+index,function(value){item.classList.toggle('active',truthy(value))});window.ComposerSignals.subscribe('__repeatName:'+index,function(value){if(value!=null&&value!=='')target(item).textContent=String(value)})}
function render(value){var count=Math.max(0,Math.min(config.maxCount,Math.round(Number(value)||0))),items=Array.prototype.slice.call(container.querySelectorAll(config.itemSelector));while(items.length>count){items.pop().remove()}while(items.length<count){var item=template.cloneNode(true);item.removeAttribute('id');container.appendChild(item);items.push(item)}items.forEach(function(item,index){if(!target(item).textContent.trim())target(item).textContent=labels[index]||('Item '+(index+1));wire(item,index)})}
window.ComposerSignals.subscribe('itemCount',render);render(config.defaultCount);
})();<\/script>`;
  }
  function customBehaviorTypeWarnings(rule, properties, signals) {
    const warnings = [],
      label = rule.name ? `Behavior “${rule.name}”` : `Behavior “${rule.action}”`,
      property = properties.find((entry) => entry.key === rule.key),
      signal = signals.find((entry) => entry.key === rule.key),
      numericActions = new Set([
        "fontSize", "opacity", "width", "height", "scale", "glowStrength",
        "borderRadius", "translateX", "translateY", "rotate",
      ]),
      digitalActions = new Set([
        "visibility", "selectedClass", "disabledState", "classToggle",
      ]),
      assetActions = new Set(["imageSource", "backgroundImage"]),
      pulseActions = new Set(["press", "click", "release", "hold"]);
    if (rule.source === "property" && property) {
      if (numericActions.has(rule.action) && property.type !== "number")
        warnings.push(`${label} expects a number property, but “${property.key}” is ${property.type}.`);
      if (digitalActions.has(rule.action) && property.type !== "checkbox")
        warnings.push(`${label} expects a checkbox property, but “${property.key}” is ${property.type}.`);
      if (assetActions.has(rule.action) && !["asset", "text"].includes(property.type))
        warnings.push(`${label} expects an asset property, but “${property.key}” is ${property.type}.`);
      if (rule.mapping?.enabled && property.type !== "number")
        warnings.push(`${label} uses numeric mapping with a ${property.type} property.`);
      if (rule.booleanMapping?.enabled && property.type !== "checkbox")
        warnings.push(`${label} uses digital-state mapping with a ${property.type} property.`);
    }
    if (rule.source === "signal-input" && signal) {
      if (numericActions.has(rule.action) && signal.type !== "analog")
        warnings.push(`${label} expects analog feedback, but “${signal.key}” is ${signal.type}.`);
      if (digitalActions.has(rule.action) && signal.type !== "digital")
        warnings.push(`${label} expects digital feedback, but “${signal.key}” is ${signal.type}.`);
      if (assetActions.has(rule.action) && signal.type !== "serial")
        warnings.push(`${label} expects a serial asset value, but “${signal.key}” is ${signal.type}.`);
      if (rule.mapping?.enabled && signal.type !== "analog")
        warnings.push(`${label} uses numeric mapping with a ${signal.type} signal.`);
      if (rule.booleanMapping?.enabled && signal.type !== "digital")
        warnings.push(`${label} uses digital-state mapping with a ${signal.type} signal.`);
    }
    if (rule.source === "signal-output" && signal) {
      if (pulseActions.has(rule.action) && signal.type !== "digital")
        warnings.push(`${label} publishes a digital pulse to a ${signal.type} output.`);
    }
    return warnings;
  }
  function validateCustomComponent() {
    const name = $("custom-component-name").value.trim(),
      version = $("custom-component-version").value.trim(),
      html = $("custom-source-html").value,
      css = $("custom-source-css").value,
      javascript = $("custom-source-javascript").value,
      completeSource = `${html}\n${css}\n${javascript}`,
      properties = collectCustomProperties(),
      signals = collectCustomSignals(),
      behaviors = collectCustomBehaviors(),
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
    const propertyKeys = new Set(properties.map((entry) => entry.key)),
      signalKeys = new Set(signals.map((entry) => entry.key));
    behaviors.forEach((rule) => {
      if (rule.enabled === false) return;
      if (rule.source === "property" && !propertyKeys.has(rule.key))
        errors.push(`Behavior references missing property: ${rule.key}.`);
      if (rule.source !== "property" && !signalKeys.has(rule.key))
        errors.push(`Behavior references missing signal: ${rule.key}.`);
      try {
        document.querySelector(rule.selector);
      } catch (_) {
        errors.push(`Behavior uses invalid selector: ${rule.selector}.`);
      }
      if (
        ["cssProperty", "cssVariable", "attribute", "classToggle"].includes(
          rule.action,
        ) &&
        !rule.parameter
      )
        errors.push(`Behavior “${rule.action}” requires a parameter.`);
      warnings.push(...customBehaviorTypeWarnings(rule, properties, signals));
    });
    const stateStyles = collectCustomStateStyles();
    if (stateStyles)
      try {
        document.querySelector(stateStyles.selector);
      } catch (_) {
        errors.push(`Visual state builder uses invalid selector: ${stateStyles.selector}.`);
      }
    const dependencyReport = customComponentDependencyReport({
      html: composeCustomSource(),
      properties,
      behaviors,
      stateStyles,
    });
    errors.push(...dependencyReport.errors);
    warnings.push(...dependencyReport.warnings);
    const knownProperties = new Set(properties.map((entry) => entry.key));
    [...completeSource.matchAll(/\{\{([^}]+)\}\}/g)].forEach((match) => {
      if (!knownProperties.has(match[1]))
        errors.push(`HTML uses undefined property token {{${match[1]}}}.`);
    });
    const behaviorPropertyKeys = new Set(
        behaviors
          .filter((rule) => rule.enabled !== false && rule.source === "property")
          .map((rule) => rule.key),
      ),
      runtimeProperties = new Set([
      "bindingMode",
      "visibilityEnabled",
      "defaultCount",
      "signalIncrement",
      "pressBase",
      "feedbackBase",
      "labelBase",
    ]);
    properties.forEach((property) => {
      if (
        !runtimeProperties.has(property.key) &&
        !behaviorPropertyKeys.has(property.key) &&
        !completeSource.includes(`{{${property.key}}}`)
      )
        warnings.push(
          `Property “${property.key}” is not used in the component source.`,
        );
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
    const previewProperties = Object.fromEntries(
      collectCustomProperties().map((property) => [
        property.key,
        property.type === "asset"
          ? state.assets.find((asset) => asset.id === property.defaultValue)
              ?.dataUrl || property.defaultValue
          : property.defaultValue,
      ]),
    );
    let source =
      composeCustomSource(true) +
      customRepeatedFrameRuntime(collectCustomRepeatedItems()) +
      `<style data-composer-states>${customStateCss(collectCustomStateStyles())}</style>` +
      customStateRuntime(collectCustomStateStyles()) +
      `<style data-composer-generated>${customBehaviorCss(collectCustomBehaviors())}</style>` +
      customBehaviorRuntime(collectCustomBehaviors(), previewProperties);
    collectCustomProperties().forEach((property) => {
      source = source.replaceAll(
        `{{${property.key}}}`,
        String(property.defaultValue ?? ""),
      );
    });
    const previewBridge = `<script>(function(){if(!window.ComposerSignals){var callbacks={};window.ComposerSignals={publish:function(key,value){parent.postMessage({type:'composer-custom-publish',key:key,value:value},'*')},subscribe:function(key,callback){(callbacks[key]||(callbacks[key]=[])).push(callback)}};window.addEventListener('message',function(event){if(!event.data||event.data.type!=='composer-signal')return;(callbacks[event.data.key]||[]).slice().forEach(function(callback){callback(event.data.value)})})}window.ComposerComponent={publish:window.ComposerSignals.publish};window.addEventListener('error',function(e){parent.postMessage({type:'composer-preview-error',message:e.message},'*')});window.addEventListener('message',function(event){if(!event.data||event.data.type!=='composer-self-test')return;var missing=[],pending=[];(event.data.rules||[]).forEach(function(rule){var target;try{target=document.querySelector(rule.selector)}catch(error){}if(!target){missing.push(rule.selector);return}var fire=function(name){target.dispatchEvent(new Event(name,{bubbles:true,cancelable:true}))};if(rule.action==='click')target.click();else if(rule.action==='release')fire('pointerup');else if(rule.action==='hold'){fire('pointerdown');pending.push(new Promise(function(resolve){setTimeout(function(){fire('pointerup');resolve()},Math.min(3000,Math.max(1,Number(rule.parameter)||1000)+25))}))}else{fire('pointerdown');fire('pointerup')}});Promise.all(pending).then(function(){parent.postMessage({type:'composer-self-test-complete',missing:missing},'*')})});${customElementPickerActive ? `var pickedStyle=document.createElement('style');pickedStyle.textContent='.composer-picked{outline:2px solid #ffd84d!important;outline-offset:2px!important;cursor:crosshair!important}';document.head.appendChild(pickedStyle);document.addEventListener('pointerover',function(event){document.querySelectorAll('.composer-picked').forEach(function(node){node.classList.remove('composer-picked')});event.target.classList.add('composer-picked')},true);document.addEventListener('pointerdown',function(event){event.preventDefault();event.stopImmediatePropagation();var element=event.target,selector;if(element.id)selector='#'+CSS.escape(element.id);else{var parts=[];while(element&&element!==document.body){var part=element.tagName.toLowerCase(),classes=Array.from(element.classList||[]).filter(function(name){return name!=='composer-picked'});if(classes.length)part+='.'+classes.map(CSS.escape).join('.');else if(element.parentElement){var siblings=Array.from(element.parentElement.children).filter(function(node){return node.tagName===element.tagName});if(siblings.length>1)part+=':nth-of-type('+(siblings.indexOf(element)+1)+')'}parts.unshift(part);element=element.parentElement}selector=parts.join(' > ')}parent.postMessage({type:'composer-element-picked',selector:selector},'*')},true);` : ""}})();<\/script>`;
    $("custom-component-preview").srcdoc = safeDoc(
      "<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;box-sizing:border-box}body{padding:10px}body>*{box-sizing:border-box}</style>" +
        previewBridge +
        source,
      "",
    );
    refreshCustomGeneratedCode();
    refreshCustomSignalTester();
    validateCustomComponent();
  }
  const customButtonProperties = [
      {
        key: "text",
        name: "Standard state — text",
        type: "text",
        defaultValue: "Button",
      },
      {
        key: "selectedText",
        name: "Selected state — text",
        type: "text",
        defaultValue: "Button",
      },
      {
        key: "icon",
        name: "Standard state — icon / symbol",
        type: "text",
        defaultValue: "",
      },
      {
        key: "selectedIcon",
        name: "Selected state — icon / symbol",
        type: "text",
        defaultValue: "",
      },
      { key: "textSize", name: "Text size", type: "number", defaultValue: 18 },
      { key: "iconSize", name: "Icon size", type: "number", defaultValue: 24 },
      {
        key: "faceColor",
        name: "Standard state — background color",
        type: "color",
        defaultValue: "#263b3c",
      },
      {
        key: "selectedFaceColor",
        name: "Selected state — background color",
        type: "color",
        defaultValue: "#078f7d",
      },
      {
        key: "textColor",
        name: "Standard state — text / icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "selectedTextColor",
        name: "Selected state — text / icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "borderColor",
        name: "Standard state — border color",
        type: "color",
        defaultValue: "#7ba7a3",
      },
      {
        key: "selectedBorderColor",
        name: "Selected state — border color",
        type: "color",
        defaultValue: "#04dcb9",
      },
      {
        key: "glowColor",
        name: "Standard state — glow color",
        type: "color",
        defaultValue: "#04dcb9",
      },
      {
        key: "selectedGlowColor",
        name: "Selected state — glow color",
        type: "color",
        defaultValue: "#04dcb9",
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        defaultValue: 8,
      },
      {
        key: "shadowSize",
        name: "Shadow size",
        type: "number",
        defaultValue: 6,
      },
      {
        key: "cornerRadius",
        name: "Corner radius",
        type: "number",
        defaultValue: 18,
      },
    ],
    customStandardSignals = [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "CustomButton.Press",
      },
      {
        key: "selected",
        name: "Selected",
        type: "digital",
        direction: "input",
        defaultValue: "CustomButton.Selected",
      },
      {
        key: "name",
        name: "Name",
        type: "serial",
        direction: "input",
        defaultValue: "CustomButton.Name",
      },
      {
        key: "visibility",
        name: "Visibility",
        type: "digital",
        direction: "input",
        defaultValue: "CustomButton.Visibility",
        optionalProperty: "visibilityEnabled",
      },
    ],
    customButtonCss = `html,body{margin:0;width:100%;height:100%;background:transparent!important;overflow:visible}.custom-button{width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;background:{{faceColor}};color:{{textColor}};border:1px solid {{borderColor}};border-radius:{{cornerRadius}}px;box-shadow:0 0 {{glowStrength}}px {{glowColor}},{{shadowSize}}px {{shadowSize}}px calc({{shadowSize}}px * 2) #101819;transition:background .18s,color .18s,border-color .18s,box-shadow .18s;touch-action:none}.custom-button.active{background:{{selectedFaceColor}};color:{{selectedTextColor}};border-color:{{selectedBorderColor}};box-shadow:0 0 calc({{glowStrength}}px * 2) {{selectedGlowColor}},{{shadowSize}}px {{shadowSize}}px calc({{shadowSize}}px * 2) #101819}.custom-icon{font-size:{{iconSize}}px;line-height:1}.custom-label{font:700 {{textSize}}px "Segoe UI",sans-serif;text-align:center}`,
    customButtonJavascript = `const button=root.querySelector('.custom-button'),label=root.querySelector('.custom-label'),icon=root.querySelector('.custom-icon');let selected=false,localName='{{text}}';const truthy=value=>value===true||value===1||value==='1'||String(value).toLowerCase()==='true';const render=()=>{button.classList.toggle('active',selected);label.textContent=selected?'{{selectedText}}':localName;icon.textContent=selected?'{{selectedIcon}}':'{{icon}}'};const release=()=>signals.publish('press',false);button.addEventListener('pointerdown',event=>{event.preventDefault();signals.publish('press',true)});button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('pointerleave',release);signals.subscribe('selected',value=>{selected=truthy(value);render()});signals.subscribe('name',value=>{if(value!=null&&value!==''){localName=String(value);if(!selected)render()}});render();`;
  const customStarterTemplates = {
    button: {
      name: "Custom Button",
      category: "Standard Buttons",
      icon: "🔘",
      properties: customButtonProperties,
      signals: customStandardSignals,
      html: '<button class="custom-button" type="button"><span class="custom-icon"></span><span class="custom-label"></span></button>',
      css: customButtonCss,
      javascript: customButtonJavascript,
    },
    toggle: {
      name: "Custom Toggle",
      category: "Toggle Buttons",
      icon: "🔘",
      properties: customButtonProperties,
      signals: customStandardSignals,
      html: '<button class="custom-button" type="button"><span class="custom-icon"></span><span class="custom-label"></span></button>',
      css: customButtonCss,
      javascript: customButtonJavascript,
    },
    slider: {
      name: "Custom Slider",
      category: "Sliders & Levels",
      icon: "🎚️",
      properties: [
        { key: "text", name: "Label", type: "text", defaultValue: "Level" },
        {
          key: "textSize",
          name: "Text size",
          type: "number",
          defaultValue: 18,
        },
        {
          key: "textColor",
          name: "Text color",
          type: "color",
          defaultValue: "#ffffff",
        },
        {
          key: "trackColor",
          name: "Track color",
          type: "color",
          defaultValue: "#263b3c",
        },
        {
          key: "fillColor",
          name: "Fill / glow color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "glowStrength",
          name: "Glow strength",
          type: "number",
          defaultValue: 8,
        },
      ],
      signals: [
        {
          key: "set",
          name: "Value Set",
          type: "analog",
          direction: "output",
          defaultValue: "CustomSlider.ValueSet",
        },
        {
          key: "feedback",
          name: "Feedback",
          type: "analog",
          direction: "input",
          defaultValue: "CustomSlider.Feedback",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          defaultValue: "CustomSlider.Name",
        },
      ],
      html: '<div class="custom-slider"><label>{{text}}</label><input type="range" min="0" max="65535" value="0"><output>0%</output></div>',
      css: 'html,body{margin:0;width:100%;height:100%;background:transparent!important}.custom-slider{width:100%;height:100%;display:grid;grid-template-rows:auto 1fr auto;align-items:center;color:{{textColor}};font:700 {{textSize}}px "Segoe UI",sans-serif;text-align:center}.custom-slider input{width:100%;accent-color:{{fillColor}};filter:drop-shadow(0 0 {{glowStrength}}px {{fillColor}})}.custom-slider input::-webkit-slider-runnable-track{background:{{trackColor}}}',
      javascript: `const control=root.querySelector('input'),label=root.querySelector('label'),output=root.querySelector('output');let feedback=false;control.addEventListener('input',()=>{output.textContent=Math.round(Number(control.value)/65535*100)+'%';if(!feedback)signals.publish('set',Number(control.value))});signals.subscribe('feedback',value=>{feedback=true;control.value=String(Math.max(0,Math.min(65535,Number(value)||0)));control.dispatchEvent(new Event('input'));feedback=false});signals.subscribe('name',value=>{if(value!=null&&value!=='')label.textContent=String(value)});`,
    },
    gauge: {
      name: "Custom Gauge",
      category: "Status & Information",
      icon: "🎚️",
      properties: [
        { key: "text", name: "Label", type: "text", defaultValue: "Level" },
        {
          key: "textSize",
          name: "Text size",
          type: "number",
          defaultValue: 18,
        },
        {
          key: "textColor",
          name: "Text color",
          type: "color",
          defaultValue: "#ffffff",
        },
        {
          key: "fillColor",
          name: "Fill / glow color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "backgroundColor",
          name: "Unfilled color",
          type: "color",
          defaultValue: "#263b3c",
        },
      ],
      signals: [
        {
          key: "feedback",
          name: "Feedback",
          type: "analog",
          direction: "input",
          defaultValue: "CustomGauge.Feedback",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          defaultValue: "CustomGauge.Name",
        },
      ],
      html: '<div class="custom-gauge"><label>{{text}}</label><div class="gauge-track"><div class="gauge-fill"></div></div><output>0%</output></div>',
      css: 'html,body{margin:0;width:100%;height:100%;background:transparent!important}.custom-gauge{width:100%;height:100%;display:grid;grid-template-rows:auto 1fr auto;align-items:center;color:{{textColor}};font:700 {{textSize}}px "Segoe UI",sans-serif;text-align:center}.gauge-track{height:18px;background:{{backgroundColor}};border-radius:20px;overflow:hidden}.gauge-fill{width:0;height:100%;background:{{fillColor}};box-shadow:0 0 10px {{fillColor}}}',
      javascript: `const fill=root.querySelector('.gauge-fill'),label=root.querySelector('label'),output=root.querySelector('output');signals.subscribe('feedback',value=>{const percent=Math.max(0,Math.min(100,(Number(value)||0)/65535*100));fill.style.width=percent+'%';output.textContent=Math.round(percent)+'%'});signals.subscribe('name',value=>{if(value!=null&&value!=='')label.textContent=String(value)});`,
    },
    text: {
      name: "Custom Text Input",
      category: "Text & Input",
      icon: "📝",
      properties: [
        {
          key: "placeholder",
          name: "Placeholder",
          type: "text",
          defaultValue: "Enter text",
        },
        {
          key: "textSize",
          name: "Text size",
          type: "number",
          defaultValue: 18,
        },
        {
          key: "textColor",
          name: "Text color",
          type: "color",
          defaultValue: "#ffffff",
        },
        {
          key: "faceColor",
          name: "Background color",
          type: "color",
          defaultValue: "#263b3c",
        },
        {
          key: "borderColor",
          name: "Border / glow color",
          type: "color",
          defaultValue: "#04dcb9",
        },
      ],
      signals: [
        {
          key: "text",
          name: "Text",
          type: "serial",
          direction: "output",
          defaultValue: "CustomText.Text",
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          defaultValue: "CustomText.Name",
        },
      ],
      html: '<input class="custom-text" placeholder="{{placeholder}}">',
      css: 'html,body{margin:0;width:100%;height:100%;background:transparent!important}.custom-text{box-sizing:border-box;width:100%;height:100%;padding:12px;background:{{faceColor}};color:{{textColor}};border:1px solid {{borderColor}};border-radius:12px;box-shadow:0 0 8px {{borderColor}};font:{{textSize}}px "Segoe UI",sans-serif}',
      javascript: `const input=root.querySelector('input');input.addEventListener('input',()=>signals.publish('text',input.value));signals.subscribe('name',value=>{if(value!=null)input.value=String(value)});`,
    },
    blank: {
      name: "Custom Component",
      category: "Custom",
      icon: "🧩",
      properties: [
        {
          key: "backgroundColor",
          name: "Background color",
          type: "color",
          defaultValue: "transparent",
        },
      ],
      signals: [],
      html: '<div class="custom-component"></div>',
      css: "html,body{margin:0;width:100%;height:100%;background:transparent!important}.custom-component{width:100%;height:100%;background:{{backgroundColor}}}",
      javascript: "",
    },
  };
  function applyCustomStarterTemplate(
    key,
    refresh = true,
    preserveIdentity = false,
  ) {
    const template =
      customStarterTemplates[key] || customStarterTemplates.button;
    const currentName = $("custom-component-name").value,
      currentCategory = $("custom-component-category").value;
    $("custom-component-name").value = preserveIdentity
      ? currentName
      : template.name;
    $("custom-component-category").value = preserveIdentity
      ? currentCategory
      : template.category;
    if (!preserveIdentity) $("custom-component-icon").value = template.icon;
    $("custom-source-html").value = template.html;
    $("custom-source-css").value = template.css;
    $("custom-source-javascript").value = template.javascript;
    $("custom-property-list").innerHTML = "";
    $("custom-signal-list").innerHTML = "";
    $("custom-behavior-list").innerHTML = "";
    customBehaviorRules = [];
    $("custom-repeat-enabled").checked = false;
    template.properties.forEach((property) =>
      addCustomPropertyRow(structuredClone(property)),
    );
    template.signals.forEach((signal) =>
      addCustomSignalRow(structuredClone(signal)),
    );
    if (refresh) refreshCustomPreview();
  }
  function setCustomRepeatedControls(config) {
    $("custom-repeat-enabled").checked = !!config;
    $("custom-repeat-container").value =
      config?.containerSelector || ".split-menu";
    $("custom-repeat-item").value = config?.itemSelector || "button";
    $("custom-repeat-label").value = config?.labelSelector || "";
    $("custom-repeat-default").value = config?.defaultCount ?? 3;
    $("custom-repeat-max").value = config?.maxCount ?? 20;
    $("custom-repeat-namespace").value = config?.namespace || "CustomComponent";
  }
  function syncCustomRepeatedRows() {
    const config = collectCustomRepeatedItems(),
      propertyKeys = new Set([
        "defaultCount",
        "signalIncrement",
        "pressBase",
        "feedbackBase",
        "labelBase",
      ]);
    [...$("custom-property-list").children]
      .filter((row) =>
        propertyKeys.has(row.querySelector('[data-field="key"]')?.value),
      )
      .forEach((row) => row.remove());
    [...$("custom-signal-list").children]
      .filter(
        (row) => row.querySelector('[data-field="key"]')?.value === "itemCount",
      )
      .forEach((row) => row.remove());
    repeatedItemProperties(config).forEach(addCustomPropertyRow);
    repeatedItemSignals(config).forEach(addCustomSignalRow);
    refreshCustomPreview();
  }
  function openCustomBuilder(item = null, entry = null) {
    customEditingId = entry?.id || "";
    customBuilderSourceItemId = item?.id || "";
    customElementPickerActive = false;
    $("custom-element-selector").value = "";
    $("custom-element-picker").classList.remove("active");
    $("custom-element-picker").textContent = "Pick preview element";
    const definition = item?.componentId
        ? window.ComposerRuntime.get(item.componentId)
        : null,
      initialSource = entry?.html
        ? entry.html
        : definition
          ? `<style>${item.componentStyles || definition.styles || ""}</style>${item.componentTemplate || definition.template || ""}`
          : item?.source ||
            `<div class="custom-component">Custom component</div>
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
    $("custom-behavior-list").innerHTML = "";
    customBehaviorRules = structuredClone(entry?.behaviors || []);
    setCustomStateStyles(entry?.stateStyles || null);
    setCustomRepeatedControls(entry?.repeatedItems || null);
    $("custom-preview-log").textContent =
      "Preview signal activity appears here.";
    $("custom-self-test-report").hidden = true;
    $("custom-self-test-report").textContent = "";
    properties.forEach(addCustomPropertyRow);
    signals.forEach(addCustomSignalRow);
    customBehaviorRules.forEach(addCustomBehaviorRow);
    $("custom-component-template").disabled = !!entry;
    $("custom-component-apply-template").disabled = !!entry;
    if (!item && !entry) {
      $("custom-component-template").value = "button";
      applyCustomStarterTemplate("button", false);
    }
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
  $("custom-component-template").onchange = () => {
    if (customEditingId) return;
    applyCustomStarterTemplate($("custom-component-template").value);
    setStatus(
      `Applied the ${$("custom-component-template").selectedOptions[0]?.textContent || "selected"} starting template`,
    );
  };
  $("custom-component-apply-template").onclick = () => {
    if (
      customEditingId ||
      !confirm(
        "Replace the current starter markup, properties, and signals with this template?",
      )
    )
      return;
    applyCustomStarterTemplate($("custom-component-template").value);
  };
  $("custom-property-add").onclick = () => addCustomPropertyRow();
  $("custom-signal-add").onclick = () => addCustomSignalRow();
  $("custom-behavior-add").onclick = () => addCustomBehaviorRow();
  $("custom-behavior-preset-add").onclick = addCustomBehaviorPreset;
  $("custom-state-signals").onclick = () => {
    const selector = $("custom-state-selector").value.trim();
    if (!selector) {
      alert("Pick an element or enter the state target selector first.");
      return;
    }
    const base = customContractBase(),
      definitions = [
        {
          signal: { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: `${base}.Selected` },
          action: "selectedClass",
        },
        {
          signal: { key: "disabled", name: "Disabled", type: "digital", direction: "input", defaultValue: `${base}.Disabled` },
          action: "disabledState",
        },
      ];
    definitions.forEach(({ signal, action }) => {
      ensureCustomSignal(signal);
      const exists = collectCustomBehaviors().some(
        (rule) =>
          rule.source === "signal-input" &&
          rule.key === signal.key &&
          rule.selector === selector &&
          rule.action === action,
      );
      if (!exists)
        addCustomBehaviorRow({
          source: "signal-input",
          key: signal.key,
          selector,
          action,
        });
    });
    refreshCustomPreview();
  };
  $("custom-state-selector").oninput = refreshCustomPreview;
  $("custom-state-grid")
    .querySelectorAll("input,select")
    .forEach((input) => (input.oninput = refreshCustomPreview));
  $("custom-element-picker").onclick = () => {
    customElementPickerActive = !customElementPickerActive;
    $("custom-element-picker").classList.toggle(
      "active",
      customElementPickerActive,
    );
    $("custom-element-picker").textContent = customElementPickerActive
      ? "Click an element…"
      : "Pick preview element";
    refreshCustomPreview();
  };
  $("custom-repeat-enabled").onchange = syncCustomRepeatedRows;
  [
    "custom-repeat-container",
    "custom-repeat-item",
    "custom-repeat-label",
    "custom-repeat-default",
    "custom-repeat-max",
    "custom-repeat-namespace",
  ].forEach((id) => {
    $(id).onchange = syncCustomRepeatedRows;
  });
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
  async function runCustomComponentSelfTest() {
    const button = $("custom-self-test"),
      report = $("custom-self-test-report"),
      validation = validateCustomComponent(),
      dependencyReport = customComponentDependencyReport({
        html: composeCustomSource(),
        properties: collectCustomProperties(),
        behaviors: collectCustomBehaviors(),
        stateStyles: collectCustomStateStyles(),
      });
    button.disabled = true;
    report.hidden = false;
    report.classList.remove("failed");
    report.textContent = "Running component self-test…";
    customPreviewEvents = [];
    refreshCustomPreview();
    await new Promise((resolve) => {
      const frame = $("custom-component-preview"),
        timer = setTimeout(resolve, 600);
      frame.addEventListener(
        "load",
        () => {
          clearTimeout(timer);
          setTimeout(resolve, 50);
        },
        { once: true },
      );
    });
    const frame = $("custom-component-preview"),
      signals = collectCustomSignals(),
      inputs = signals.filter((signal) => signal.direction === "input"),
      outputRules = collectCustomBehaviors().filter(
        (rule) => rule.enabled !== false && rule.source === "signal-output",
      ),
      testableOutputRules = outputRules.filter(
        (rule) => rule.action !== "hold" || (Number(rule.parameter) || 1000) <= 2900,
      );
    inputs.forEach((signal) => {
      const values =
        signal.type === "digital"
          ? [false, true, false]
          : signal.type === "analog"
            ? [0, 32768, 65535]
            : ["SELF_TEST", ""];
      values.forEach((value) =>
        frame.contentWindow?.postMessage(
          { type: "composer-signal", key: signal.key, value },
          "*",
        ),
      );
    });
    const selfTestResult = await new Promise((resolve) => {
      customSelfTestResolve = resolve;
      frame.contentWindow?.postMessage(
        { type: "composer-self-test", rules: testableOutputRules },
        "*",
      );
      setTimeout(() => {
        if (customSelfTestResolve === resolve) {
          customSelfTestResolve = null;
          resolve({ missing: [], timedOut: true });
        }
      }, 3600);
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    const runtimeErrors = customPreviewEvents.filter(
        (event) => event.type === "composer-preview-error",
      ),
      publishedKeys = new Set(
        customPreviewEvents
          .filter((event) => event.type === "composer-custom-publish")
          .map((event) => event.key),
      ),
      missingOutputs = testableOutputRules
        .map((rule) => rule.key)
        .filter((key) => !publishedKeys.has(key)),
      failures = [
        ...validation.errors,
        ...runtimeErrors.map((event) => `Runtime error: ${event.message}`),
        ...(selfTestResult.missing || []).map(
          (selector) => `Output target not found: ${selector}`,
        ),
        ...missingOutputs.map((key) => `No output was published for: ${key}`),
        ...(selfTestResult.timedOut ? ["Output interaction test timed out."] : []),
      ],
      lines = [
        `CUSTOM COMPONENT SELF-TEST — ${failures.length ? "FAILED" : "PASSED"}`,
        `Input signals exercised: ${inputs.length}`,
        `Output behaviors exercised: ${testableOutputRules.length}`,
        `Long hold behaviors skipped: ${outputRules.length - testableOutputRules.length}`,
        `Published output keys: ${publishedKeys.size}`,
        `Embedded package assets: ${dependencyReport.assets.length}`,
        `Validation warnings: ${validation.warnings.length}`,
      ];
    if (failures.length) lines.push("", ...failures.map((value) => `ERROR: ${value}`));
    else if (validation.warnings.length)
      lines.push("", ...validation.warnings.map((value) => `WARNING: ${value}`));
    report.textContent = lines.join("\n");
    report.classList.toggle("failed", !!failures.length);
    button.disabled = false;
  }
  $("custom-self-test").onclick = runCustomComponentSelfTest;
  window.addEventListener("message", (event) => {
    if (event.source !== $("custom-component-preview").contentWindow) return;
    if (
      ["composer-custom-publish", "composer-preview-error"].includes(
        event.data?.type,
      )
    )
      customPreviewEvents.push(event.data);
    if (event.data?.type === "composer-custom-publish")
      $("custom-preview-log").textContent +=
        `\nPublish ${event.data.key} = ${JSON.stringify(event.data.value)}`;
    if (event.data?.type === "composer-preview-error")
      $("custom-preview-log").textContent += `\nERROR: ${event.data.message}`;
    if (event.data?.type === "composer-self-test-complete") {
      const resolve = customSelfTestResolve;
      customSelfTestResolve = null;
      resolve?.(event.data);
    }
    if (event.data?.type === "composer-element-picked") {
      $("custom-element-selector").value = event.data.selector || "";
      if (!$("custom-state-selector").value)
        $("custom-state-selector").value = event.data.selector || "";
      customElementPickerActive = false;
      $("custom-element-picker").classList.remove("active");
      $("custom-element-picker").textContent = "Pick preview element";
      $("custom-preview-log").textContent +=
        `\nPicked ${event.data.selector || "element"}`;
      refreshCustomPreview();
    }
    $("custom-preview-log").scrollTop = $("custom-preview-log").scrollHeight;
  });
  $("custom-component-export").onclick = () => {
    const entry = state.customComponents.find(
      (candidate) => candidate.id === customEditingId,
    );
    if (!entry) return;
    const dependencyReport = customComponentDependencyReport(entry);
    if (dependencyReport.errors.length) {
      alert(
        `Component package is not ready.\n\n${dependencyReport.errors.join("\n")}`,
      );
      return;
    }
    const packageValue = createCustomComponentPackage(entry);
    download(
      `${entry.name.replace(/[^A-Za-z0-9_-]+/g, "-") || "component"}.cuicomponent`,
      JSON.stringify(packageValue, null, 2),
      "application/json",
    );
    setStatus(`Exported component package “${entry.name}”`);
  };
  function createCustomComponentPackage(entry, assetCatalog = state.assets) {
    const dependencyReport = customComponentDependencyReport(
      entry,
      assetCatalog,
    );
    if (dependencyReport.errors.length)
      throw new Error(dependencyReport.errors.join("\n"));
    return {
      format: "crestron-ui-composer-component",
      version: 3,
      exportedAt: new Date().toISOString(),
      component: structuredClone(entry),
      dependencies: {
        assets: customComponentDependencies(entry, assetCatalog),
        manifest: {
          assetCount: dependencyReport.assets.length,
          generatedBehaviorCount: (entry.behaviors || []).length,
          hasVisualStates: !!entry.stateStyles,
          hasRepeatedItems: !!entry.repeatedItems,
        },
      },
    };
  }
  function parseCustomComponentPackage(packageValue) {
    const imported = packageValue?.component;
    if (
      packageValue?.format !== "crestron-ui-composer-component" ||
      ![1, 2, 3].includes(packageValue.version) ||
      !imported?.id ||
      !imported?.name ||
      typeof imported.html !== "string" ||
      !Array.isArray(imported.properties) ||
      !Array.isArray(imported.signals)
    )
      throw new Error(
        "This is not a valid Crestron UI Composer component package.",
      );
    return structuredClone(imported);
  }
  function customComponentAssetReferences(entry) {
    const references = new Set();
    (entry.properties || []).forEach((property) => {
      if (property.type === "asset" && property.defaultValue)
        references.add(property.defaultValue);
    });
    Object.values(entry.stateStyles?.states || {}).forEach((stateStyle) => {
      if (stateStyle.asset) references.add(stateStyle.asset);
    });
    state.assets.forEach((asset) => {
      if (
        entry.html?.includes(asset.dataUrl) ||
        (entry.behaviors || []).some(
          (rule) =>
            rule.booleanMapping?.falseValue === asset.dataUrl ||
            rule.booleanMapping?.trueValue === asset.dataUrl,
        )
      )
        references.add(asset.id);
    });
    return [...references];
  }
  function customComponentDependencies(entry, assetCatalog = state.assets) {
    const references = new Set(customComponentAssetReferences(entry));
    return assetCatalog
      .filter((asset) => references.has(asset.id))
      .map((asset) => structuredClone(asset));
  }
  function customComponentDependencyReport(entry, assetCatalog = state.assets) {
    const references = customComponentAssetReferences(entry),
      assets = customComponentDependencies(entry, assetCatalog),
      found = new Set(assets.map((asset) => asset.id)),
      errors = [],
      warnings = [];
    references.forEach((id) => {
      const stateFallback = Object.values(entry.stateStyles?.states || {}).some(
        (style) => style.asset === id && /^data:/i.test(style.assetData || ""),
      );
      if (!found.has(id) && !stateFallback)
        errors.push(`Missing referenced asset: ${id}`);
    });
    assets.forEach((asset) => {
      if (!asset.dataUrl || !/^data:/i.test(asset.dataUrl))
        errors.push(`Asset “${asset.name || asset.id}” is not embedded.`);
      if (!asset.type)
        warnings.push(`Asset “${asset.name || asset.id}” has no MIME type.`);
    });
    const duplicateIds = assets
      .map((asset) => asset.id)
      .filter((id, index, values) => values.indexOf(id) !== index);
    duplicateIds.forEach((id) => errors.push(`Duplicate dependency asset ID: ${id}`));
    return { references, assets, errors, warnings };
  }
  function restoreCustomComponentDependencies(
    packageValue,
    entry,
    assetCatalog = state.assets,
  ) {
    const assets = packageValue.dependencies?.assets || [],
      idMap = new Map();
    assets.forEach((assetValue) => {
      const asset = structuredClone(assetValue),
        sameData = assetCatalog.find(
          (candidate) => candidate.dataUrl === asset.dataUrl,
        ),
        sameId = assetCatalog.find((candidate) => candidate.id === asset.id);
      if (sameData) {
        idMap.set(asset.id, sameData.id);
        return;
      }
      if (sameId) asset.id = uid("asset-");
      idMap.set(assetValue.id, asset.id);
      assetCatalog.push(asset);
    });
    (entry.properties || []).forEach((property) => {
      if (property.type === "asset" && idMap.has(property.defaultValue))
        property.defaultValue = idMap.get(property.defaultValue);
    });
    Object.values(entry.stateStyles?.states || {}).forEach((stateStyle) => {
      if (idMap.has(stateStyle.asset)) stateStyle.asset = idMap.get(stateStyle.asset);
    });
    return assets.length;
  }
  function deleteCustomComponent(entry) {
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
    if ($("custom-component-dialog").open) $("custom-component-dialog").close();
    customEditingId = "";
    renderComponentLibrary();
    renderPage();
    commitHistory();
    setStatus(`Deleted custom component “${entry.name}”`);
  }
  $("custom-component-delete").onclick = () => {
    const entry = state.customComponents.find(
      (candidate) => candidate.id === customEditingId,
    );
    deleteCustomComponent(entry);
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
    const item =
        state.items.find(
          (candidate) => candidate.id === customBuilderSourceItemId,
        ) || null,
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
    const repeatedItems = collectCustomRepeatedItems(),
      customProperties = mergeCustomRows(
        collectCustomProperties(),
        repeatedItemProperties(repeatedItems),
      ),
      customSignals = mergeCustomRows(
        collectCustomSignals(),
        repeatedItemSignals(repeatedItems),
      );
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
      properties: customProperties,
      signals: customSignals,
      repeatedItems,
      rangeBindings: repeatedItemRanges(repeatedItems),
      behaviors: collectCustomBehaviors(),
      stateStyles: collectCustomStateStyles(),
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
        imported = parseCustomComponentPackage(packageValue);
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
      const entry = imported;
      const restoredDependencies = restoreCustomComponentDependencies(
        packageValue,
        entry,
      );
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
      if (restoredDependencies) renderAssets();
      state.items
        .filter((item) => item.componentId === entry.id)
        .forEach(renderItem);
      renderComponentLibrary();
      commitHistory();
      setStatus(
        `Imported component package “${entry.name}” with ${restoredDependencies} embedded asset${restoredDependencies === 1 ? "" : "s"}`,
      );
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
  $("save-page-template").onclick = savePageTemplate;
  $("create-subpage").onclick = () => openCreateSubpage("current");
  $("new-blank-subpage").onclick = () => openCreateSubpage("blank");
  document.querySelectorAll('input[name="create-subpage-placement"]').forEach((input) => {
    input.onchange = () => syncCreateSubpageDimensions(true);
  });
  $("create-subpage-confirm").onclick = confirmCreateSubpage;
  $("subpage-pages-all").onclick = () => setSubpagePageChecks("all");
  $("subpage-pages-none").onclick = () => setSubpagePageChecks("none");
  $("subpage-pages-invert").onclick = () => setSubpagePageChecks("invert");
  $("subpage-pages-save").onclick = saveSubpagePages;
  $("subpage-property-page").onchange = refreshSubpagePropertyFields;
  $("subpage-property-target").onchange = refreshSubpagePropertyFields;
  $("subpage-property-widget").onchange = refreshSubpageWidgetOverride;
  $("subpage-properties-save").onclick = saveSubpageProperties;
  $("subpage-properties-reset").onclick = resetSubpagePropertyOverride;
  $("design-library-export").onclick = () => {
    const itemCount =
      state.reusables.length +
      state.pageTemplates.length +
      state.customComponents.length +
      state.subpages.length;
    if (!itemCount) {
      alert(
        "Create a reusable design, page template, or custom component before exporting a library.",
      );
      return;
    }
    const name = prompt("Library name", `${state.contract.name || "Composer"} Library`);
    if (!name?.trim()) return;
    const version = prompt("Library version", "1.0.0");
    if (!version?.trim()) return;
    const packageValue = designLibraryPackage(name.trim(), version.trim()),
      fileName = `${name.trim().replace(/[^A-Za-z0-9_-]+/g, "-") || "component-library"}-${version.trim().replace(/[^A-Za-z0-9_.-]+/g, "-")}.cuilibrary`;
    download(fileName, JSON.stringify(packageValue, null, 2), "application/json");
    setStatus(
      `Exported library “${packageValue.name}” v${packageValue.version}`,
    );
  };
  $("design-library-import").onclick = () => $("design-library-file").click();
  $("design-library-file").onchange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const packageValue = JSON.parse(await file.text()),
        result = importDesignLibrary(packageValue);
      setStatus(
        `Imported “${packageValue.name}” v${packageValue.version}: ${result.components} components, ${result.reusables} reusable designs, ${result.templates} page templates, ${result.subpages} subpages`,
      );
    } catch (error) {
      alert(`Library import failed.\n\n${error.message}`);
    }
  };
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
    "page",
    "surface",
    "accent",
    "text",
    "glow",
    "border",
    "font-size",
    "corner-radius",
    "glow-strength",
    "animation-duration",
    "animation-easing",
  ].forEach((key) => {
    const checkbox = $("theme-" + key + "-enabled"),
      control = $("theme-" + key);
    const sync = () => {
      control.disabled = !checkbox.checked;
      control
        .closest("label")
        ?.classList.toggle("theme-token-disabled", !checkbox.checked);
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
        applyResponsiveSize(
          width,
          height,
          panelLayoutKey(state.targetDevice, width, height),
        );
      }),
  );
  async function loadProjectText(text, markClean = true, sourcePath = "") {
    const parsed = JSON.parse(text),
      migration = window.ComposerProjectMigrations.migrate(parsed),
      p = migration.project;
    const integrityErrors = projectIntegrityErrors(p);
    if (integrityErrors.length)
      throw new Error(
        `Project integrity check failed:\n\n${integrityErrors.join("\n")}`,
      );
    if (migration.migrated) {
      let backupName = "";
      if (native && sourcePath) {
        try {
          backupName = await nativeRequest("backupProject", {
            path: sourcePath,
          });
        } catch (error) {
          throw new Error(
            `The project needs migration, but its backup could not be created: ${error.message}`,
          );
        }
      } else {
        const baseName = sourcePath
          ? sourcePath.split(/[\\/]/).pop()
          : "crestron-ui-project.cuiproj";
        backupName = baseName.replace(
          /(\.[^.]+)?$/,
          `.pre-migration-v${migration.fromVersion}$1`,
        );
        download(backupName, text, "application/json");
      }
      setStatus(
        `Migrated project v${migration.fromVersion} → v${migration.toVersion}; backup: ${backupName}`,
      );
    }
    state.items = normalizeItemStates(p.items);
    state.assets = p.assets || [];
    state.reusables = p.reusables || [];
    state.pageTemplates = p.pageTemplates || [];
    state.subpages = p.subpages || [];
    state.themes = p.themes || [];
    state.customComponents = p.customComponents || [];
    state.acceptance = p.acceptance || { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} };
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
    if (!migration.migrated)
      setStatus("Project opened for " + selectedDevice().name);
  }
  $("save-project").onclick = async () => {
    const value = project(),
      integrityErrors = projectIntegrityErrors(value);
    if (integrityErrors.length) {
      projectDirty = true;
      persistAutosave(historyState(), true);
      alert(
        `The project was not saved because its integrity check failed. A recovery snapshot was preserved.\n\n${integrityErrors.join("\n")}`,
      );
      return;
    }
    const text = JSON.stringify(value, null, 2);
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
  $("save-project-preset").onclick = async () => {
    const value = project(),
      integrityErrors = projectIntegrityErrors(value);
    if (integrityErrors.length) {
      alert(`The preset was not saved because project integrity validation failed.\n\n${integrityErrors.join("\n")}`);
      return;
    }
    const suggested = String(state.contract.name || "Project Preset").trim(),
      name = prompt("Preset template name", suggested);
    if (name === null) return;
    if (!name.trim()) {
      alert("Enter a name for the preset template.");
      return;
    }
    const contents = JSON.stringify(value, null, 2);
    try {
      let result;
      if (native) {
        result = await nativeRequest("saveProjectPreset", { name: name.trim(), contents });
      } else {
        const presets = browserProjectPresets(),
          path = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project-preset",
          entry = {
            path,
            name: name.trim(),
            modifiedUtc: new Date().toISOString(),
            size: new Blob([contents]).size,
            contents,
          },
          existing = presets.findIndex((preset) => preset.path === path);
        if (existing >= 0) presets[existing] = entry;
        else presets.push(entry);
        localStorage.setItem(browserPresetKey, JSON.stringify(presets));
        result = entry;
      }
      setStatus(`Saved preset template ${result.name || name.trim()}`);
    } catch (error) {
      alert(`The preset template could not be saved.\n\n${error.message}`);
    }
  };
  $("save-project-package").onclick = async () => {
    if (!native) {
      alert(
        "Portable project packages are available in the Windows application.",
      );
      return;
    }
    const integrityErrors = projectIntegrityErrors(project());
    if (integrityErrors.length) {
      projectDirty = true;
      persistAutosave(historyState(), true);
      alert(
        `The portable package was not saved because its integrity check failed. A recovery snapshot was preserved.\n\n${integrityErrors.join("\n")}`,
      );
      return;
    }
    try {
      const result = await nativeRequest(
        "saveProjectPackage",
        JSON.stringify(project()),
      );
      await createProjectBackup("portable-save");
      markProjectSaved();
      setStatus(`Saved portable package to ${result.path}`);
    } catch (error) {
      if (error.message !== "cancelled") setStatus(error.message);
    }
  };
  $("open-project-package").onclick = async () => {
    if (!native) {
      alert(
        "Portable project packages are available in the Windows application.",
      );
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
  $("panel-performance").onclick = () =>
    runAuditUi(runPanelPerformanceReport, "Panel performance report");
  $("release-readiness").onclick = () =>
    runAuditUi(openReleaseReadiness, "Release readiness");
  document.querySelectorAll("[data-health-filter]").forEach((button) => {
    button.onclick = () => {
      healthIssueFilter = button.dataset.healthFilter;
      document
        .querySelectorAll("[data-health-filter]")
        .forEach((entry) => entry.classList.toggle("active", entry === button));
      renderHealthDashboard();
    };
  });
  $("health-search").oninput = renderHealthDashboard;
  $("health-fix-all").onclick = fixAllHealthIssues;
  $("build-self-test").onclick = runBuildSelfTest;
  $("acceptance-test").onclick = openAcceptanceTest;
  $("acceptance-create-project").onclick = createAcceptanceProject;
  $("acceptance-run-automatic").onclick = runAcceptanceAutomaticChecks;
  $("acceptance-reset").onclick = () => {
    if (!confirm("Reset every acceptance result and note?")) return;
    state.acceptance = { startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),results:{},notes:"",environment:acceptanceState().environment || {} };
    renderAcceptanceChecklist(); scheduleHistory();
  };
  $("acceptance-notes").onchange = (event) => {
    const acceptance=acceptanceState(); acceptance.notes=event.target.value; acceptance.updatedAt=new Date().toISOString(); scheduleHistory();
  };
  $("acceptance-export").onclick = () => download("crestron-ui-acceptance-report.txt",acceptanceReport(),"text/plain");
  $("project-backups").onclick = async () => {
    if (!native)
      return alert("Project backups are available in the Windows application.");
    if (!$("backup-dialog").open) $("backup-dialog").showModal();
    await renderProjectBackups();
  };
  $("storage-settings").onclick = async () => {
    if (!native)
      return alert(
        "Storage settings are available in the Windows application.",
      );
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
    download(
      "crestron-ui-project-health.txt",
      lastHealthReport || "No report has been generated.",
      "text/plain",
    );
  $("signal-manager").onclick = () => {
    $("signal-search").value = "";
    signalViewMode = "table";
    renderSignalManager();
    $("signal-dialog").showModal();
  };
  $("signal-search").oninput = renderSignalManager;
  $("signal-view-table").onclick = () => {
    signalViewMode = "table";
    renderSignalManager();
  };
  $("signal-view-map").onclick = () => {
    signalViewMode = "map";
    renderSignalManager();
  };
  $("signal-view-address").onclick = () => {
    signalViewMode = "address";
    renderSignalManager();
  };
  $("signal-view-simpl").onclick = () => {
    signalViewMode = "simpl";
    renderSignalManager();
  };
  $("signal-compare-contract").onclick = () => $("signal-compare-file").click();
  $("signal-compare-file").onchange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await compareContractFile(file);
  };
  $("signal-replace-prefix").onclick = replaceContractPrefix;
  $("signal-allocate-joins").onclick = () => {
    $("join-allocator-scope").value = "project";
    $("join-allocator-type").value = "all";
    $("join-allocator-direction").value = "all";
    renderJoinAllocationPlan();
    $("join-allocator-dialog").showModal();
  };
  $("join-allocator-refresh").onclick = renderJoinAllocationPlan;
  $("join-allocator-scope").onchange = renderJoinAllocationPlan;
  $("join-allocator-type").onchange = renderJoinAllocationPlan;
  $("join-allocator-direction").onchange = renderJoinAllocationPlan;
  $("join-allocator-start").oninput = renderJoinAllocationPlan;
  $("join-allocator-apply").onclick = applyJoinAllocationPlan;
  $("signal-name-contracts").onclick = () => {
    $("contract-namer-scope").value = "project";
    $("contract-namer-type").value = "all";
    $("contract-namer-direction").value = "all";
    renderContractNamingPlan();
    $("contract-namer-dialog").showModal();
  };
  $("contract-namer-refresh").onclick = renderContractNamingPlan;
  $("contract-namer-scope").onchange = renderContractNamingPlan;
  $("contract-namer-type").onchange = renderContractNamingPlan;
  $("contract-namer-direction").onchange = renderContractNamingPlan;
  $("contract-namer-apply").onclick = applyContractNamingPlan;
  $("project-search").onclick = () => openProjectSearch();
  $("project-search-query").oninput = renderProjectSearch;
  $("signal-export-csv").onclick = () =>
    download("crestron-signal-map.csv", signalCsv(), "text/csv");
  $("signal-export-schedule").onclick = () =>
    download(
      `${simplIdentifier(state.contract.name || "crestron-ui")}-signal-schedule.txt`,
      signalScheduleReport(),
      "text/plain",
    );
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
    if (simulatorSubpageKey) {
      highlightedSubpageInstances.delete(simulatorSubpageKey);
      simulatorSubpageKey = "";
      renderPage();
    }
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
    if (!native) {
      alert("CH5 packaging is available in the Windows application.");
      return;
    }
    if (!approveExport()) return;
    syncContractMetadata();
    const projectName = state.contract.name.trim(),
      selectedIds = [
        ...document.querySelectorAll("#build-panel-list input:checked"),
      ].map((input) => input.value),
      devices = selectedIds
        .map((id) => deviceProfiles.find((device) => device.id === id))
        .filter(Boolean);
    if (!projectName) {
      alert("Enter a project / contract name.");
      return;
    }
    if (!devices.length) {
      alert("Select at least one panel package.");
      return;
    }
    const packages = [],
      buildProblems = [];
    devices.forEach((device) => {
      if (device.supportsCh5 === false) {
        buildProblems.push(`${device.name} does not support CH5 projects.`);
        return;
      }
      const targetProject = projectForDevice(device),
        html = window.ComposerExporter.exportProject(targetProject);
      targetProject.items.forEach((item) => {
        const margin = Math.max(0, Number(item.layout?.safeMargin) || 0);
        if (
          !window.ComposerResponsiveLayout.fitsSafeArea(
            item,
            { width: device.width, height: device.height },
            margin,
          )
        )
          buildProblems.push(
            `${device.name}: “${item.name}” does not fit${margin ? ` its ${margin}px safe margin` : " the panel"}.`,
          );
      });
      if (
        device.maximumProjectSizeMb &&
        new TextEncoder().encode(html).length >
          device.maximumProjectSizeMb * 1024 * 1024
      )
        buildProblems.push(
          `${device.name}: generated project exceeds the ${device.maximumProjectSizeMb} MB limit.`,
        );
      packages.push({
        projectName: `${projectName}-${device.model}`,
        device,
        html,
      });
    });
    if (buildProblems.length) {
      alert(
        `Multi-panel build cannot continue:\n\n${buildProblems.join("\n")}`,
      );
      return;
    }
    const usesContracts =
      state.pages.some((page) => page.bindingMode === "contract") ||
      state.items.some(
        (item) =>
          Object.values(item.signalBindings || {}).some(
            (binding) => binding.mode === "contract",
          ) ||
          Object.entries(item.properties || {}).some(
            ([key, value]) => /bindingmode$/i.test(key) && value === "contract",
          ),
      );
    $("contract-status").textContent =
      `Building ${packages.length} panel packages…`;
    setStatus(`Building ${packages.length} panel packages…`);
    try {
      const result = await nativeRequest("buildCh5Packages", {
        packages,
        usesContracts,
      });
      packages.forEach((entry, index) =>
        recordBuildArtifact(
          result.artifacts?.[index] || { path: result.paths?.[index] },
          entry.device,
        ),
      );
      const builtByDevice = new Map(
        packages.map((entry, index) => [
          entry.device.id,
          result.paths?.[index] || "",
        ]),
      );
      if (result.paths?.length)
        saveDeploymentSettings({
          profiles: deploymentProfiles().map((profile) =>
            builtByDevice.get(profile.deviceId)
              ? {
                  ...profile,
                  packagePath: builtByDevice.get(profile.deviceId),
                  updatedAt: new Date().toISOString(),
                }
              : profile,
          ),
        });
      if (result.paths?.length) {
        $("deploy-package").value = result.paths[0];
        saveDeploymentSettings({ packagePath: result.paths[0] });
        updateActiveDeploymentProfile({ packagePath: result.paths[0] });
      }
      $("contract-status").textContent =
        `Built ${result.paths.length} packages in ${result.folder}`;
      setStatus(`Built ${result.paths.length} panel packages`);
    } catch (error) {
      if (error.message !== "cancelled") {
        setStatus("Multi-panel build failed");
        alert(error.message);
      }
    }
  };
  $("build-project-deploy").onclick = () => {
    if (!native) {
      alert("Panel deployment is available in the Windows application.");
      return;
    }
    if (!approveExport()) return;
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
      recordBuildArtifact(result, device);
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
    if (!approveExport()) return;
    renderDeploymentProfiles();
    renderBuildArtifacts();
    $("deploy-status").textContent =
      "Project Health preflight passed. Check the panel, then deploy.";
    renderDeploymentHistory();
    $("deployment-dialog").showModal();
  };
  $("deploy-profile").onchange = (event) =>
    loadDeploymentProfile(event.target.value);
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
    if (!selected || !confirm(`Delete deployment profile “${selected.name}”?`))
      return;
    saveDeploymentSettings({
      profiles: deploymentProfiles().filter(
        (profile) => profile.id !== selected.id,
      ),
      activeProfileId: "",
    });
    renderDeploymentProfiles("");
    $("deploy-status").textContent =
      `Deleted deployment profile “${selected.name}”.`;
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
        lastCheck: {
          time: new Date().toISOString(),
          reachable: result.reachable,
          roundtripMs: result.roundtripMs,
          status: result.status,
        },
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
  $("deploy-inspect").onclick = async () => {
    const packagePath = $("deploy-package").value;
    if (!packagePath) {
      $("deploy-status").textContent = "Select or build a CH5Z package first.";
      return;
    }
    $("deploy-status").textContent = "Inspecting CH5Z package…";
    try {
      const result = await nativeRequest("inspectCh5Package", packagePath),
        yesNo = (value) => (value ? "Yes" : "No"),
        lines = [
          `CH5Z PACKAGE INSPECTION — ${result.valid ? "PASSED" : "FAILED"}`,
          "",
          `File: ${result.path}`,
          `Size: ${formatMetricBytes(result.size)}`,
          `SHA-256: ${result.sha256}`,
          `Validation: ${result.validationStatus}`,
          "",
          `Embedded project: ${result.embeddedProject || "Missing"}`,
          `Outer archive entries: ${result.outerEntries}`,
          `CH5 payload entries: ${result.payloadEntries}`,
          `Manifest: ${yesNo(result.hasManifest)}`,
          `index.html: ${yesNo(result.hasIndex)}`,
          `CrComLib runtime: ${yesNo(result.hasCrComLib)}`,
          `CH5 Desktop runtime: ${yesNo(result.hasWebXPanel)}`,
          `WebXPanel worker: ${yesNo(result.hasWorker)}`,
          `Contract mapping: ${yesNo(result.hasContract)}`,
          `Contract states/events: ${result.contractStates} / ${result.contractEvents}`,
          "",
          `Target: ${result.targetName || result.targetDeviceId || "Not tagged"}`,
          `Viewport: ${result.targetWidth && result.targetHeight ? `${result.targetWidth} × ${result.targetHeight}` : "Not tagged"}`,
        ];
      if (result.warnings?.length)
        lines.push("", "WARNINGS", ...result.warnings.map((warning) => `- ${warning}`));
      $("package-inspector-summary").textContent = result.valid
        ? "The archive passed structural validation."
        : "The archive has blocking structural problems.";
      $("package-inspector-report").textContent = lines.join("\n");
      $("package-inspector-dialog").showModal();
      $("deploy-status").textContent = result.valid
        ? "Package inspection passed."
        : "Package inspection failed.";
    } catch (error) {
      $("deploy-status").textContent = `Package inspection failed: ${error.message}`;
    }
  };
  $("deploy-start").onclick = async () => {
    const host = $("deploy-host").value.trim(),
      packagePath = $("deploy-package").value,
      slowMode = true;
    if (!host || !packagePath) {
      $("deploy-status").textContent =
        "Enter a panel host and select or build a .ch5z package.";
      return;
    }
    if (!approveExport()) return;
    if (
      !approveDeploymentArtifact(
        packagePath,
        activeDeploymentProfile()?.deviceId || state.targetDevice,
      )
    )
      return;
    if (
      !confirm(
        `Deploy ${packagePath}\n\nto ${$("deploy-target-type").selectedOptions[0]?.textContent || "CH5 target"} at ${host}?\n\nA terminal will request the device credentials.`,
      )
    )
      return;
    $("deploy-status").textContent =
      "Opening the Crestron deployment terminal…";
    try {
      const result = await nativeRequest("deployCh5PackageWait", {
        host,
        packagePath,
        slowMode,
        deploymentType:
          activeDeploymentProfile()?.deploymentType ||
          defaultDeploymentType(
            activeDeploymentProfile()?.deviceId || state.targetDevice,
          ),
      });
      const settings = deploymentSettings(),
        profile = activeDeploymentProfile(),
        history = [
          {
            time: new Date().toISOString(),
            host,
            packagePath,
            backupPath: result.backupPath,
            success: result.success === true,
            message:
              result.success === true
                ? "Deployment succeeded"
                : `Deployment failed with exit code ${result.exitCode}`,
            logPath: result.logPath || "",
            slowMode,
            profileId: profile?.id || "",
            profileName: profile?.name || "",
            deviceId: profile?.deviceId || state.targetDevice,
            deploymentType:
              result.deploymentType || profile?.deploymentType || "touchscreen",
            device:
              deviceProfiles.find((device) => device.id === profile?.deviceId)
                ?.name || selectedDevice().name,
            resolution: `${state.width} × ${state.height}`,
          },
          ...(settings.history || []),
        ].slice(0, 20);
      saveDeploymentSettings({ host, packagePath, slowMode, history });
      updateActiveDeploymentProfile({
        host,
        packagePath,
        slowMode,
        deploymentType: result.deploymentType,
      });
      renderDeploymentHistory();
      $("deploy-status").textContent =
        result.success === true
          ? `Deployment succeeded. Detailed output was saved to ${result.logPath || "the deployment log folder"}.`
          : `Deployment failed with exit code ${result.exitCode}. Detailed output was saved to ${result.logPath || "the deployment log folder"}.`;
    } catch (error) {
      $("deploy-status").textContent =
        `Deployment failed to start: ${error.message}`;
    }
  };
  async function checkDeploymentQueue(
    profiles = selectedDeploymentQueueProfiles(),
  ) {
    if (!profiles.length) {
      $("deploy-status").textContent =
        "Select at least one deployment profile.";
      return [];
    }
    const ready = [];
    for (const profile of profiles) {
      setDeploymentQueueState(profile.id, "running", "Checking…");
      try {
        const result = await nativeRequest("checkDeploymentProfile", {
          host: profile.host,
          packagePath: profile.packagePath,
          deviceId: profile.deviceId,
        });
        const mismatch =
          result.targetDeviceId && result.targetDeviceId !== profile.deviceId;
        if (result.reachable && result.packageValid && !mismatch) {
          const message = `Ready · ${result.roundtripMs} ms · ${(result.size / 1024 / 1024).toFixed(2)} MB${result.targetDeviceId ? "" : " · target untagged"}`;
          setDeploymentQueueState(profile.id, "ready", message, result);
          ready.push(profile);
        } else {
          const message = mismatch
            ? `Package targets ${result.targetDeviceId}`
            : !result.packageValid
              ? result.packageStatus
              : `Unreachable · ${result.status}`;
          setDeploymentQueueState(profile.id, "failed", message, result);
        }
      } catch (error) {
        setDeploymentQueueState(profile.id, "failed", error.message);
      }
    }
    const checkedAt = new Date().toISOString();
    saveDeploymentSettings({
      profiles: deploymentProfiles().map((profile) => {
        const status = deploymentQueueStatus.get(profile.id);
        return profiles.some((entry) => entry.id === profile.id)
          ? {
              ...profile,
              lastCheck: {
                time: checkedAt,
                state: status?.state,
                message: status?.message,
              },
            }
          : profile;
      }),
    });
    $("deploy-status").textContent =
      `${ready.length} of ${profiles.length} selected profiles are ready.`;
    return ready;
  }
  function appendDeploymentHistory(profile, result, success, message) {
    const settings = deploymentSettings(),
      device = deviceProfiles.find((entry) => entry.id === profile.deviceId),
      history = [
        {
          time: new Date().toISOString(),
          host: profile.host,
          packagePath: profile.packagePath,
          backupPath: result?.backupPath || "",
          slowMode: true,
          profileId: profile.id,
          profileName: profile.name,
          deviceId: profile.deviceId,
          device: device?.name || profile.deviceId,
          deploymentType:
            profile.deploymentType || defaultDeploymentType(profile.deviceId),
          resolution: device ? `${device.width} × ${device.height}` : "",
          success,
          message,
        },
        ...(settings.history || []),
      ].slice(0, 50);
    saveDeploymentSettings({ history });
    renderDeploymentHistory();
  }
  async function deployProfileQueue(profiles) {
    if (!approveExport()) return;
    const artifactProblems = profiles.flatMap((profile) =>
      deploymentArtifactProblems(profile.packagePath, profile.deviceId).map(
        (problem) => `${profile.name}: ${problem}`,
      ),
    );
    if (
      artifactProblems.length &&
      !confirm(
        `Package verification warning:\n\n${artifactProblems.join("\n")}\n\nContinue with the deployment queue anyway?`,
      )
    )
      return;
    const ready = await checkDeploymentQueue(profiles);
    if (!ready.length) return;
    if (
      !confirm(
        `Deploy ${ready.length} ready profile${ready.length === 1 ? "" : "s"} sequentially?\n\nEach panel opens a Crestron terminal for its credential prompt.`,
      )
    )
      return;
    let successes = 0;
    for (const profile of ready) {
      setDeploymentQueueState(
        profile.id,
        "running",
        "Deploying — complete the terminal prompt…",
      );
      try {
        const result = await nativeRequest("deployCh5PackageWait", {
          host: profile.host,
          packagePath: profile.packagePath,
          slowMode: true,
          deploymentType:
            profile.deploymentType || defaultDeploymentType(profile.deviceId),
        });
        if (result.success) {
          successes++;
          setDeploymentQueueState(
            profile.id,
            "ready",
            "Deployment succeeded",
            result,
          );
          appendDeploymentHistory(
            profile,
            result,
            true,
            "Deployment succeeded",
          );
        } else {
          setDeploymentQueueState(
            profile.id,
            "failed",
            `Deployment failed · exit ${result.exitCode} · ${result.logPath || "see terminal"}`,
            result,
          );
          appendDeploymentHistory(
            profile,
            result,
            false,
            `CLI exit code ${result.exitCode}${result.logPath ? ` · ${result.logPath}` : ""}`,
          );
        }
      } catch (error) {
        setDeploymentQueueState(profile.id, "failed", error.message);
        appendDeploymentHistory(profile, null, false, error.message);
      }
    }
    $("deploy-status").textContent =
      `${successes} of ${ready.length} deployments succeeded.`;
  }
  $("deploy-check-all").onclick = () => checkDeploymentQueue();
  $("deploy-start-selected").onclick = () =>
    deployProfileQueue(selectedDeploymentQueueProfiles());
  $("deploy-retry-failed").onclick = () => {
    const failedIds = new Set(
      [...deploymentQueueStatus]
        .filter(([, status]) => status.state === "failed")
        .map(([id]) => id),
    );
    document
      .querySelectorAll("#deployment-profile-list input")
      .forEach((input) => {
        input.checked = failedIds.has(input.value);
      });
    const failed = deploymentProfiles().filter((profile) =>
      failedIds.has(profile.id),
    );
    if (!failed.length) {
      $("deploy-status").textContent =
        "There are no failed deployments to retry.";
      return;
    }
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
    loadProjectText(
      await e.target.files[0].text(),
      true,
      e.target.files[0].name,
    );
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
  function clearProjectForStarter() {
    const customIds = new Set(state.customComponents.map((entry) => entry.id));
    state.components = state.components.filter(
      (component) => !customIds.has(component.componentId),
    );
    state.items = [];
    state.assets = [];
    state.reusables = [];
    state.pageTemplates = [];
    state.subpages = [];
    state.themes = [];
    state.customComponents = [];
    state.acceptance = { startedAt: "", updatedAt: "", results: {}, notes: "", environment: {} };
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
  }
  function createBlankProject() {
    clearProjectForStarter();
    setStatus("Created blank project");
  }
  const browserPresetKey = "composer-project-presets-v1";
  function browserProjectPresets() {
    try {
      return JSON.parse(localStorage.getItem(browserPresetKey) || "[]");
    } catch (_) {
      return [];
    }
  }
  async function listProjectPresets() {
    return native
      ? await nativeRequest("listProjectPresets")
      : browserProjectPresets().map(({ contents, ...entry }) => entry);
  }
  async function readProjectPreset(entry) {
    if (native) return await nativeRequest("readProjectPreset", { path: entry.path });
    const preset = browserProjectPresets().find((candidate) => candidate.path === entry.path);
    if (!preset) throw new Error("The selected preset no longer exists.");
    return preset;
  }
  async function deleteProjectPreset(entry) {
    if (native) return await nativeRequest("deleteProjectPreset", { path: entry.path });
    localStorage.setItem(
      browserPresetKey,
      JSON.stringify(browserProjectPresets().filter((candidate) => candidate.path !== entry.path)),
    );
  }
  function formatPresetSize(size) {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  async function renderProjectPresets() {
    const host = $("project-preset-list");
    host.innerHTML = '<div class="project-preset-empty">Loading preset templates…</div>';
    try {
      const presets = await listProjectPresets();
      host.innerHTML = "";
      if (!presets.length) {
        host.innerHTML = '<div class="project-preset-empty">No presets have been saved yet. Open or build a project, then choose <strong>File → Save project as preset</strong>.</div>';
        return;
      }
      presets.forEach((entry) => {
        const card = document.createElement("article"),
          details = document.createElement("div"),
          actions = document.createElement("div"),
          create = document.createElement("button"),
          remove = document.createElement("button");
        card.className = "project-preset-card";
        details.innerHTML = `<strong></strong><small></small>`;
        details.querySelector("strong").textContent = entry.name;
        details.querySelector("small").textContent = `${new Date(entry.modifiedUtc).toLocaleString()} · ${formatPresetSize(entry.size || 0)}`;
        actions.className = "project-preset-actions";
        create.type = remove.type = "button";
        create.textContent = "Create project";
        remove.textContent = "Delete";
        remove.className = "danger";
        create.onclick = async () => {
          try {
            const preset = await readProjectPreset(entry);
            await loadProjectText(preset.contents, false);
            projectDirty = true;
            persistAutosave(historyState(), true);
            setAutosaveState("Unsaved changes");
            $("new-project-dialog").close();
            setStatus(`Created new project from preset ${preset.name || entry.name}`);
          } catch (error) {
            alert(`The preset could not be opened.\n\n${error.message}`);
          }
        };
        remove.onclick = async () => {
          if (!confirm(`Delete preset template “${entry.name}”? This cannot be undone.`)) return;
          try {
            await deleteProjectPreset(entry);
            await renderProjectPresets();
          } catch (error) {
            alert(`The preset could not be deleted.\n\n${error.message}`);
          }
        };
        actions.append(create, remove);
        card.append(details, actions);
        host.appendChild(card);
      });
    } catch (error) {
      host.innerHTML = "";
      const message = document.createElement("div");
      message.className = "project-preset-empty";
      message.textContent = `Preset templates could not be loaded: ${error.message}`;
      host.appendChild(message);
    }
  }
  $("new-project").onclick = () => {
    if (
      (state.items.length || state.assets.length || state.pages.length > 1) &&
      !confirm("Create a new project? Unsaved changes will be cleared.")
    )
      return;
    $("new-project-dialog").showModal();
  };
  $("create-blank-project").onclick = () => {
    $("new-project-dialog").close();
    createBlankProject();
  };
  $("create-from-preset").onclick = async () => {
    $("new-project-choices").hidden = true;
    $("project-preset-picker").hidden = false;
    await renderProjectPresets();
  };
  $("project-preset-back").onclick = () => {
    $("project-preset-picker").hidden = true;
    $("new-project-choices").hidden = false;
  };
  $("refresh-project-presets").onclick = renderProjectPresets;
  $("new-project-dialog").addEventListener("close", () => {
    $("project-preset-picker").hidden = true;
    $("new-project-choices").hidden = false;
  });
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
  function openFeatureHelp(kind) {
    const responsive = kind === "responsive",
      manual = kind === "users-manual";
    $("feature-help-title").textContent = manual
      ? "Crestron UI Composer — General User’s Manual"
      : responsive
        ? "Responsive Layout Help"
        : "Timeline & Action Editor Help";
    $("responsive-help-content").hidden = !responsive;
    $("timeline-action-help-content").hidden = responsive || manual;
    $("users-manual-content").hidden = !manual;
    $("feature-help-dialog").showModal();
  }
  $("users-manual").onclick = () => openFeatureHelp("users-manual");
  $("responsive-help-open").onclick = () => openFeatureHelp("responsive");
  $("responsive-compare").onclick = openResponsiveComparison;
  $("responsive-compare-target").onchange = renderResponsiveComparison;
  $("responsive-copy-source").onchange = renderResponsiveComparison;
  $("responsive-copy-layout").onclick = copyResponsiveLayoutToTarget;
  $("responsive-apply-family").onclick = applyResponsiveBreakpointFamily;
  $("responsive-save-adapted").onclick = saveAdaptedResponsiveLayout;
  $("responsive-validate-all").onclick = validateAllResponsiveTargets;
  $("responsive-fit-all").onclick = fitAndSaveAllResponsiveTargets;
  $("responsive-switch-target").onclick = () => {
    const target = responsiveComparisonTarget();
    if (!target) return;
    $("target-device").value = target.id;
    applyDevice(target.id);
    commitHistory();
    $("responsive-compare-dialog").close();
  };
  document.querySelectorAll(".timeline-action-help-open").forEach((button) => {
    button.onclick = () => openFeatureHelp("timeline-action");
  });
  initializeCollapsibleSidePanels();
  wirePaneResizer("sidebar-resizer", "sidebar-width", 1, 220);
  wirePaneResizer("inspector-resizer", "inspector-width", -1, 230);
  $("zoom-out").onclick = () => setPanelZoom(panelZoom - 0.1);
  $("zoom-in").onclick = () => setPanelZoom(panelZoom + 0.1);
  $("zoom-level").onclick = () => setPanelZoom(1);
  $("zoom-fit").onclick = fitPanel;
  $("center-subpage-master").onclick = () => centerSubpageMasterCanvas(true);
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
    if (!form) return;
    let close = form.querySelector(
      '.dialog-close, .dialog-title > button[value="cancel"][aria-label="Close"]',
    );
    if (!close) {
      close = document.createElement("button");
      form.prepend(close);
    }
    close.type = "button";
    close.removeAttribute("value");
    close.classList.add("dialog-close");
    close.setAttribute("aria-label", "Close");
    close.title = "Close";
    close.textContent = "×";
    close.onclick = () => dialog.close();
    if (dialog.id === "simulator-dialog") return;
    const handle = form.querySelector(".dialog-title") || form.querySelector("h2");
    if (!handle) return;
    handle.classList.add("dialog-drag-handle");
    handle.title = "Drag to move";
    handle.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        event.target.closest("button,input,select,textarea,a")
      )
        return;
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
          left = Math.max(
            0,
            Math.min(
              window.innerWidth - Math.min(80, width),
              rect.left + moveEvent.clientX - startX,
            ),
          ),
          top = Math.max(
            0,
            Math.min(
              window.innerHeight - Math.min(48, height),
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
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({ active: false, closedAt: new Date().toISOString() }),
      );
    } catch (_) {}
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
