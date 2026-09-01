(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ComposerComponentWorkbench = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const BINDING_VERSION = 1;

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
  function normalizeBindingTarget(target = {}) {
    const selector = normalizeCssSelector(target.selector || ""),
      pseudoMatch = selector.match(/(::?(?:before|after))$/i),
      pseudoElement = String(target.pseudoElement || pseudoMatch?.[1] || "")
        .replace(/^:(?!:)/, "::")
        .toLowerCase();
    return {
      partId: String(target.partId || ""),
      selector: pseudoMatch ? selector.slice(0, -pseudoMatch[1].length).trim() : selector,
      pseudoElement,
      ...(target.multiple != null ? { multiple: !!target.multiple } : {}),
    };
  }
  function canonicalEffectKind(value) {
    const source = String(value || "").trim(),
      aliases = {
        cssProperty: "css-property",
        "css-custom-property": "css-custom-property",
        cssVariable: "css-custom-property",
        text: "text-content",
        textContent: "text-content",
        attribute: "attribute",
        dataAttribute: "data-attribute",
        domProperty: "dom-property",
        classPresence: "class-presence",
        foregroundAsset: "foreground-asset",
        backgroundAsset: "background-asset",
        state: "state-activation",
        selectedClass: "state-activation",
        press: "output-event",
        release: "output-event",
        held: "output-event",
        pulse: "output-event",
        mappedProperty: "mapped-property",
      };
    return aliases[source] || source.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`) || "unresolved";
  }
  function normalizeBinding(binding, entry = {}) {
    const source = binding && typeof binding === "object" ? clone(binding) : {},
      legacyTargets = Array.isArray(entry.targets) && entry.targets.length
        ? entry.targets
        : entry.target
          ? [entry.target]
          : [],
      rawTargets = Array.isArray(source.targets) && source.targets.length
        ? source.targets
        : source.target
          ? [source.target]
          : legacyTargets,
      targets = rawTargets.map(normalizeBindingTarget).filter((target) => target.partId || target.selector),
      legacyTarget = entry.target || {},
      effectSource = source.effect && typeof source.effect === "object" ? source.effect : {},
      legacyKind = legacyTarget.kind === "authored-token" && entry.authoredCss?.property
        ? "css-property"
        : legacyTarget.kind,
      effect = {
        kind: canonicalEffectKind(effectSource.kind || entry.action || legacyKind || entry.capability),
        name: String(effectSource.name || entry.authoredCss?.property || legacyTarget.name || legacyTarget.parameter || entry.parameter || ""),
        stateScope: String(effectSource.stateScope || entry.stateScope || "all"),
        unit: String(effectSource.unit || entry.unit || entry.mapping?.unit || ""),
      };
    ["stateId", "trueValue", "falseValue", "event", "javascript"].forEach((key) => {
      const value = effectSource[key] ?? entry[key] ?? legacyTarget[key];
      if (value != null && value !== "") effect[key] = clone(value);
    });
    if (effect.kind === "output-event" && !effect.event && entry.action)
      effect.event = String(entry.action);
    if (effect.kind === "state-activation" && !effect.name && entry.action)
      effect.name = String(entry.action);
    return {
      version: Number(source.version) || BINDING_VERSION,
      target: targets[0] || normalizeBindingTarget(),
      ...(targets.length > 1 ? { targets } : {}),
      effect,
    };
  }
  function withCanonicalBinding(entry = {}) {
    return { ...clone(entry), binding: normalizeBinding(entry.binding, entry) };
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
    result.properties = result.properties.map(withCanonicalBinding);
    result.connections = result.connections.map(withCanonicalBinding);
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
        action: rules.find((rule) => rule.action)?.action || "",
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
    return normalize(workbench);
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
        if (["properties", "connections"].includes(group)) {
          const binding = normalizeBinding(entry.binding, entry),
            bindingTargets = binding.targets || [binding.target];
          if (binding.version !== BINDING_VERSION)
            errors.push(`${entry.label || entry.key || entry.id} uses unsupported binding version ${binding.version}.`);
          bindingTargets.forEach((target) => {
            if (target.partId && !partIds.has(target.partId))
              errors.push(`${entry.id} binding references missing part ${target.partId}.`);
          });
          if (binding.effect.kind === "unresolved")
            warnings.push(`${entry.label || entry.key || entry.id} still needs a binding effect.`);
        }
      }),
    );
    return { valid: errors.length === 0, errors, warnings, value };
  }
  function normalizeCssSelector(value) {
    return String(value || "")
      .replace(/(^|[^:]):before\b/gi, "$1::before")
      .replace(/(^|[^:]):after\b/gi, "$1::after")
      .replace(/:{3,}(before|after)\b/gi, "::$1")
      .replace(/\s+/g, " ")
      .trim();
  }
  function scopeCssSelector(selector, scope = "all") {
    const normalizedScope = String(scope || "all").replace(/^state-/, "").toLowerCase(),
      candidates = String(selector || "").split(",").map(normalizeCssSelector).filter(Boolean),
      escapeValue = (value) => String(value).replace(/[^a-z0-9_-]/gi, (character) => `\\${character}`),
      scoped = [];
    candidates.forEach((candidate) => {
      const pseudoMatch = candidate.match(/(::?(?:before|after))$/i),
        pseudo = pseudoMatch ? pseudoMatch[1].replace(/^:(?!:)/, "::") : "",
        owner = pseudoMatch ? candidate.slice(0, -pseudoMatch[1].length).trim() : candidate,
        add = (value) => scoped.push(`${value}${pseudo}`);
      if (normalizedScope === "all") add(owner);
      else if (normalizedScope === "standard")
        add(`${owner}:not(.selected):not(.active):not(.composer-pressed):not(:checked):not(:disabled):not([aria-checked="true"]):not([data-state])`);
      else if (normalizedScope === "pressed") {
        add(`${owner}:active`); add(`${owner}.composer-pressed`); add(`.composer-pressed ${owner}`);
      } else if (normalizedScope === "selected") {
        add(`${owner}.selected`); add(`${owner}.active`); add(`${owner}:checked`); add(`${owner}[aria-checked="true"]`);
        add(`input:checked + ${owner}`); add(`.selected ${owner}`); add(`.active ${owner}`); add(`[aria-checked="true"] ${owner}`);
      } else if (normalizedScope === "disabled") {
        add(`${owner}:disabled`); add(`${owner}.disabled`); add(`${owner}[disabled]`); add(`${owner}[aria-disabled="true"]`);
        add(`.disabled ${owner}`); add(`[aria-disabled="true"] ${owner}`);
      } else {
        const safe = escapeValue(normalizedScope);
        add(`${owner}.${safe}`); add(`${owner}[data-state="${normalizedScope}"]`); add(`.${safe} ${owner}`); add(`[data-state="${normalizedScope}"] ${owner}`);
      }
    });
    return [...new Set(scoped)].join(",");
  }
  function materializeAuthoredCssMapping(css, mapping, previousKey = "") {
    const authored = mapping?.authoredCss || {},
      selector = normalizeCssSelector(authored.selector || mapping?.target?.selector),
      property = String(authored.property || "").trim(),
      key = String(mapping?.key || "").trim();
    if (mapping?.target?.kind !== "authored-token" || !selector || !property || !key)
      return { css: String(css || ""), changed: false, matched: false };
    const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      declaration = new RegExp(`(^|[;\\s])(${escapeRegExp(property)}\\s*:)\\s*([^;}]+)`, "im"),
      oldToken = previousKey && previousKey !== key
        ? new RegExp(`\\{\\{${escapeRegExp(previousKey)}\\}\\}`, "g")
        : null,
      token = `{{${key}}}${mapping.unit || ""}`;
    let matched = false, changed = false;
    const protectedTokens = [],
      protectedCss = String(css || "").replace(/\{\{[^{}]+\}\}/g, (token) => {
        const marker = `__COMPOSER_TOKEN_${protectedTokens.length}__`;
        protectedTokens.push(token);
        return marker;
      }),
      restoreTokens = (value) => String(value).replace(/__COMPOSER_TOKEN_(\d+)__/g, (all, index) => protectedTokens[Number(index)] || all);
    let next = protectedCss.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
      const owns = String(selectors).split(",").some((candidate) => normalizeCssSelector(candidate) === selector);
      if (!owns) return rule;
      matched = true;
      let nextBody = body;
      if (oldToken) nextBody = nextBody.replace(oldToken, `{{${key}}}`);
      if (declaration.test(nextBody))
        nextBody = nextBody.replace(declaration, (all, prefix, name) => `${prefix}${name} ${token}`);
      else nextBody = `${nextBody.trimEnd()}\n  ${property}: ${token};\n`;
      if (nextBody !== body) changed = true;
      return `${selectors}{${nextBody}}`;
    });
    next = restoreTokens(next);
    if (!matched && authored.syntheticDeclaration) {
      next = `${next.trimEnd()}\n\n${selector} {\n  ${property}: ${token};\n}\n`;
      matched = changed = true;
    }
    return { css: next, changed, matched };
  }
  return {
    SCHEMA_VERSION,
    BINDING_VERSION,
    empty,
    normalize,
    migrate,
    validate,
    normalizeCssSelector,
    scopeCssSelector,
    normalizeBinding,
    withCanonicalBinding,
    materializeAuthoredCssMapping,
  };
});
