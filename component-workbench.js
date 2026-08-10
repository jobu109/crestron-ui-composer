(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ComposerComponentWorkbench = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function slug(value, fallback) {
    const result = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return result || fallback;
  }
  function uniqueId(prefix, value, used) {
    const base = `${prefix}-${slug(value, prefix)}`;
    let id = base,
      index = 2;
    while (used.has(id)) id = `${base}-${index++}`;
    used.add(id);
    return id;
  }
  function empty() {
    return {
      schemaVersion: SCHEMA_VERSION,
      parts: [],
      properties: [],
      connections: [],
      states: [],
      repeatedCollections: [],
      adapter: { version: 1, rules: [] },
      authoredSource: { field: "html", originalSourceField: "originalSource" },
    };
  }
  function normalize(workbench) {
    const source = workbench && typeof workbench === "object" ? workbench : {},
      // Preserve fields introduced by a newer Composer even when this build
      // does not understand them yet. Known fields are normalized below,
      // while unknown metadata survives open/save/package round trips.
      result = { ...clone(source), ...empty() };
    result.schemaVersion = Number(source.schemaVersion) || SCHEMA_VERSION;
    ["parts", "properties", "connections", "states", "repeatedCollections"].forEach(
      (key) => (result[key] = Array.isArray(source[key]) ? clone(source[key]) : []),
    );
    result.adapter = {
      ...(source.adapter && typeof source.adapter === "object"
        ? clone(source.adapter)
        : {}),
      version: Number(source.adapter?.version) || 1,
      rules: Array.isArray(source.adapter?.rules) ? clone(source.adapter.rules) : [],
    };
    result.authoredSource = {
      ...result.authoredSource,
      ...(source.authoredSource && typeof source.authoredSource === "object"
        ? clone(source.authoredSource)
        : {}),
    };
    return result;
  }
  function migrate(component) {
    if (component?.workbench?.schemaVersion)
      return normalize(component.workbench);
    const workbench = empty(),
      partIds = new Map(),
      usedPartIds = new Set(),
      usedPropertyIds = new Set(),
      usedConnectionIds = new Set(),
      usedStateIds = new Set(),
      behaviors = Array.isArray(component?.behaviors) ? component.behaviors : [];
    const ensurePart = (selector, role = "element", name = "") => {
      selector = String(selector || "").trim();
      if (!selector) return "";
      if (partIds.has(selector)) return partIds.get(selector);
      const id = uniqueId("part", name || role || selector, usedPartIds);
      workbench.parts.push({
        id,
        name: name || String(role || "element").replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
        selector,
        role: role || "element",
        multiple: false,
      });
      partIds.set(selector, id);
      return id;
    };
    (component?.elementRoles || []).forEach((entry) =>
      ensurePart(entry.selector, entry.role, entry.name),
    );
    behaviors.forEach((rule) => ensurePart(rule.selector, "mapped-target"));
    (component?.properties || []).forEach((property) => {
      const rules = behaviors.filter(
          (rule) => rule.source === "property" && rule.key === property.key,
        ),
        selector = rules.find((rule) => rule.selector)?.selector || "";
      workbench.properties.push({
        id: uniqueId("property", property.key || property.name, usedPropertyIds),
        key: property.key,
        label: property.name || property.key,
        type: property.type || "text",
        defaultValue: clone(property.defaultValue),
        ...(property.min != null ? { min: property.min } : {}),
        ...(property.max != null ? { max: property.max } : {}),
        ...(property.step != null ? { step: property.step } : {}),
        target: {
          kind: rules.length ? "legacy-adapter-rules" : "unresolved",
          partId: ensurePart(selector, "property-target"),
          ruleIndexes: rules.map((rule) => behaviors.indexOf(rule)),
        },
        legacy: clone(property),
      });
    });
    (component?.signals || []).forEach((signal) => {
      const sourceName = signal.direction === "output" ? "signal-output" : "signal-input",
        rules = behaviors.filter(
          (rule) => rule.source === sourceName && rule.key === signal.key,
        ),
        selector = rules.find((rule) => rule.selector)?.selector || "";
      workbench.connections.push({
        id: uniqueId("connection", signal.key || signal.name, usedConnectionIds),
        key: signal.key,
        label: signal.name || signal.key,
        type: signal.type || "digital",
        direction: signal.direction || "input",
        defaultValue: signal.defaultValue || "",
        target: {
          kind: rules.length ? "legacy-adapter-rules" : "unresolved",
          partId: ensurePart(selector, "signal-target"),
          ruleIndexes: rules.map((rule) => behaviors.indexOf(rule)),
        },
        legacy: clone(signal),
      });
    });
    Object.entries(component?.stateStyles?.states || {}).forEach(
      ([name, definition]) => {
        workbench.states.push({
          id: uniqueId("state", name, usedStateIds),
          name: name.replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
          activation: {
            kind: "legacy-state-style",
            selector: component.stateStyles?.selector || "",
            value: name,
          },
          definition: clone(definition),
        });
      },
    );
    workbench.repeatedCollections = clone(component?.repeatedItems || []);
    workbench.adapter.rules = clone(behaviors);
    workbench.migratedFrom = {
      packageSchema: 3,
      fields: ["properties", "signals", "behaviors", "stateStyles", "elementRoles", "repeatedItems"],
    };
    return workbench;
  }
  function validate(workbench) {
    const value = normalize(workbench),
      errors = [],
      warnings = [],
      partIds = new Set(),
      keys = { properties: new Set(), connections: new Set(), states: new Set() };
    if (value.schemaVersion !== SCHEMA_VERSION)
      errors.push(`Unsupported workbench schema version ${value.schemaVersion}.`);
    value.parts.forEach((part, index) => {
      if (!part.id) errors.push(`Part ${index + 1} has no ID.`);
      else if (partIds.has(part.id)) errors.push(`Duplicate part ID: ${part.id}.`);
      else partIds.add(part.id);
      if (!part.selector) errors.push(`Part “${part.name || part.id || index + 1}” has no selector.`);
    });
    [["properties", value.properties], ["connections", value.connections], ["states", value.states]].forEach(
      ([group, entries]) => entries.forEach((entry, index) => {
        if (!entry.id) errors.push(`${group} entry ${index + 1} has no ID.`);
        else if (keys[group].has(entry.id)) errors.push(`Duplicate ${group} ID: ${entry.id}.`);
        else keys[group].add(entry.id);
        const partId = entry.target?.partId;
        if (partId && !partIds.has(partId)) errors.push(`${entry.id} references missing part ${partId}.`);
        (Array.isArray(entry.targets) ? entry.targets : []).forEach((target) => {
          if (target?.partId && !partIds.has(target.partId))
            errors.push(`${entry.id} references missing part ${target.partId}.`);
        });
        if (entry.target?.kind === "unresolved")
          warnings.push(`${entry.label || entry.key || entry.id} still needs a target mapping.`);
      }),
    );
    return { valid: errors.length === 0, errors, warnings, value };
  }
  return { SCHEMA_VERSION, empty, normalize, migrate, validate };
});
