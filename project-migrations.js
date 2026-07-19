(function (global) {
  "use strict";
  const CURRENT_VERSION = 5;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function migrate(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("Project data must be a JSON object.");
    const project = clone(input),
      fromVersion = Math.max(1, Number(project.version) || 1),
      notes = [];
    if (fromVersion > CURRENT_VERSION)
      throw new Error(
        `This project uses format version ${fromVersion}. Install a newer Crestron UI Composer to open it.`,
      );

    project.width = Math.max(1, Number(project.width) || 1920);
    project.height = Math.max(1, Number(project.height) || 1200);
    project.targetDevice ||= project.width === 1920 && project.height === 1200 ? "tsw-1070" : "custom";

    project.pages = Array.isArray(project.pages) && project.pages.length
      ? project.pages
      : [{
          id: "page-home",
          name: "Home",
          background: project.background || "#182126",
          bindingMode: "none",
          binding: "",
          transition: "none",
          transitionDuration: 350,
        }];
    project.activePage = project.pages.some((page) => page.id === project.activePage)
      ? project.activePage
      : project.pages[0].id;
    project.items = Array.isArray(project.items) ? project.items : [];
    project.items.forEach((item) => {
      item.pageId ||= project.pages[0].id;
      item.properties ||= {};
      item.signalBindings ||= {};
      item.actions ||= [];
      item.layout = Object.assign(
        { anchorX: "left", anchorY: "top", scaleMode: "fixed", safeMargin: 0 },
        item.layout || {},
      );
      item.deviceOverrides = item.deviceOverrides && typeof item.deviceOverrides === "object"
        ? item.deviceOverrides : {};
      item.interaction ||= {
        trigger: "none",
        preset: "fade",
        direction: "left",
        duration: 300,
        delay: 0,
        easing: "ease-out",
      };
      item.locked = item.locked === true || item.locked === "true";
      item.hidden = item.hidden === true || item.hidden === "true";
      if (item.componentId === "rolling-menu") {
        ["pressBase", "feedbackBase", "labelBase"].forEach((key) => {
          const value = String(item.properties[key] || "");
          item.properties[key] = value.replace(
            /^([A-Za-z_][A-Za-z0-9_]*)_Items(\[\{index\}\])\./,
            "$1.Items$2.",
          );
        });
      }
    });
    ["assets", "reusables", "pageTemplates", "themes", "customComponents"].forEach(
      (key) => (project[key] = Array.isArray(project[key]) ? project[key] : []),
    );
    project.themes.forEach((theme) => {
      theme.enabled ||= {
        page: true,
        surface: true,
        accent: true,
        text: true,
        glow: true,
        border: true,
        "font-size": false,
        "corner-radius": false,
        "glow-strength": false,
        "animation-duration": false,
        "animation-easing": false,
      };
    });
    project.customComponents.forEach((component) => {
      component.icon ||= "🧩";
      component.version ||= "1.0.0";
      component.author ||= "";
      component.description ||= "";
      component.properties ||= [];
      component.signals ||= [];
    });
    project.contract ||= {};
    project.diagnostics = !!project.diagnostics;
    if (fromVersion < 2) notes.push("Converted the legacy single-page project structure.");
    if (fromVersion < 3) notes.push("Normalized component state, assets, and contract metadata.");
    if (fromVersion < 4) notes.push("Added action workflows, extended themes, and custom-component metadata.");
    if (fromVersion < 5) notes.push("Added responsive anchors and per-panel layout overrides.");
    project.version = CURRENT_VERSION;
    return {
      project,
      fromVersion,
      toVersion: CURRENT_VERSION,
      migrated: fromVersion !== CURRENT_VERSION,
      notes,
    };
  }

  global.ComposerProjectMigrations = { CURRENT_VERSION, migrate };
})(typeof window === "undefined" ? globalThis : window);
