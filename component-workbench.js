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
      // New part-first authoring metadata. This is independent of the legacy
      // property/connection rows so existing components remain readable
      // without forcing their old UI model into new authoring sessions.
      partCapabilities: [],
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
        selected: "state-activation",
        selectedClass: "state-activation",
        classState: "class-presence",
        charging: "class-presence",
        checkedState: "dom-property",
        disabledState: "dom-property",
        name: "text-content",
        standardStateText: "text-content",
        selectedStateText: "text-content",
        value: "dom-property",
        url: "dom-property",
        attribute: "attribute",
        asset: "asset-source",
        width: "css-property",
        height: "css-property",
        opacity: "css-property",
        glowStrength: "css-property",
        fill: "css-custom-property",
        rotation: "css-property",
        positionX: "css-property",
        positionY: "css-property",
        press: "output-event",
        release: "output-event",
        held: "output-event",
        pulse: "output-event",
        mappedProperty: "mapped-property",
        mappedText: "text-content",
        mappedVisibility: "visibility",
        indexedProperty: "mapped-property",
        indexedText: "text-content",
        indexedVisibility: "visibility",
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
    if (effectSource.capability || entry.capability)
      effect.capability = String(effectSource.capability || entry.capability);
    ["stateId", "trueValue", "falseValue", "event", "javascript"].forEach((key) => {
      const value = effectSource[key] ?? entry[key] ?? legacyTarget[key];
      if (value != null && value !== "") effect[key] = clone(value);
    });
    if (effect.kind === "output-event" && !effect.event && entry.action)
      effect.event = String(entry.action);
    if (effect.kind === "state-activation" && !effect.name && entry.action)
      effect.name = entry.action === "selected" ? "selected" : String(entry.action);
    if (effect.kind === "class-presence" && !effect.name)
      effect.name = entry.action === "charging" ? "charging" : String(legacyTarget.parameter || entry.parameter || "selected");
    if (effect.kind === "dom-property" && !effect.name)
      effect.name = entry.action === "checkedState" ? "checked" : entry.action === "disabledState" ? "disabled" : entry.action === "url" ? "src" : "value";
    // Native checked/disabled values are source state, rather than visual
    // overrides. They must always reach the actual control regardless of the
    // Workbench preview-state toolbar; normalize older saved mappings too.
    if (effect.kind === "dom-property" && ["checked", "disabled"].includes(effect.name))
      effect.stateScope = "all";
    if (effect.kind === "css-property" && !effect.name)
      effect.name = { glowStrength: "filter", rotation: "transform", positionX: "left", positionY: "top" }[entry.action] || String(entry.action || "");
    if (effect.kind === "css-custom-property" && !effect.name)
      effect.name = entry.action === "fill" ? "--fill" : String(entry.action || "");
    if (!effect.capability && entry.action) effect.capability = String(entry.action);
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
    ["parts", "partCapabilities", "properties", "connections", "states", "repeatedCollections"].forEach(
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
  function bindingSelector(binding = {}) {
    const normalized = normalizeBinding(binding);
    return `${normalized.target.selector || ""}${normalized.target.pseudoElement || ""}`;
  }
  function bindingBoolean(value) {
    if (typeof value === "string")
      return ["true", "1", "yes", "on", "selected", "checked"].includes(value.trim().toLowerCase());
    return value === true || value === 1;
  }
  function bindingDeclaration(binding = {}, value, options = {}) {
    const normalized = normalizeBinding(binding),
      effect = normalized.effect,
      capability = String(effect.capability || options.capability || ""),
      unit = effect.unit || options.unit || "",
      numeric = Number(value) || 0,
      amount = options.literal ? value : numeric,
      cssName = effect.name || options.name || "";
    if (capability === "glowColor")
      return `--composer-scope-glow-color:${value};filter:drop-shadow(0 0 var(--composer-scope-glow-strength,6px) var(--composer-scope-glow-color))`;
    if (capability === "glowStrength")
      return `--composer-scope-glow-strength:${amount}px;filter:drop-shadow(0 0 var(--composer-scope-glow-strength) var(--composer-scope-glow-color,#00e5c3))`;
    if (capability === "shadowSize")
      return `--composer-shadow-size:${amount}px;box-shadow:0 var(--composer-shadow-size) var(--composer-shadow-size) var(--composer-shadow-color,#000000)`;
    if (capability === "shadowColor")
      return `--composer-shadow-color:${value};box-shadow:0 var(--composer-shadow-size,6px) var(--composer-shadow-size,6px) var(--composer-shadow-color)`;
    if (capability === "wrapText") return `white-space:${bindingBoolean(value) ? "normal" : "nowrap"}`;
    if (capability === "rotation") return `transform:rotate(${value}${unit || "deg"})`;
    if (capability === "positionX") return `position:relative;left:${value}${unit || "px"}`;
    if (capability === "positionY") return `position:relative;top:${value}${unit || "px"}`;
    if (capability === "asset" || effect.kind === "background-asset") {
      const source = value ? `url(${JSON.stringify(String(value))})` : "none";
      return `background-image:${source};background-position:center;background-repeat:no-repeat;background-size:contain`;
    }
    if (!["css-property", "css-custom-property", "mapped-property"].includes(effect.kind) || !cssName)
      return "";
    const rendered = options.percent
      ? options.literal ? `calc(${value} / 100)` : String(numeric / 100)
      : `${value}${unit}`;
    return `${cssName}:${rendered}`;
  }
  function bindingCssText(binding = {}, value, options = {}) {
    const normalized = normalizeBinding(binding),
      selector = bindingSelector(normalized),
      declaration = bindingDeclaration(normalized, value, options);
    if (!selector || !declaration) return "";
    const scopedSelector = scopeCssSelector(selector, normalized.effect.stateScope),
      rendered = options.important
        ? declaration.split(";").filter(Boolean).map((item) => `${item}!important`).join(";")
        : declaration;
    return `${scopedSelector}{${rendered};}`;
  }
  function applyBinding(root, binding = {}, value, options = {}) {
    const normalized = normalizeBinding(binding),
      documentValue = root?.nodeType === 9 ? root : root?.ownerDocument || root,
      selector = normalized.target.selector,
      effect = normalized.effect;
    if (value === "__preserve__") {
      documentValue?.getElementById?.(options.styleId || "composer-binding-preview-style")?.remove();
      return { applied: true, mode: "preserve", count: 0 };
    }
    const cssText = bindingCssText(normalized, value, { ...options, important: options.important !== false });
    if (cssText && documentValue?.createElement) {
      const styleId = options.styleId || "composer-binding-preview-style";
      let style = documentValue.getElementById?.(styleId);
      if (!style) {
        style = documentValue.createElement("style");
        style.id = styleId;
      }
      style.textContent = cssText;
      (documentValue.body || documentValue.documentElement)?.appendChild(style);
      return { applied: true, mode: "css", count: 1 };
    }
    if (!selector || !documentValue?.querySelectorAll) return { applied: false, mode: "unresolved", count: 0 };
    let targets = [];
    try { targets = [...documentValue.querySelectorAll(selector)]; } catch (_) { return { applied: false, mode: "invalid-selector", count: 0 }; }
    targets.forEach((target) => {
      const name = effect.name || "";
      if (effect.kind === "text-content") target.textContent = String(value ?? "");
      else if (effect.kind === "attribute") target.setAttribute(name, String(value ?? ""));
      else if (effect.kind === "data-attribute") target.setAttribute(`data-${name}`, String(value ?? ""));
      else if (effect.kind === "dom-property") {
        const nativeBoolean = ["checked", "disabled"].includes(name);
        target[name] = nativeBoolean ? bindingBoolean(value) : value;
        if (nativeBoolean) {
          if (name === "checked") target.setAttribute?.("aria-checked", String(target[name]));
          if (name === "disabled") target.setAttribute?.("aria-disabled", String(target[name]));
          // Authored components commonly render a checkbox's state in a
          // change handler in addition to CSS :checked rules. Dispatch both
          // normal native notifications so preview, generated runtime, and
          // real Crestron feedback have identical behavior.
          try { target.dispatchEvent?.(new Event("input", { bubbles: true })); } catch (_) {}
          try { target.dispatchEvent?.(new Event("change", { bubbles: true })); } catch (_) {}
        }
      }
      else if (effect.kind === "class-presence") target.classList.toggle(name, bindingBoolean(value));
      else if (effect.kind === "visibility") target.style.display = bindingBoolean(value) ? "" : "none";
      else if (effect.kind === "foreground-asset") {
        const image = target.matches?.("img") ? target : target.querySelector?.("img");
        if (image) image.src = String(value || "");
      } else if (effect.kind === "asset-source") {
        const source = String(value || "");
        if ("src" in target) target.src = source;
        else target.style.backgroundImage = source ? `url(${JSON.stringify(source)})` : "none";
      } else if (effect.kind === "state-activation") {
        const active = bindingBoolean(value), className = name || "selected";
        target.classList.toggle(className, active);
        if (className === "selected") target.setAttribute("aria-checked", String(active));
        if ("checked" in target && className === "selected") target.checked = active;
        target.dispatchEvent?.(new Event("change", { bubbles: true }));
        target.dispatchEvent?.(new CustomEvent("composer-state-change", { detail: { active }, bubbles: true }));
      }
    });
    return { applied: targets.length > 0, mode: "dom", count: targets.length };
  }
  function mapBindingValue(entry = {}, value) {
    const mapping = entry.mapping || entry.connectionConfig?.mapping;
    if (!mapping) return value;
    if (mapping.valueMap && typeof mapping.valueMap === "object") {
      const mapped = bindingBoolean(value)
        ? mapping.valueMap.trueValue
        : mapping.valueMap.falseValue;
      return mapped === undefined ? value : mapped;
    }
    if (Array.isArray(mapping.valueTable) && mapping.valueTable.length) {
      const numeric = Number(value), rows = mapping.valueTable
        .map((row) => ({ input: Number(row?.input), value: row?.value }))
        .filter((row) => Number.isFinite(row.input));
      if (!Number.isFinite(numeric) || !rows.length) return value;
      const nearest = rows.reduce((best, row) =>
        Math.abs(row.input - numeric) < Math.abs(best.input - numeric) ? row : best,
      );
      return nearest.value;
    }
    if (!Number.isFinite(Number(value))) return value;
    const finite = (candidate, fallback) => Number.isFinite(Number(candidate)) ? Number(candidate) : fallback,
      inputMin = finite(mapping.inputMin, 0), inputMax = finite(mapping.inputMax, 65535),
      outputMin = finite(mapping.outputMin, inputMin), outputMax = finite(mapping.outputMax, inputMax);
    if (inputMax === inputMin) return outputMin;
    let ratio = (Number(value) - inputMin) / (inputMax - inputMin);
    if (mapping.clamp !== false) ratio = Math.max(0, Math.min(1, ratio));
    if (mapping.invert) ratio = 1 - ratio;
    return outputMin + ratio * (outputMax - outputMin);
  }
  function applyEntryBinding(root, entry = {}, value, options = {}) {
    return applyBinding(root, normalizeBinding(entry.binding, entry), mapBindingValue(entry, value), options);
  }
  function bindingExecutorSource() {
    const functions = [
      clone,
      normalizeCssSelector,
      normalizeBindingTarget,
      canonicalEffectKind,
      normalizeBinding,
      scopeCssSelector,
      bindingSelector,
      bindingBoolean,
      bindingDeclaration,
      bindingCssText,
      applyBinding,
      mapBindingValue,
      applyEntryBinding,
    ];
    return `(function(){const BINDING_VERSION=${BINDING_VERSION};${functions.map((fn) => fn.toString()).join("\n")}return {applyBinding:applyBinding,mapBindingValue:mapBindingValue,applyEntryBinding:applyEntryBinding};})()`;
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
  function restoreAuthoredCssMapping(css, mapping) {
    const authored = mapping?.authoredCss || {},
      selector = normalizeCssSelector(authored.selector || mapping?.target?.selector),
      property = String(authored.property || "").trim(),
      key = String(mapping?.key || "").trim(),
      sourceValue = authored.originalValue ?? authored.sourceValue;
    if (!selector || !property || !key || sourceValue == null || authored.syntheticDeclaration)
      return { css: String(css || ""), changed: false };
    const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      token = new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}(?:${escapeRegExp(mapping.unit || "")})?`, "g");
    let changed = false;
    const marker = "__COMPOSER_RESTORE_TOKEN__",
      protectedCss = String(css || "").replace(token, marker),
      next = protectedCss.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
      const owns = String(selectors).split(",").some((candidate) => normalizeCssSelector(candidate) === selector);
      if (!owns || !body.includes(marker)) return rule;
      changed = true;
      return `${selectors}{${body.split(marker).join(String(sourceValue))}}`;
    });
    return {
      css: next.split(marker).join(`{{${key}}}${mapping.unit || ""}`),
      changed,
    };
  }
  function splitAuthoredDeclarations(body) {
    const declarations = [];
    let start = 0, quote = "", depth = 0;
    const commit = (end) => {
      const source = String(body || "").slice(start, end).trim();
      if (!source) return;
      let colon = -1, localQuote = "", localDepth = 0;
      for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        if (localQuote) {
          if (character === localQuote && source[index - 1] !== "\\") localQuote = "";
        } else if (character === '"' || character === "'") localQuote = character;
        else if (character === "(") localDepth += 1;
        else if (character === ")") localDepth = Math.max(0, localDepth - 1);
        else if (character === ":" && localDepth === 0) { colon = index; break; }
      }
      if (colon < 1) return;
      const property = source.slice(0, colon).trim(), value = source.slice(colon + 1).trim();
      if (/^(?:--[\w-]+|[a-z-]+)$/i.test(property) && value)
        declarations.push({ property: property.toLowerCase(), value });
    };
    for (let index = 0; index <= String(body || "").length; index += 1) {
      const character = String(body || "")[index] || ";";
      if (quote) {
        if (character === quote && String(body || "")[index - 1] !== "\\") quote = "";
      } else if (character === '"' || character === "'") quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth = Math.max(0, depth - 1);
      else if (character === ";" && depth === 0) { commit(index); start = index + 1; }
    }
    return declarations;
  }
  function authoredStateScope(selector) {
    const value = String(selector || "").toLowerCase();
    if (/:checked|\[aria-(?:checked|pressed)=["']?true|\.(?:selected|active|checked)\b/.test(value)) return "selected";
    if (/:active|\.(?:pressed|pressing)\b/.test(value)) return "pressed";
    if (/:disabled|\[disabled\]|\[aria-disabled=["']?true|\.disabled\b/.test(value)) return "disabled";
    if (/:hover|\.hover\b/.test(value)) return "hover";
    return "standard";
  }
  function authoredControlType(property, value) {
    if (/color|fill|stroke/i.test(property) || /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(/i.test(value)) return /rgba|hsla|#[\da-f]{8}\b/i.test(value) ? "color-alpha" : "color";
    if (/^(?:-?\d*\.?\d+)(?:px|em|rem|%|deg|ms|s|vh|vw)?$/i.test(String(value).trim())) return "number";
    return "text";
  }
  function authoredSelectorIdentity(tag, attributes) {
    const id = String(attributes || "").match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (id) return `#${id.replace(/[^A-Za-z0-9_-]/g, "")}`;
    const className = String(attributes || "").match(/\bclass\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().split(/\s+/)[0];
    return className ? `.${className.replace(/[^A-Za-z0-9_-]/g, "")}` : String(tag || "").toLowerCase();
  }
  function inventoryAuthoredProperties({ html = "", css = "" } = {}) {
    const entries = [], source = String(css || "");
    const addDeclaration = ({ selector, property, value, atRules = [], sourceKind = "css", index = 0 }) => {
      // html/body/:root rules describe the preview document canvas, not the
      // component placed in Composer. Exposing their width, height, margin,
      // or background would let an Inspector property alter the component's
      // host environment and is never a valid component-level mapping.
      const owner = String(selector || "").trim().toLowerCase();
      if (["html", "body", ":root", "*"].includes(owner)) return;
      const pseudoMatch = String(selector).match(/(::?(?:before|after))\s*$/i), pseudoElement = pseudoMatch ? pseudoMatch[1].replace(/^:(?!:)/, "::").toLowerCase() : "";
      entries.push({
        id: `authored-${entries.length + 1}`,
        kind: property.startsWith("--") ? "css-custom-property" : sourceKind,
        selector: pseudoMatch ? String(selector).slice(0, -pseudoMatch[1].length).trim() : String(selector).trim(),
        pseudoElement,
        property,
        value,
        stateScope: authoredStateScope(selector),
        atRules: atRules.slice(),
        controlType: authoredControlType(property, value),
        sourceIndex: index,
      });
    };
    const scan = (fragment, contexts = [], offset = 0) => {
      let cursor = 0;
      while (cursor < fragment.length) {
        const open = fragment.indexOf("{", cursor);
        if (open < 0) break;
        const prelude = fragment.slice(cursor, open).replace(/\/\*[\s\S]*?\*\//g, " ").trim();
        let depth = 1, quote = "", close = open + 1;
        for (; close < fragment.length && depth; close += 1) {
          const character = fragment[close];
          if (quote) { if (character === quote && fragment[close - 1] !== "\\") quote = ""; }
          else if (character === '"' || character === "'") quote = character;
          else if (character === "{") depth += 1;
          else if (character === "}") depth -= 1;
        }
        if (depth) break;
        const body = fragment.slice(open + 1, close - 1);
        if (/^@(media|supports|container|layer|document)\b/i.test(prelude)) scan(body, contexts.concat(prelude), offset + open + 1);
        else if (!/^@(?:keyframes|-webkit-keyframes|font-face|page|property)\b/i.test(prelude))
          prelude.split(",").map((value) => value.trim()).filter(Boolean).forEach((selector) =>
            splitAuthoredDeclarations(body).forEach(({ property, value }) => addDeclaration({ selector, property, value, atRules: contexts, index: offset + open })));
        cursor = close;
      }
    };
    scan(source);
    const markup = String(html || "");
    for (const match of markup.matchAll(/<([a-z][\w-]*)([^>]*)\bstyle\s*=\s*(["'])([\s\S]*?)\3[^>]*>/gi)) {
      const selector = authoredSelectorIdentity(match[1], match[2]);
      splitAuthoredDeclarations(match[4]).forEach(({ property, value }) => addDeclaration({ selector, property, value, sourceKind: "inline-style", index: match.index || 0 }));
    }
    for (const match of markup.matchAll(/<([a-z][\w-]*)([^>]*)>([^<]+)<\/\1\s*>/gi)) {
      if (/^(?:html|head|body|title|style|script|meta|link)$/i.test(match[1])) continue;
      const value = match[3].replace(/\s+/g, " ").trim();
      if (!value) continue;
      entries.push({ id: `authored-${entries.length + 1}`, kind: "text-content", selector: authoredSelectorIdentity(match[1], match[2]), pseudoElement: "", property: "text-content", value, stateScope: "standard", atRules: [], controlType: "text", sourceIndex: match.index || 0 });
    }
    return entries;
  }
  function groupAuthoredProperties(entries = []) {
    const groups = new Map();
    (entries || []).forEach((entry) => {
      const identity = [entry.kind, entry.selector, entry.pseudoElement || "", entry.property, entry.stateScope || "standard"].join("\u0000");
      if (!groups.has(identity))
        groups.set(identity, {
          id: `authored-group-${groups.size + 1}`,
          kind: entry.kind,
          selector: entry.selector,
          pseudoElement: entry.pseudoElement || "",
          property: entry.property,
          stateScope: entry.stateScope || "standard",
          controlType: entry.controlType || "text",
          value: entry.value,
          values: [],
          locations: [],
        });
      const group = groups.get(identity);
      if (!group.values.includes(entry.value)) group.values.push(entry.value);
      group.locations.push({
        sourceIndex: Number(entry.sourceIndex) || 0,
        sourceKind: entry.kind,
        value: entry.value,
        atRules: (entry.atRules || []).slice(),
      });
    });
    return [...groups.values()];
  }
  function inventoryAuthoredInteractiveTargets({ html = "", javascript = "" } = {}) {
    const targets = new Map(), add = (selector, evidence, sourceKind, events = []) => {
      selector = String(selector || "").trim();
      if (!selector) return;
      if (!targets.has(selector)) targets.set(selector, { selector, evidence: [], sourceKinds: [], events: [] });
      const target = targets.get(selector);
      if (evidence && !target.evidence.includes(evidence)) target.evidence.push(evidence);
      if (sourceKind && !target.sourceKinds.includes(sourceKind)) target.sourceKinds.push(sourceKind);
      events.forEach((event) => { if (!target.events.includes(event)) target.events.push(event); });
    };
    const markup = String(html || "");
    for (const match of markup.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)) {
      const tag = match[1].toLowerCase(), attributes = match[2] || "",
        type = attributes.match(/\btype\s*=\s*["']?([^\s"'>]+)/i)?.[1]?.toLowerCase() || "",
        role = attributes.match(/\brole\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "",
        semantic = tag === "button" || tag === "select" || tag === "textarea" ||
          (tag === "a" && /\bhref\s*=/i.test(attributes)) ||
          (tag === "input" && type !== "hidden") ||
          ["button", "switch", "checkbox", "radio", "tab", "menuitem", "slider"].includes(role) ||
          /\bcontenteditable(?:\s*=\s*["']?(?:true|plaintext-only))?/i.test(attributes) ||
          /\btabindex\s*=\s*["']?(?:0|[1-9]\d*)/i.test(attributes);
      if (semantic) add(authoredSelectorIdentity(tag, attributes), `${tag}${role ? ` role=${role}` : ""} is authored as an interactive element`, "html", ["press", "release", "held"]);
    }
    const source = String(javascript || ""), eventPattern = "(?:click|pointerdown|pointerup|mousedown|mouseup|touchstart|touchend|keydown|keyup)";
    for (const match of source.matchAll(new RegExp(`(?:document|root)\\.querySelector\\(\\s*(["'])([^"'\\r\\n]*)\\1\\s*\\)\\.addEventListener\\(\\s*(["'])(${eventPattern})\\3`, "gi")))
      add(match[2], `authored JavaScript listens for ${match[4]}`, "javascript", ["press", "release", "held"]);
    for (const match of source.matchAll(new RegExp(`(?:document|root)\\.getElementById\\(\\s*(["'])([^"'\\r\\n]*)\\1\\s*\\)\\.addEventListener\\(\\s*(["'])(${eventPattern})\\3`, "gi")))
      add(`#${match[2].replace(/[^A-Za-z0-9_-]/g, "")}`, `authored JavaScript listens for ${match[4]}`, "javascript", ["press", "release", "held"]);
    const variables = new Map();
    for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document|root)\.(querySelector|getElementById)\(\s*(["'])(.*?)\3\s*\)/g))
      variables.set(match[1], match[2] === "getElementById" ? `#${match[4].replace(/[^A-Za-z0-9_-]/g, "")}` : match[4]);
    for (const match of source.matchAll(new RegExp(`\\b([A-Za-z_$][\\w$]*)\\.addEventListener\\(\\s*(["'])(${eventPattern})\\2`, "gi")))
      if (variables.has(match[1])) add(variables.get(match[1]), `authored JavaScript listens for ${match[3]}`, "javascript", ["press", "release", "held"]);
    return [...targets.values()].map((target, index) => ({ id: `interactive-${index + 1}`, ...target }));
  }
  function inventoryAuthoredStateTargets({ html = "", css = "", javascript = "" } = {}) {
    const targets = new Map(), add = ({ selector, stateKind, action, parameter = "", evidence }) => {
      selector = String(selector || "").trim();
      if (!selector || !stateKind || !action) return;
      const identity = [selector, stateKind, action, parameter].join("\u0000");
      if (!targets.has(identity)) targets.set(identity, { selector, stateKind, action, parameter, evidence: [] });
      if (evidence && !targets.get(identity).evidence.includes(evidence)) targets.get(identity).evidence.push(evidence);
    }, stateFromToken = (selector, match, token) => {
      const owner = selector.slice(0, match.index).trim().replace(/[>+~]\s*$/, "").trim();
      // `.selected .child` proves a state exists, but does not identify which
      // source element owns `.selected`. Do not recommend a guessed target.
      if (!owner) return;
      if (/disabled/i.test(token)) add({ selector: owner, stateKind: "disabled", action: "disabledState", evidence: `authored CSS uses ${token}` });
      else if (/^(?:\.selected|\.active|:checked|\[aria-(?:checked|pressed|selected))/i.test(token)) {
        const nativeChecked = /^:checked/i.test(token);
        add({ selector: owner, stateKind: "selected", action: nativeChecked ? "checkedState" : "classState", parameter: nativeChecked ? "" : token.replace(/^\./, "").replace(/\[.*$/, "selected"), evidence: `authored CSS uses ${token}` });
      } else {
        const name = token.replace(/^\./, "");
        add({ selector: owner, stateKind: "mode", action: "classState", parameter: name, evidence: `authored CSS uses mode class ${token}` });
      }
    };
    const sourceCss = String(css || "");
    for (const rule of sourceCss.matchAll(/([^{}]+)\{/g)) {
      const prelude = rule[1].replace(/\/\*[\s\S]*?\*\//g, " ").trim();
      if (!prelude || prelude.startsWith("@")) continue;
      prelude.split(",").map((value) => value.trim()).forEach((selector) => {
        const pattern = /\.selected\b|\.active\b|:checked\b|:disabled\b|\.disabled\b|\[(?:disabled|aria-disabled\s*=\s*["']?true|aria-(?:checked|pressed|selected)\s*=\s*["']?true)[^\]]*\]|\.(?:state|mode|is)-[A-Za-z0-9_-]+/gi;
        for (const match of selector.matchAll(pattern)) stateFromToken(selector, match, match[0]);
      });
    }
    const markup = String(html || "");
    for (const match of markup.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)) {
      const selector = authoredSelectorIdentity(match[1], match[2]), attributes = match[2] || "",
        type = attributes.match(/\btype\s*=\s*["']?([^\s"'>]+)/i)?.[1]?.toLowerCase() || "";
      if (match[1].toLowerCase() === "input" && ["checkbox", "radio"].includes(type))
        add({ selector, stateKind: "selected", action: "checkedState", evidence: `authored HTML contains input type=${type}` });
      if (/\bdisabled(?:\s|=|$)/i.test(attributes) || /\baria-disabled\s*=\s*["']?true/i.test(attributes))
        add({ selector, stateKind: "disabled", action: "disabledState", evidence: "authored HTML contains a disabled state" });
    }
    const sourceJs = String(javascript || ""), variables = new Map();
    for (const match of sourceJs.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document|root)\.(querySelector|getElementById)\(\s*(["'])([^"'\r\n]*)\3\s*\)/g))
      variables.set(match[1], match[2] === "getElementById" ? `#${match[4].replace(/[^A-Za-z0-9_-]/g, "")}` : match[4]);
    for (const match of sourceJs.matchAll(/\b([A-Za-z_$][\w$]*)\.classList\.(?:toggle|add|remove)\(\s*(["'])([^"'\r\n]+)\2/g)) {
      const selector = variables.get(match[1]), name = match[3];
      if (!selector) continue;
      add({ selector, stateKind: /selected|active|checked|on/i.test(name) ? "selected" : "mode", action: "classState", parameter: name, evidence: `authored JavaScript changes class ${name}` });
    }
    for (const match of sourceJs.matchAll(/\b([A-Za-z_$][\w$]*)\.(checked|disabled)\s*=/g)) {
      const selector = variables.get(match[1]);
      if (selector) add({ selector, stateKind: match[2] === "checked" ? "selected" : "disabled", action: match[2] === "checked" ? "checkedState" : "disabledState", evidence: `authored JavaScript sets ${match[2]}` });
    }
    // A selector such as `input:checked + .track` describes the *visual
    // consequence* of a checkbox, not a second generic input that should
    // receive its own join. When authored HTML gives us one exact checkbox
    // identity (#toggle, for example), keep that precise target and discard
    // the redundant bare `input` inference.
    const exactNativeSelectors = [...targets.values()]
      .filter((target) => target.action === "checkedState" && /^#[A-Za-z0-9_-]+$/.test(target.selector))
      .map((target) => target.selector);
    const normalizedTargets = [...targets.values()].filter((target) => !(
      target.action === "checkedState" &&
      /^(?:input|input\[[^\]]+\])$/i.test(target.selector) &&
      exactNativeSelectors.length === 1
    ));
    return normalizedTargets.map((target, index) => ({ id: `state-target-${index + 1}`, ...target }));
  }
  function inventoryAuthoredValueTargets({ html = "", css = "" } = {}) {
    const targets = [], seen = new Set(), add = (target) => {
      const identity = [target.type, target.selector, target.pseudoElement || "", target.action, target.parameter || ""].join("\u0000");
      if (!seen.has(identity)) { seen.add(identity); targets.push({ id: `value-target-${targets.length + 1}`, ...target }); }
    };
    groupAuthoredProperties(inventoryAuthoredProperties({ html, css })).forEach((group) => {
      if (group.kind === "text-content") {
        add({ type: "serial", selector: group.selector, pseudoElement: "", action: "text", parameter: "", stateScope: group.stateScope, value: group.value, evidence: [`authored HTML contains the text “${String(group.value).slice(0, 60)}”`] });
        return;
      }
      if (group.controlType !== "number") return;
      const numeric = String(group.value).trim().match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
      if (!numeric) return;
      add({
        type: "analog",
        selector: group.selector,
        pseudoElement: group.pseudoElement || "",
        action: "mappedProperty",
        parameter: group.property,
        stateScope: group.stateScope,
        value: Number(numeric[1]),
        unit: numeric[2] || "",
        evidence: [`authored CSS contains ${group.property}: ${group.value}`],
      });
    });
    const markup = String(html || "");
    for (const match of markup.matchAll(/<(input|meter|progress)([^>]*)>/gi)) {
      const tag = match[1].toLowerCase(), attributes = match[2] || "",
        type = attributes.match(/\btype\s*=\s*["']?([^\s"'>]+)/i)?.[1]?.toLowerCase() || "";
      if (tag !== "input" || ["range", "number"].includes(type))
        add({ type: "analog", selector: authoredSelectorIdentity(tag, attributes), pseudoElement: "", action: "value", parameter: "value", stateScope: "all", value: Number(attributes.match(/\bvalue\s*=\s*["']?(-?\d*\.?\d+)/i)?.[1]) || 0, unit: "", evidence: [`authored HTML contains a numeric ${tag}${type ? ` type=${type}` : ""} control`] });
    }
    return targets;
  }
  // The basic component-authoring UI uses these descriptors rather than
  // exposing raw CSS names. Each descriptor still carries the exact authored
  // target/effect so the same canonical executor can be used by Inspector
  // properties, signal connections, preview, export, and runtime.
  function inventoryPartCapabilities({ html = "", css = "", javascript = "" } = {}) {
    const descriptors = [], used = new Set(), add = (descriptor) => {
      const identity = [descriptor.part.selector, descriptor.part.pseudoElement || "", descriptor.capability, descriptor.binding.effect.stateScope].join("\u0000");
      if (used.has(identity)) return;
      used.add(identity);
      descriptors.push({ id: `part-capability-${descriptors.length + 1}`, ...descriptor });
    };
    const declarationCapabilities = {
      background: ["backgroundColor", "Background color"],
      "background-color": ["backgroundColor", "Background color"],
      color: ["textColor", "Text / icon color"],
      "border-color": ["borderColor", "Border color"],
      "border-width": ["borderWidth", "Border width"],
      "border-radius": ["cornerRadius", "Corner radius"],
      width: ["width", "Width"],
      height: ["height", "Height"],
      opacity: ["opacity", "Opacity"],
      "box-shadow": ["shadow", "Shadow"],
      transform: ["transform", "Transform"],
      filter: ["filter", "Filter"],
      display: ["visibility", "Visibility"],
      visibility: ["visibility", "Visibility"],
    };
    groupAuthoredProperties(inventoryAuthoredProperties({ html, css })).forEach((entry) => {
      if (entry.kind === "text-content") {
        add({
          part: { selector: entry.selector, pseudoElement: "" },
          capability: "text",
          label: "Text",
          controlType: "text",
          source: { property: "text-content", value: entry.value, evidence: "authored HTML text" },
          binding: withCanonicalBinding({ target: { selector: entry.selector }, action: "text", stateScope: entry.stateScope }).binding,
        });
        return;
      }
      const definition = declarationCapabilities[entry.property];
      if (!definition) return;
      const unit = String(entry.value || "").trim().match(/^-?\d*\.?\d+([a-z%]+)$/i)?.[1] || "";
      add({
        part: { selector: entry.selector, pseudoElement: entry.pseudoElement || "" },
        capability: definition[0],
        label: definition[1],
        controlType: entry.controlType,
        unit,
        source: { property: entry.property, value: entry.value, evidence: `authored CSS contains ${entry.property}: ${entry.value}` },
        binding: withCanonicalBinding({
          target: { selector: entry.selector, pseudoElement: entry.pseudoElement || "" },
          action: entry.property === "visibility" || entry.property === "display" ? "mappedVisibility" : "cssProperty",
          parameter: entry.property,
          stateScope: entry.stateScope,
          unit,
        }).binding,
      });
    });
    inventoryAuthoredStateTargets({ html, css, javascript }).forEach((target) => {
      const state = target.action === "checkedState" ? ["selected", "Selected state"]
        : target.action === "disabledState" ? ["disabled", "Disabled state"] : null;
      if (!state) return;
      add({
        part: { selector: target.selector, pseudoElement: "" },
        capability: state[0],
        label: state[1],
        controlType: "boolean",
        source: { property: target.action, value: "", evidence: target.evidence },
        binding: withCanonicalBinding({ target: { selector: target.selector }, action: target.action, stateScope: "all" }).binding,
      });
    });
    return descriptors;
  }
  function materializePartCapabilities(workbench, source = {}) {
    const value = normalize(workbench),
      generated = inventoryPartCapabilities(source),
      saved = new Map((value.partCapabilities || []).map((entry) => [
        [entry.part?.selector || "", entry.part?.pseudoElement || "", entry.capability || "", entry.binding?.effect?.stateScope || "all"].join("\u0000"),
        entry,
      ])),
      generatedIdentities = new Set();
    const materialized = generated.map((descriptor) => {
      const identity = [descriptor.part.selector, descriptor.part.pseudoElement || "", descriptor.capability, descriptor.binding.effect.stateScope || "all"].join("\u0000"),
        existing = saved.get(identity),
        part = value.parts.find((candidate) =>
          normalizeCssSelector(candidate.selector) === normalizeCssSelector(descriptor.part.selector) &&
          String(candidate.pseudoElement || "") === String(descriptor.part.pseudoElement || ""));
      return {
        ...descriptor,
        ...(existing ? {
          id: existing.id || descriptor.id,
          selected: !!existing.selected,
          name: existing.name || descriptor.label,
          // Once a capability is accepted its authored declaration is
          // deliberately tokenized (for example border-radius: {{radius}}).
          // Keep the original source evidence and friendly control metadata
          // on that accepted descriptor instead of turning it into an opaque
          // text value on the next render.
          ...(existing.selected ? {
            controlType: existing.controlType || descriptor.controlType,
            unit: existing.unit || descriptor.unit,
            source: existing.source || descriptor.source,
            binding: existing.binding ? {
              ...descriptor.binding,
              ...existing.binding,
              effect: { ...descriptor.binding?.effect, ...existing.binding?.effect },
            } : descriptor.binding,
          } : {}),
        } : {}),
        part: { ...descriptor.part, partId: part?.id || "" },
      };
    });
    generated.forEach((descriptor) => generatedIdentities.add([
      descriptor.part.selector,
      descriptor.part.pseudoElement || "",
      descriptor.capability,
      descriptor.binding.effect.stateScope || "all",
    ].join("\u0000")));
    // Never discard an accepted capability merely because its declaration was
    // removed or changed outside Composer. Keeping it visible as unresolved
    // lets the author remove it (or deliberately retarget it in Advanced)
    // instead of silently changing the saved mapping.
    saved.forEach((entry, identity) => {
      if (generatedIdentities.has(identity) || !entry.selected) return;
      const part = value.parts.find((candidate) =>
        normalizeCssSelector(candidate.selector) === normalizeCssSelector(entry.part?.selector || "") &&
        String(candidate.pseudoElement || "") === String(entry.part?.pseudoElement || ""));
      materialized.push({
        ...entry,
        unresolved: true,
        part: { ...(entry.part || {}), partId: part?.id || entry.part?.partId || "" },
      });
    });
    return materialized;
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
    bindingSelector,
    bindingBoolean,
    bindingDeclaration,
    bindingCssText,
    applyBinding,
    mapBindingValue,
    applyEntryBinding,
    bindingExecutorSource,
    normalizeBinding,
    withCanonicalBinding,
    materializeAuthoredCssMapping,
    restoreAuthoredCssMapping,
    inventoryAuthoredProperties,
    groupAuthoredProperties,
    inventoryAuthoredInteractiveTargets,
    inventoryAuthoredStateTargets,
    inventoryAuthoredValueTargets,
    inventoryPartCapabilities,
    materializePartCapabilities,
  };
});
