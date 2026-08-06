(function (global) {
  "use strict";
  const optionalContent = {
    "battery-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "card-flip": { showLabel: ".text" },
    "cell-bar-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "display-control": { showLabel: ".dc-name" },
    "display-flip": { showLabel: ".text" },
    "lighting-control": { showLabel: ".name", showPercentage: ".level" },
    "microphone-control": { showLabel: ".label", showPercentage: ".value", showToggle: ".toggle" },
    "rotary-knob": { showLabel: ".rotary-name", showPercentage: ".rotary-value" },
    "shade-control": { showLabel: ".name", showPercentage: ".position" },
    "single-light-control": { showLabel: ".name", showPercentage: ".level" },
    "single-shade-control": { showLabel: ".name", showPercentage: ".position" },
    "single-mic-control": { showLabel: ".label", showPercentage: ".value", showToggle: ".toggle" },
    "wifi-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
  };
  function escapeAttr(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
  function wireCipText(root, signals) {
    const pattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi, walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    function analogText(value, format) {
      const number = Number(value) || 0, spec = String(format || "%r");
      if (/%x/i.test(spec)) return Math.round(number).toString(16).toUpperCase().padStart(2, "0");
      if (/%t/i.test(spec)) { const seconds = Math.max(0, Math.round(number)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
      const percent = spec.match(/%(\d+(?:\.\d+)?)\.(\d+)p/i); if (percent) return `${((number / Math.max(1, Number(percent[1]))) * 100).toFixed(Number(percent[2]))}%`;
      const fixed = spec.match(/%(\d+)\.(\d+)f/i); if (fixed) return number.toFixed(Number(fixed[2])).padStart(Number(fixed[1]) + Number(fixed[2]) + 1, "0");
      const integer = spec.match(/%(\d+)?[du]/i); if (integer) return String(Math.round(number)).padStart(Number(integer[1]) || 0, "0");
      return String(Math.round(number));
    }
    while (walker.nextNode()) if (/<cip[sda]>/i.test(walker.currentNode.nodeValue || "")) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const tokens = [], values = [], template = String(node.nodeValue || "").replace(pattern, (match, kind, content) => {
        let address = String(content).trim(), format = "", trueText = "True", falseText = "False", fallback = ""; kind = kind.toLowerCase();
        if (kind === "d") { const question = address.indexOf("?"), colon = address.indexOf(":", question + 1); if (question >= 0) { trueText = address.slice(question + 1, colon >= 0 ? colon : undefined); falseText = colon >= 0 ? address.slice(colon + 1) : ""; address = address.slice(0, question); } }
        else if (kind === "a") { const question = address.indexOf("?"); if (question >= 0) { format = address.slice(question + 1); address = address.slice(0, question); } }
        else { const colon = address.indexOf(":"); if (colon >= 0) { fallback = address.slice(colon + 1); address = address.slice(0, colon); } }
        const index = tokens.length; tokens.push({ kind, address: address.trim(), format: format.trim(), trueText, falseText, fallback }); values.push(kind === "s" ? fallback : kind === "d" ? falseText : "0"); return `\u0000${index}\u0000`;
      });
      function render() { node.nodeValue = template.replace(/\u0000(\d+)\u0000/g, (_, index) => values[Number(index)] ?? ""); }
      tokens.forEach((token, index) => signals.subscribeExact(token.kind === "s" ? "serial" : token.kind === "d" ? "digital" : "analog", token.address, (value) => { values[index] = token.kind === "s" ? String(value == null || value === "" ? token.fallback : value) : token.kind === "d" ? (value === true || value === 1 || value === "1" ? token.trueText : token.falseText) : analogText(value, token.format); render(); })); render();
    });
  }
  function wireItemVisibility(root, definition, properties, signals) {
    if (!properties?.itemVisibilityEnabled) return;
    (definition.rangeBindings || []).filter((range) => range.visibilitySelector).forEach((range) => {
      const base = String(properties[range.baseKey] || "").trim(),
        increment = Math.max(1, Math.round(Number(properties[range.incrementKey]) || 1)),
        configuredCount = Number(properties[range.countKey]),
        initialCount = root.querySelectorAll(range.visibilitySelector).length,
        count = Math.max(1, Math.min(100, Math.round(configuredCount || initialCount || 1))),
        states = new Map(),
        apply = () => root.querySelectorAll(range.visibilitySelector).forEach((item, domIndex) => {
          const activeGroup = range.activeGroupSelector ? root.querySelector(range.activeGroupSelector) : null,
            groupIndex = activeGroup && range.groupSelector ? [...root.querySelectorAll(range.groupSelector)].indexOf(activeGroup) : 0,
            index = Number(item.dataset.visibilityIndex ?? (domIndex + Math.max(0, groupIndex) * (Number(range.groupSize) || 0)));
          if (states.has(index)) item.style.visibility = states.get(index) ? "visible" : "hidden";
        }),
        observer = new MutationObserver(apply);
      observer.observe(root, { childList: true, subtree: true });
      for (let index = 0; index < count; index += 1) {
        const address = properties.bindingMode === "join" || /^\d+$/.test(base)
          ? String(Math.max(1, Math.round(Number(base) || 1)) + index * increment)
          : base.replaceAll("{index}", String(index)).replaceAll("{n}", String(index + 1));
        signals.subscribeAddress("digital", address, (value) => {
          states.set(index, value === true || value === 1 || value === "1");
          apply();
        });
      }
    });
  }
  function propertyStyle(properties) {
    return Object.entries(properties || {})
      .flatMap(([key, value]) => {
        const name = `--${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`,
          clean = String(value).replace(/[;<>]/g, "");
        return typeof value === "number"
          ? [
              `${name}:${clean}`,
              `${name}-px:${clean}px`,
              `${name}-percent:${clean}%`,
            ]
          : [`${name}:${clean}`];
      })
      .join(";");
  }
  function contractPattern(value) {
    return String(value || "").replace(
      /^(.*)\.\{(?:n|index)\}\.(.+)$/,
      (_, prefix, attribute) =>
        `${prefix}[{index}].${attribute.replace(/\./g, "_")}`,
    );
  }
  function contractProperties(item) {
    const properties = Object.fromEntries(
      Object.entries(item.properties || {}).map(([key, value]) => [
        key,
        item.properties?.bindingMode === "contract" && typeof value === "string"
          ? contractPattern(value)
          : value,
      ]),
    );
    if (item.componentId === "countdown-auto-fire") {
      if (properties.text === "ARM") properties.text = "Shutdown";
      if (properties.completedText === "FIRED")
        properties.completedText = "Shutting Down...";
      if (String(properties.faceColor || "").toLowerCase() === "#203332")
        properties.faceColor = "#04aa8e";
    }
    return properties;
  }
  function contractIdentifier(value) {
    const clean = String(value || "")
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return /^[A-Za-z_]/.test(clean) ? clean : `_${clean}`;
  }
  function contractPrefix(project, item) {
    const page = project.pages.find((entry) => entry.id === (item.contractSourcePageId || item.pageId)),
      pageName = item.contractNamespace ? contractIdentifier(item.contractNamespace) : item.master
        ? "Global"
        : contractIdentifier(page?.name || "Main") || "Main",
      base = contractIdentifier(item.name || "Widget"),
      peers = project.items.filter(
        (entry) =>
          entry.componentId === item.componentId &&
          entry.pageId === item.pageId &&
          !!entry.master === !!item.master,
      ),
      number = peers.indexOf(item) + 1;
    return `${pageName}.${base}${number > 1 ? number : ""}`;
  }
  function widgetDocument(html, targetPage) {
    const bridge = `<script>document.addEventListener("pointerdown",function(){parent.postMessage({type:"composer-interaction",phase:"press"},"*")});document.addEventListener("pointerup",function(){parent.postMessage({type:"composer-interaction",phase:"release"},"*")${targetPage ? `;parent.postMessage({type:"crestron-local-page",page:${JSON.stringify(targetPage)}},"*")` : ""}});<\/script>`;
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}${bridge}</body></html>`;
  }
  function exportProject(project) {
    project = structuredClone(project);
    const subpageTargetKey = project.targetDevice === "custom" ? `custom:${project.width}x${project.height}` : project.targetDevice,
      resolveSubpage = (entry, pageId) => {
        const pageOverride = entry.instanceOverrides?.[pageId] || {},
          targetOverride = pageOverride.deviceOverrides?.[subpageTargetKey] || entry.deviceOverrides?.[subpageTargetKey] || {},
          baseWidth = Math.max(1, Number(entry.basePanelWidth) || project.width), baseHeight = Math.max(1, Number(entry.basePanelHeight) || project.height),
          fallback = subpageTargetKey === (entry.basePanelKey || subpageTargetKey) ? {} : {
            width: Math.round((Number(pageOverride.width ?? entry.width) || baseWidth) * project.width / baseWidth),
            height: Math.round((Number(pageOverride.height ?? entry.height) || 100) * project.height / baseHeight),
          };
        return { ...entry, ...pageOverride, ...fallback, ...targetOverride,
          width: Math.max(1, Number(targetOverride.width ?? fallback.width ?? pageOverride.width ?? entry.width) || project.width),
          height: Math.max(1, Number(targetOverride.height ?? fallback.height ?? pageOverride.height ?? entry.height) || 100) };
      };
    (project.subpages || []).forEach((entry) => {
      const sourceItems = project.items.filter((item) => item.pageId === entry.sourcePageId && !item.master);
      project.pages.forEach((page) => {
        if (page.id === entry.sourcePageId || (entry.excludedPages || []).includes(page.id) || (entry.includedPages?.length && !entry.includedPages.includes(page.id))) return;
        const override = entry.instanceOverrides?.[page.id] || {}, resolved = resolveSubpage(entry, page.id),
          width = Math.max(1, Number(resolved.width) || project.width), height = Math.max(1, Number(resolved.height) || 100),
          offset = Number.isFinite(Number(resolved.x)) && Number.isFinite(Number(resolved.y)) ? { x: Number(resolved.x), y: Number(resolved.y) }
            : resolved.placement === "bottom" ? { x: 0, y: Math.max(0, project.height - height) }
            : resolved.placement === "right" ? { x: Math.max(0, project.width - width), y: 0 }
            : resolved.placement === "overlay" ? { x: Math.round((project.width - width) / 2), y: Math.round((project.height - height) / 2) }
            : { x: 0, y: 0 };
        sourceItems.forEach((source) => {
          if (source.x >= width || source.y >= height) return;
          const item = structuredClone(source), itemOverride = override.itemOverrides?.[source.id] || {};
          item.properties = { ...(item.properties || {}), ...(itemOverride.properties || {}) };
          item.signalBindings = { ...(item.signalBindings || {}), ...(itemOverride.signalBindings || {}) };
          item.id = `subpage-${entry.id}-${page.id}-${source.id}`;
          item.pageId = page.id; item.x = source.x + offset.x; item.y = source.y + offset.y;
          item.z = (Number(resolved.z) || 9000) + (Number(source.z) || 0);
          item.subpageId = entry.id;
          item.subpagePageId = page.id;
          item.contractSourcePageId = resolved.bindingScope === "per-page" ? "" : entry.sourcePageId;
          item.contractNamespace = resolved.contractNamespace || entry.contractNamespace || "";
          item.subpageBounds = { x: offset.x, y: offset.y, width, height };
          if (resolved.visibilityEnabled && item.componentId) {
            item.properties = { ...(item.properties || {}), visibilityEnabled: true };
            item.signalBindings = { ...(item.signalBindings || {}), visibility: { mode: resolved.bindingMode || "contract", value: resolved.visibility || "" } };
          }
          project.items.push(item);
        });
      });
    });
    const deployablePages = project.pages.filter((page) => !page.subpageMasterId),
      outputPages = deployablePages.length ? deployablePages : project.pages;
    const assetUrl = (id) =>
        ((project.assets || []).find((asset) => asset.id === id) || {})
          .dataUrl || "",
      fontAssetFamily = (asset) =>
        `ComposerFont_${String(asset?.id || "font").replace(/[^A-Za-z0-9_]/g, "_")}`,
      fontFaces = (project.assets || [])
        .filter((asset) => String(asset.type || "").includes("font"))
        .map((asset) => `@font-face{font-family:"${fontAssetFamily(asset)}";src:url("${asset.dataUrl}");font-display:swap}`)
        .join("\n"),
      backgroundStyle = (id) => {
        const url = assetUrl(id);
        return url
          ? `background-image:url(&quot;${url}&quot;);background-size:cover;background-position:center;`
          : "";
      },
      pageBackgroundStyle = (page) => {
        const url = assetUrl(page.backgroundAsset);
        return url
          ? `background-image:url(&quot;${url}&quot;);background-size:${page.backgroundAssetFit || "cover"};background-position:${Number(page.backgroundAssetX ?? 50)}% ${Number(page.backgroundAssetY ?? 50)}%;background-repeat:no-repeat;`
          : "";
      },
      subpageSurface = (entry, page) => {
        const resolved = resolveSubpage(entry, page.id),
          width = Math.max(1, Number(resolved.width) || project.width), height = Math.max(1, Number(resolved.height) || 100),
          offset = Number.isFinite(Number(resolved.x)) && Number.isFinite(Number(resolved.y)) ? { x: Number(resolved.x), y: Number(resolved.y) }
            : resolved.placement === "bottom" ? { x: 0, y: Math.max(0, project.height - height) }
            : resolved.placement === "right" ? { x: Math.max(0, project.width - width), y: 0 }
            : resolved.placement === "overlay" ? { x: Math.round((project.width - width) / 2), y: Math.round((project.height - height) / 2) }
            : { x: 0, y: 0 },
          sourcePage = project.pages.find((candidate) => candidate.id === entry.sourcePageId);
        return `<div class="subpage-surface" data-subpage="${escapeAttr(entry.id)}" data-subpage-page="${escapeAttr(page.id)}" style="position:absolute;left:${offset.x}px;top:${offset.y}px;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;z-index:${(Number(resolved.z) || 9000) - 1};background-color:${sourcePage?.background || "transparent"};${pageBackgroundStyle(sourcePage || {})}"></div>`;
      },
      subpageClipStyle = (item) => {
        const bounds = item.subpageBounds;
        if (!bounds) return "";
        const top = Math.max(0, bounds.y - item.y), left = Math.max(0, bounds.x - item.x),
          right = Math.max(0, item.x + item.w - (bounds.x + bounds.width)), bottom = Math.max(0, item.y + item.h - (bounds.y + bounds.height));
        return `clip-path:inset(${top}px ${right}px ${bottom}px ${left}px);`;
      },
      graphicBackgroundStyle = (item) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          repeats = item.graphicAssetPlacement === "items" && !!definition?.itemSelector,
          url = item.graphicAssetMode === "background" && !repeats ? assetUrl(item.graphicAsset) : "";
        return url ? `background-image:url(&quot;${url}&quot;);background-size:${item.graphicAssetFit || "contain"};background-position:${Number(item.graphicAssetX ?? 50)}% ${Number(item.graphicAssetY ?? 50)}%;background-repeat:no-repeat;` : "";
      },
      selectedSameAsStandard = (item) =>
        item.properties?.selectedSameAsStandard == null ||
        item.properties?.selectedSameAsStandard === true ||
        item.properties?.selectedSameAsStandard === 1 ||
        item.properties?.selectedSameAsStandard === "1" ||
        String(item.properties?.selectedSameAsStandard).toLowerCase() === "true",
      selectedAssetId = (item) =>
        selectedSameAsStandard(item) ? item.graphicAsset : item.selectedGraphicAsset,
      graphicOverlay = (item, selected = false) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          repeats = item.graphicAssetPlacement === "items" && !!definition?.itemSelector,
          url = item.graphicAssetMode === "overlay" && !repeats
          ? assetUrl(selected ? selectedAssetId(item) : item.graphicAsset)
          : "";
        return url ? `<img class="widget-asset-overlay widget-asset-overlay-${selected ? "selected" : "normal"}" alt="" style="position:absolute;z-index:50;left:${Number(item.graphicAssetX ?? 50)}%;top:${Number(item.graphicAssetY ?? 50)}%;width:${Number(item.graphicAssetWidth ?? 35)}%;height:${Number(item.graphicAssetHeight ?? 35)}%;max-width:none;object-fit:${item.graphicAspectLocked ? item.graphicAssetFit || "contain" : "fill"};opacity:${Math.max(0,Math.min(100,Number(item.graphicAssetOpacity ?? 100)))/100};pointer-events:none;transform:translate(-50%,-50%)" src="${url}">` : "";
      },
      repeatedGraphicStyle = (item, instance) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          selector = definition?.itemSelector;
        if (item.graphicAssetPlacement !== "items" || !selector) return "";
        const normal = assetUrl(item.graphicAsset),
          selected = assetUrl(selectedAssetId(item)) || normal;
        if (!normal && !selected) return "";
        const scope = `.scoped-widget[data-instance=${JSON.stringify(instance)}] .scoped-preview `,
          normalUrl = normal ? `url(${JSON.stringify(normal)})` : "none",
          selectedUrl = selected ? `url(${JSON.stringify(selected)})` : normalUrl,
          size = item.graphicAspectLocked
            ? item.graphicAssetFit || "contain"
            : "100% 100%",
          common = `background-repeat:no-repeat;background-position:center;background-size:${size};`,
          selectedSelectors = [".active", ".selected", ".flipped", '[aria-selected="true"]']
            .map((state) => `${scope}${selector}${state}`)
            .join(",");
        const css = item.graphicAssetMode === "background"
          ? `${scope}${selector}{background-image:${normalUrl}!important;${common}}${selectedSelectors}{background-image:${selectedUrl}!important}`
          : item.graphicAssetMode === "overlay"
            ? `${scope}${selector}{position:relative!important}${scope}${selector}::after{content:"";position:absolute;z-index:50;pointer-events:none;left:${Number(item.graphicAssetX ?? 50)}%;top:${Number(item.graphicAssetY ?? 50)}%;width:${Number(item.graphicAssetWidth ?? 35)}%;height:${Number(item.graphicAssetHeight ?? 35)}%;opacity:${Math.max(0, Math.min(100, Number(item.graphicAssetOpacity ?? 100))) / 100};transform:translate(-50%,-50%);background-image:${normalUrl};${common}}${selectedSelectors.split(",").map((entry) => `${entry}::after`).join(",")}{background-image:${selectedUrl}}`
            : "";
        return css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : "";
      },
      selectedGraphicStyle = (item) => {
        const url = assetUrl(selectedAssetId(item));
        return `--selected-graphic-url:${url ? `url(&quot;${url}&quot;)` : "none"};`;
      },
      perButtonAssetStyle = (item, instance) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          assetListProperties = (definition?.properties || []).filter((property) => property.type === "asset-list" && (property.assetSelector || definition?.itemSelector));
        if (!assetListProperties.length) return "";
        const scope = `.scoped-widget[data-instance=${JSON.stringify(instance)}] .scoped-preview `,
          rules = assetListProperties.flatMap((property) => {
            const selector = property.assetSelector || definition.itemSelector,
              ids = String((item.properties || {})[property.key] || "").split("|");
            return ids.map((id, index) => {
              const url = id ? assetUrl(id) : "",
                base = `${scope}${selector}:nth-of-type(${index + 1})`,
                target = property.assetStateSelector
                  ? String(property.assetStateSelector).split(",").map((suffix) => base + suffix.trim()).join(",")
                  : base;
              return url ? `${target}{--composer-item-asset:url(${JSON.stringify(url)});background-image:url(${JSON.stringify(url)})!important;background-repeat:no-repeat;background-position:center;background-size:contain}` : "";
            });
          }).filter(Boolean).join("");
        return rules ? `<style>${rules.replace(/<\/style/gi, "<\\/style")}</style>` : "";
      };
    const itemVisibleOnPage = (item, pageId) =>
      item.master
        ? !(item.excludedPages || []).includes(pageId)
        : item.pageId === pageId;
    const pages = outputPages
      .map((page) => {
        const surfaces = (project.subpages || []).filter((entry) => page.id !== entry.sourcePageId && !(entry.excludedPages || []).includes(page.id) && (!entry.includedPages?.length || entry.includedPages.includes(page.id))).map((entry) => subpageSurface(entry, page)).join("\n");
        const widgets = project.items
          .filter((item) => itemVisibleOnPage(item, page.id))
          .map((item) => {
            const instance = item.master ? `${item.id}--${page.id}` : item.id;
            const hiddenStyle = `display:${item.hidden || item.systemManaged ? "none" : "block"};${item.systemManaged ? "pointer-events:none;" : ""}`;
            return item.componentId
              ? `<div class="scoped-widget" data-instance="${instance}" data-subpage="${escapeAttr(item.subpageId || "")}" data-subpage-page="${escapeAttr(item.subpagePageId || "")}" data-graphic-mode="${item.graphicAssetMode || "none"}" data-asset-selected="false" data-has-selected-graphic="${assetUrl(item.selectedGraphicAsset) ? "true" : "false"}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z};${subpageClipStyle(item)}${hiddenStyle}${backgroundStyle(item.backgroundAsset)}${graphicBackgroundStyle(item)}${selectedGraphicStyle(item)}${propertyStyle(item.properties)}"><div class="scoped-preview"></div>${graphicOverlay(item)}${graphicOverlay(item, true)}${repeatedGraphicStyle(item, instance)}${perButtonAssetStyle(item, instance)}</div>`
              : `<iframe data-instance="${item.master ? `${item.id}--${page.id}` : item.id}" data-subpage="${escapeAttr(item.subpageId || "")}" data-subpage-page="${escapeAttr(item.subpagePageId || "")}" title="${escapeAttr(item.name)}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;border:0;z-index:${item.z};${subpageClipStyle(item)}${hiddenStyle}${backgroundStyle(item.backgroundAsset)}" srcdoc="${escapeAttr(widgetDocument(item.source, item.targetPage))}"></iframe>`;
          })
          .join("\n");
        return `<section class="page" id="${page.id}" style="background-color:${page.background};${pageBackgroundStyle(page)}">${surfaces}${widgets}</section>`;
      })
      .join("\n");
    const config = JSON.stringify(
      outputPages.map((page) => ({
        id: page.id,
        mode: page.bindingMode,
        signal:
          page.bindingMode === "contract"
            ? `${contractIdentifier(String(page.binding || page.name || "Main").replace(/\.Selected$/i, "")) || "Main"}.Selected`
            : page.binding,
        transition: page.transition || "none",
        transitionDuration: Number(page.transitionDuration) || 350,
      })),
    );
    const firstPage = JSON.stringify(outputPages[0].id);
    const diagnostics = !!project.diagnostics;
    const diagnosticMarkup = diagnostics
      ? '<aside id="ch5-diagnostics"><strong onclick="var p=this.parentElement;if(p.style.left){p.style.left=\'\';p.style.bottom=\'\';p.style.right=\'30px\';p.style.top=\'30px\'}else{p.style.right=\'\';p.style.top=\'\';p.style.left=\'30px\';p.style.bottom=\'30px\'}">CH5 Signal Diagnostics — tap here to move</strong><pre id="ch5-communication-status"></pre><pre id="ch5-diagnostic-log"></pre></aside>'
      : "";
    const exportedProperties = (item) => {
      const properties = contractProperties(item);
      if (item.componentId === "widget-list") {
        properties.includedGraphicAssetData = assetUrl(properties.includedGraphicAsset);
        properties.includedSelectedGraphicAssetData = assetUrl(properties.includedSelectedGraphicAsset);
      }
      return properties;
    };
    const scopedItems = outputPages.flatMap((page) =>
      project.items
        .filter(
          (item) => item.componentId && itemVisibleOnPage(item, page.id),
        )
        .map((item) => ({
          instance: item.master ? `${item.id}--${page.id}` : item.id,
          componentId: item.componentId,
          bindings: item.signalBindings || {},
          properties: exportedProperties(item),
          contractPrefix: contractPrefix(project, item),
          targetPage: item.targetPage || "",
          interaction: item.interaction || null,
          pageId: page.id,
          templateOverride: item.componentTemplate || "",
          stylesOverride: item.componentStyles || "",
        })),
    );
    const interactionItems = outputPages.flatMap((page) =>
      project.items
        .filter((item) => itemVisibleOnPage(item, page.id))
        .map((item) => ({
          instance: item.master ? `${item.id}--${page.id}` : item.id,
          pageId: page.id,
          interaction: item.interaction || null,
          interactions: item.interactions || [],
          actions: item.actions || [],
        })),
    );
    const usedComponentIds = [
      ...new Set(
        scopedItems.flatMap((item) =>
          item.componentId === "widget-list" && item.properties?.widgetType
            ? [item.componentId, item.properties.widgetType]
            : [item.componentId],
        ),
      ),
    ];
    // Keep the base component CSS in the document head as well as beside each
    // mounted template. Some WebView/browser paths can briefly or permanently
    // lose styles created through an innerHTML mount, which leaves controls
    // such as the oval buttons and toggles rendered as bare native content.
    // A static copy also makes Preview use the same dependable stylesheet path
    // as the editor canvas.
    const componentCss =
      fontFaces + "\n.scoped-widget,.scoped-preview,.scoped-preview>[data-component]{overflow:visible!important}.scoped-preview.composer-scroll-horizontal:not(.composer-scroll-vertical){overflow-x:auto!important;overflow-y:hidden!important}.scoped-preview.composer-scroll-vertical:not(.composer-scroll-horizontal){overflow-x:hidden!important;overflow-y:auto!important}.scoped-preview.composer-scroll-horizontal.composer-scroll-vertical{overflow:auto!important}\n" +
      usedComponentIds
        .map((id) => global.ComposerRuntime.get(id)?.styles || "")
        .join("\n");
    const usedDefinitions = usedComponentIds
      .map((id) => {
        const d = global.ComposerRuntime.get(id);
        let mount = d.mount.toString().replace(/^mount/, "function");
        if ((d.properties || []).some((p) => p.key === "localLabels")) {
          const config = {
              "card-flip": [".cards", ".card-wrap", ".text", true],
              "display-flip": [".cards", ".card-wrap", ".text", true],
              "lighting-control": [".loads", ".load", ".name", false],
              "microphone-control": [".mic-list", ".mic-card", ".label", false],
              "shade-control": [".shade-list", ".shade-card", ".name", false],
            }[id],
            original = mount;
          mount = `function(root,context){var cleanup=(${original})(root,context),labels=String(context.options.properties.localLabels??'').split('|');function apply(){root.querySelectorAll(${JSON.stringify(config[1])}).forEach(function(group,index){if(index>=labels.length)return;var text=String(labels[index]??'').trim();${config[3] ? `group.querySelectorAll(${JSON.stringify(config[2])}).forEach(function(el){el.textContent=text})` : `var el=group.querySelector(${JSON.stringify(config[2])});if(el)el.textContent=text`}})}var observer=new MutationObserver(function(mutations){if(mutations.some(function(m){return m.target.matches&&m.target.matches(${JSON.stringify(config[0])})}))apply()});apply();observer.observe(root,{childList:true,subtree:true});return function(){observer.disconnect();if(typeof cleanup==='function')cleanup()}}`;
        }
        const data = d.data || {},
          keys = Object.keys(data).filter((key) =>
            /^[A-Za-z_$][\w$]*$/.test(key),
          );
        if (keys.length)
          mount = `(function(${keys.join(",")}){return (${mount})})(${keys.map((key) => JSON.stringify(data[key])).join(",")})`;
        return `${JSON.stringify(id)}:{id:${JSON.stringify(id)},template:${JSON.stringify(d.template)},styles:${JSON.stringify(d.styles)},signals:${JSON.stringify(d.signals)},properties:${JSON.stringify(d.properties || [])},optionalContent:${JSON.stringify(d.optionalContent || {})},data:${JSON.stringify(data)},defaultSize:${JSON.stringify(d.defaultSize || {})},scrollAxes:${JSON.stringify(d.scrollReturnAxes || [])},itemSelector:${JSON.stringify(d.itemSelector || "")},rangeBindings:${JSON.stringify(d.rangeBindings || [])},hold:${JSON.stringify(d.standardHoldCapability || null)},mount:${mount}}`;
      })
      .join(",");
    const controller = `(function(){var pages=${config},items=${JSON.stringify(scopedItems)},definitions={${usedDefinitions}},optional=${JSON.stringify(optionalContent)},debug=${JSON.stringify(diagnostics)},debugLog=document.getElementById('ch5-diagnostic-log'),communicationStatus=document.getElementById('ch5-communication-status');function diag(message){if(!debug)return;var line=new Date().toLocaleTimeString()+' '+message;if(debugLog){debugLog.textContent+=line+'\\n';debugLog.scrollTop=debugLog.scrollHeight}console.log('[CH5 Diagnostic]',message)}function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});diag('Page: '+id)}function code(type){return type==='digital'?'b':type==='analog'?'n':'s'}function appearance(root,p){var glow=Math.max(0,Number(p.glowStrength)||0),radius=Math.max(0,Number(p.cornerRadius)||0),font=Math.max(0,Number(p.fontSize)||0),style=document.createElement('style');style.textContent='[data-component] .panel,[data-component] .card,[data-component] .mic-card,[data-component] .shade-card{background-color:'+p.backgroundColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .load,[data-component] .shade{background-color:'+p.buttonColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important}[data-component] button.active,[data-component] button.selected,[data-component] .selected,[data-component] .pressed{border-color:'+p.accentColor+'!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .label,[data-component] .name,[data-component] .note,[data-component] .big,[data-component] .value,[data-component] .position,[data-component] .status,[data-component] .btn-txt,[data-component] .mic-text,[data-component] .mic-label,[data-component] .shade-name{color:'+p.textColor+'!important;'+(font?'font-size:'+font+'px!important;':'')+'}';root.appendChild(style);if(p.localText){var values=String(p.localText).split('|'),targets=root.querySelectorAll('[data-local-text],.label,.name,.note,.big,.btn-txt,.mic-label,.shade-name,button');values.forEach(function(v,i){if(targets[i]&&v.trim())targets[i].textContent=v.trim()})}}var lib=null;try{lib=window.CrComLib||(window.parent&&window.parent.CrComLib)}catch(e){diag('CrComLib lookup error: '+e.message)}if(communicationStatus){var nativeBridge=window.CommunicationInterface,bridgeMethods=nativeBridge&&['bridgeSendBooleanToNative','bridgeSendIntegerToNative','bridgeSendStringToNative'].every(function(key){return typeof nativeBridge[key]==='function'});communicationStatus.textContent=['Mode: '+(window.__composerCommunicationMode||'UNKNOWN'),'Container: '+String(window.__composerRunsInContainer),'WebXPanel active: '+String(window.__composerWebXPanelActive),'Bootstrap ready: '+String(window.__composerCommunicationReady),'Native bridge: '+(bridgeMethods?'AVAILABLE':'MISSING'),'CrComLib: '+(lib?'AVAILABLE':'MISSING'),window.__composerWebXPanelError?'Error: '+window.__composerWebXPanelError:''].filter(Boolean).join('\\n')}diag('CrComLib: '+(lib?'AVAILABLE':'MISSING'));diag('User agent: '+navigator.userAgent);function mount(item){var root=document.querySelector('[data-instance="'+item.instance+'"]'),def=definitions[item.componentId];if(!root||!def)return;root.dataset.component=item.componentId;root.innerHTML='<style>'+def.styles+'</style>'+def.template;function publishAddress(type,signal,value){diag('Publish '+code(type)+' '+signal+' = '+value);if(lib&&signal)lib.publishEvent(code(type),String(signal),value)}function subscribeAddress(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}var signals={publish:function(key,value){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value){diag('Publish skipped: '+key+' has no binding');return}publishAddress(spec.type,binding.value,value)},subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,callback)},publishAddress:publishAddress,subscribeAddress:subscribeAddress,subscribeExact:subscribeAddress};def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});wireScrollReturn(root,root.closest('.widget,.scoped-widget')||root,{scrollReturnAxes:def.scrollAxes||[]},item.properties||{});appearance(root,item.properties||{});var visibility=optional[item.componentId],visibilityStyle=document.createElement('style');if(visibility){visibilityStyle.textContent=Object.keys(visibility).filter(function(key){var value=item.properties&&item.properties[key];return value===false||value===0||value==='0'||String(value).toLowerCase()==='false'}).map(function(key){return '[data-instance="'+item.instance+'"] '+visibility[key]+'{display:none!important}'}).join('');if(visibilityStyle.textContent)root.appendChild(visibilityStyle)}}window.addEventListener('message',function(e){if(e.data&&e.data.type==='crestron-local-page')show(e.data.page)});if(lib)pages.forEach(function(p){if(p.mode!=='none'&&p.signal)lib.subscribeState('b',String(p.signal),function(v){diag('Page feedback '+p.signal+' = '+v);if(v===true||v===1||v==='1')show(p.id)})});items.forEach(mount);show(${firstPage});})();`;
    const feedbackController = controller
        .replace(
          "(function(){var pages=",
          "(function(){var feedbackState=window.__composerFeedbackState instanceof Map?window.__composerFeedbackState:new Map;window.__composerFeedbackState=feedbackState;function subscribeRaw(type,signal,callback){var signalType=/^[bns]$/.test(String(type))?String(type):code(type),address=String(signal),key=signalType+':'+address,delivered=false,handler=function(value){delivered=true;feedbackState.set(key,value);diag('Feedback '+signalType+' '+address+' = '+JSON.stringify(value));callback(value)},result;if(!lib||!address)return;diag('Subscribe '+signalType+' '+address);result=lib.subscribeState(signalType,address,handler);if(!delivered&&feedbackState.has(key)){var retained=feedbackState.get(key);if(typeof queueMicrotask==='function')queueMicrotask(function(){callback(retained)});else Promise.resolve().then(function(){callback(retained)})}return typeof result==='function'&&result!==handler&&result!==callback?result:function(){}}window.__composerSubscribeFeedback=subscribeRaw;var pages=",
        )
        .replace(
          "function subscribeAddress(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}",
          "function subscribeAddress(type,signal,callback){return subscribeRaw(type,signal,callback)}",
        )
        .replace("subscribeExact:subscribeAddress", "subscribeExact:subscribeRaw")
        .replace(
          "if(lib)pages.forEach(function(p){if(p.mode!=='none'&&p.signal)lib.subscribeState('b',String(p.signal),function(v){diag('Page feedback '+p.signal+' = '+v);if(v===true||v===1||v==='1')show(p.id)})})",
          "if(lib)pages.forEach(function(p){if(p.mode!=='none'&&p.signal)subscribeRaw('digital',String(p.signal),function(v){diag('Page feedback '+p.signal+' = '+v);if(v===true||v===1||v==='1')show(p.id)})})",
        );
    const holdController = feedbackController.replace(
        "var signals={publish:function(key,value){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value){diag('Publish skipped: '+key+' has no binding');return}publishAddress(spec.type,binding.value,value)}",
        "var standardHold=def.hold?{active:false,completed:false,timer:0,duration:Math.max(100,Math.min(10000,(Number(item.properties&&item.properties.heldDuration)||1)*1000))}:null;function rawPublish(key,value){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value){diag('Publish skipped: '+key+' has no binding');return}publishAddress(spec.type,binding.value,value)}var signals={publish:function(key,value){if(standardHold&&key===def.hold.pressKey){var pressed=value===true||value===1||value==='1'||String(value).toLowerCase()==='true';if(pressed){if(standardHold.active)return;standardHold.active=true;standardHold.completed=false;clearTimeout(standardHold.timer);standardHold.timer=setTimeout(function(){if(!standardHold.active)return;standardHold.completed=true;rawPublish(def.hold.heldKey,true)},standardHold.duration)}else{if(!standardHold.active)return;standardHold.active=false;clearTimeout(standardHold.timer);standardHold.timer=0;if(standardHold.completed)rawPublish(def.hold.heldKey,false);else{rawPublish(def.hold.pressKey,true);rawPublish(def.hold.pressKey,false)}standardHold.completed=false}return}rawPublish(key,value)}",
      ),
      pointerRuntime = "function bindPrimaryPointer(element,handlers){var active=null,up,cancel;handlers=handlers||{};function nativeOff(e){e.preventDefault()}function down(e){if(active!==null||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();active=e.pointerId;try{if(element.setPointerCapture)element.setPointerCapture(e.pointerId)}catch(ignore){}if(handlers.down)handlers.down(e)}function finish(e,cancelled){if(active===null||e.pointerId!==active)return;e.preventDefault();var id=active;active=null;if(cancelled){if(handlers.cancel)handlers.cancel(e)}else if(handlers.up)handlers.up(e);try{if(element.hasPointerCapture&&element.hasPointerCapture(id))element.releasePointerCapture(id)}catch(ignore){}}function lost(e){if(active===null||e.pointerId!==active)return;active=null;if(handlers.cancel)handlers.cancel(e)}up=function(e){finish(e,false)};cancel=function(e){finish(e,true)};element.style.touchAction='none';element.style.webkitUserSelect='none';element.style.userSelect='none';element.addEventListener('pointerdown',down);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',lost);element.addEventListener('contextmenu',nativeOff);return function(){element.removeEventListener('pointerdown',down);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('lostpointercapture',lost);element.removeEventListener('contextmenu',nativeOff)}}",
      pointerController = holdController.replace("function show(id){", global.ComposerRuntime.bindPrimaryPointer.toString() + "function show(id){"),
      interactionRuntime =
        `var interactionItems=${JSON.stringify(interactionItems)};` +
        "function motion(c,reverse){c=c||{};var preset=c.preset||'fade',direction=c.direction||'left',move={left:'translateX(-48px)',right:'translateX(48px)',up:'translateY(-48px)',down:'translateY(48px)'},frames=preset==='slide'?[{opacity:0,transform:move[direction]},{opacity:1,transform:'translate(0,0)'}]:preset==='scale'?[{opacity:.35,transform:'scale(.72)'},{opacity:1,transform:'scale(1)'}]:preset==='glow'?[{filter:'drop-shadow(0 0 0 rgba(4,220,185,0))'},{filter:'drop-shadow(0 0 18px rgba(4,220,185,.95))'},{filter:'drop-shadow(0 0 0 rgba(4,220,185,0))'}]:preset==='press'?[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.94)',filter:'brightness(1.14)'}]:[{opacity:0},{opacity:1}];return reverse?frames.reverse():frames}" +
        "function play(root,c,reverse){if(!root||!c||c.trigger==='none')return;root.animate(motion(c,reverse),{duration:Math.max(50,Number(c.duration)||300),delay:reverse?0:Math.max(0,Number(c.start==null?c.delay:c.start)||0),easing:c.easing||'ease-out'})}" +
        "function particleBurst(root,c,e){var r=root.getBoundingClientRect(),x=e&&isFinite(e.clientX)?e.clientX-r.left:r.width/2,y=e&&isFinite(e.clientY)?e.clientY-r.top:r.height/2,d=Math.max(100,Number(c.effectDuration)||650),scale=Math.max(25,Number(c.effectSize)||125)/100,color=getComputedStyle(root).getPropertyValue('--glow-color').trim()||'#04dcb9',travel=Math.max(r.width,r.height)*.42*scale,layer=document.createElement('span');layer.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:9999';for(var i=0;i<28;i++){var angle=Math.random()*Math.PI*2,distance=travel*(.42+Math.random()*.58),dot=document.createElement('span'),dotSize=3+Math.random()*4;dot.style.cssText='position:absolute;left:'+x+'px;top:'+y+'px;width:'+dotSize+'px;height:'+dotSize+'px;margin:'+(-dotSize/2)+'px;border-radius:50%;background:'+color+';box-shadow:0 0 '+(dotSize*2)+'px '+color+';pointer-events:none';layer.appendChild(dot);dot.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(Math.cos(angle)*distance)+'px,'+(Math.sin(angle)*distance)+'px) scale(.15)',opacity:0}],{duration:d*(.72+Math.random()*.28),easing:'cubic-bezier(.1,.7,.2,1)'})}root.appendChild(layer);setTimeout(function(){layer.remove()},d+50)}" +
        "function realisticGlassCrack(root,c,e){var target=e&&e.target&&e.target.closest?e.target.closest('button,[role=button],.button,.btn'):null;if(!target||!root.contains(target))target=root.querySelector('button,[role=button],.button,.btn,.scoped-preview')||root;var r=target.getBoundingClientRect(),x=e&&isFinite(e.clientX)?Number(e.clientX)-r.left:r.width/2,y=e&&isFinite(e.clientY)?Number(e.clientY)-r.top:r.height/2,d=Math.max(180,Number(c.effectDuration)||650),s=Math.max(25,Number(c.effectSize)||125)/100,color=c.effectColor||'#eaf8ff',cv=document.createElement('canvas'),ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1)),ctx,count=16,spokes=[];cv.width=Math.max(1,Math.round(r.width*ratio));cv.height=Math.max(1,Math.round(r.height*ratio));cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:9999';ctx=cv.getContext('2d');ctx.scale(ratio,ratio);ctx.lineCap='round';ctx.lineJoin='round';function stroke(points,width,alpha){function draw(style,w,ox,oy){ctx.beginPath();for(var q=0;q<points.length;q++)q?ctx.lineTo(points[q].x+ox,points[q].y+oy):ctx.moveTo(points[q].x+ox,points[q].y+oy);ctx.strokeStyle=style;ctx.lineWidth=w;ctx.stroke()}draw('rgba(0,0,0,'+(alpha*.6)+')',width+.75,.55,.7);ctx.shadowColor=color;ctx.shadowBlur=1.1;draw(color,width,0,0);ctx.shadowBlur=0;draw('rgba(255,255,255,'+(alpha*.62)+')',Math.max(.22,width*.28),-.28,-.32)}var radius=Math.min(r.width,r.height)*.5*s;for(var i=0;i<count;i++){var a=i/count*Math.PI*2+(Math.random()-.5)*.19,len=radius*(.52+Math.random()*.56),steps=6+Math.floor(Math.random()*4),points=[{x:x,y:y}];for(var j=1;j<=steps;j++){var distance=len*j/steps,jitter=j===steps?0:(Math.random()-.5)*5.5;points.push({x:x+Math.cos(a)*distance+Math.cos(a+Math.PI/2)*jitter,y:y+Math.sin(a)*distance+Math.sin(a+Math.PI/2)*jitter})}spokes.push(points);stroke(points,.48+Math.random()*.5,.78+Math.random()*.2);if(i%2===0){var origin=points[3+Math.floor(Math.random()*Math.max(1,points.length-4))],ba=a+(Math.random()>.5?1:-1)*(.38+Math.random()*.42),bl=len*(.16+Math.random()*.18);stroke([origin,{x:origin.x+Math.cos(ba)*bl*.45+(Math.random()-.5)*3,y:origin.y+Math.sin(ba)*bl*.45+(Math.random()-.5)*3},{x:origin.x+Math.cos(ba)*bl,y:origin.y+Math.sin(ba)*bl}],.42,.72)}}[.16,.29,.43,.58].forEach(function(f,ri){for(var i=0;i<count;i++){if(Math.random()<.18+ri*.04)continue;var one=spokes[i],two=spokes[(i+1)%count],aa=one[Math.min(one.length-1,Math.max(1,Math.round((one.length-1)*f)))],bb=two[Math.min(two.length-1,Math.max(1,Math.round((two.length-1)*f)))];stroke([aa,{x:(aa.x+bb.x)/2+(Math.random()-.5)*4,y:(aa.y+bb.y)/2+(Math.random()-.5)*4},bb],.34,.5)}});ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(x,y,1.25,0,Math.PI*2);ctx.fill();target.appendChild(cv);cv.animate([{opacity:1},{opacity:.9,offset:.65},{opacity:0}],{duration:d,easing:'ease-out'});setTimeout(function(){cv.remove()},d+40)}" +
        "function glassCrack(root,c,e){var target=e&&e.target&&e.target.closest?e.target.closest('button,[role=button],.button,.btn'):null;if(!target||!root.contains(target))target=root.querySelector('button,[role=button],.button,.btn,.scoped-preview')||root;var r=target.getBoundingClientRect(),x=e&&isFinite(e.clientX)?Number(e.clientX)-r.left:r.width/2,y=e&&isFinite(e.clientY)?Number(e.clientY)-r.top:r.height/2,d=Math.max(180,Number(c.effectDuration)||650),s=Math.max(25,Number(c.effectSize)||125)/100,color=c.effectColor||'#eaf8ff',cv=document.createElement('canvas'),ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1)),ctx;cv.width=Math.max(1,Math.round(r.width*ratio));cv.height=Math.max(1,Math.round(r.height*ratio));cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:9999';ctx=cv.getContext('2d');ctx.scale(ratio,ratio);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=4;var radius=Math.min(r.width,r.height)*.48*s,count=13;for(var i=0;i<count;i++){var a=i/count*Math.PI*2+(Math.random()-.5)*.22,len=radius*(.55+Math.random()*.5),steps=5+Math.floor(Math.random()*4);ctx.lineWidth=.7+Math.random()*.8;ctx.beginPath();ctx.moveTo(x,y);for(var j=1;j<=steps;j++){var distance=len*j/steps,jitter=j===steps?0:(Math.random()-.5)*7;ctx.lineTo(x+Math.cos(a)*distance+Math.cos(a+Math.PI/2)*jitter,y+Math.sin(a)*distance+Math.sin(a+Math.PI/2)*jitter)}ctx.stroke()}target.appendChild(cv);cv.animate([{opacity:1},{opacity:.9,offset:.65},{opacity:0}],{duration:d,easing:'ease-out'});setTimeout(function(){cv.remove()},d+40)}function tracks(entry){return entry.interactions&&entry.interactions.length?entry.interactions:(entry.interaction?[entry.interaction]:[])}function pressFx(root,c,e){var kind=c&&c.pressEffect||'none';if(!root||kind==='none')return;if(kind==='glass-crack'){glassCrack(root,c,e);return}var r=root.getBoundingClientRect(),x=e&&isFinite(e.clientX)?e.clientX-r.left:r.width/2,y=e&&isFinite(e.clientY)?e.clientY-r.top:r.height/2,d=Math.max(100,Number(c.effectDuration)||650),s=Math.max(25,Number(c.effectSize)||125)/100,color=c.effectColor||'#04dcb9',layer=document.createElement('span'),count=kind==='wave'?3:2,size=Math.max(r.width,r.height)*2*s;layer.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:9999';for(var i=0;i<count;i++){var ring=document.createElement('span');ring.style.cssText='position:absolute;left:'+x+'px;top:'+y+'px;width:'+size+'px;height:'+size+'px;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%) scale(0);border:'+(kind==='water-ripple'?'2px solid '+color:'0')+';background:'+(kind==='wave'?color:'transparent')+';opacity:'+(kind==='wave'?'.24':'.9');layer.appendChild(ring);ring.animate([{transform:'translate(-50%,-50%) scale(0)',opacity:kind==='wave'?.28:.95},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:d,delay:i*Math.round(d*.16),easing:'ease-out'})}root.appendChild(layer);setTimeout(function(){layer.remove()},d+count*d*.16+40)}function targetRoot(entry,id){return document.querySelector('[data-instance=\"'+id+'\"]')||document.querySelector('[data-instance=\"'+id+'--'+entry.pageId+'\"]')}function actionValue(value,type){return type==='digital'?/^(true|1|on|yes)$/i.test(String(value)):type==='analog'?(Number(value)||0):String(value==null?'':value)}function conditionMatches(a,actual){var op=a.condition||'always',expected=a.compareValue,n=Number(actual),e=Number(expected),truth=actual===true||actual===1||actual==='1'||actual==='true';if(op==='always'||op==='changed')return true;if(op==='truthy')return truth;if(op==='falsy')return !truth;if(op==='equals')return String(actual)===String(expected);if(op==='not-equals')return String(actual)!==String(expected);if(op==='greater')return n>e;if(op==='greater-equal')return n>=e;if(op==='less')return n<e;if(op==='less-equal')return n<=e;return true}function executeAction(entry,a){var root=targetRoot(entry,a.target),v=String(a.value==null?'':a.value);if(a.type==='navigate'){show(a.target);return}if(a.type.indexOf('signal-')===0){var type=a.type.slice(7);if(lib&&a.target)lib.publishEvent(code(type),String(a.target),actionValue(v,type));return}if(!root)return;if(a.type==='show'||a.type==='hide')root.style.display=a.type==='hide'?'none':'block';else if(a.type==='animate'){var targetEntry=interactionItems.find(function(i){return i.instance===root.dataset.instance});if(targetEntry)tracks(targetEntry).forEach(function(c){play(root,c)})}else if(a.type==='text'){var nodes=root.querySelectorAll('[data-local-text],.label,.name,.note,.big,.btn-txt,.mic-label,.shade-name,button');if(nodes[0])nodes[0].textContent=v}else if(a.type==='property'){var at=v.indexOf('='),key=at<0?'local-text':v.slice(0,at).trim().replace(/[A-Z]/g,function(m){return '-'+m.toLowerCase()}),val=at<0?v:v.slice(at+1);root.style.setProperty('--'+key,val)}else if(a.type==='enable'||a.type==='disable'){root.style.pointerEvents=a.type==='disable'?'none':'';root.style.opacity=a.type==='disable'?'.45':''}else if(a.type==='select')root.classList.toggle('action-selected',actionValue(v||'true','digital'))}function runActions(entry,eventName,signal,eventValue){var at=0;(entry.actions||[]).filter(function(a){return a.event===eventName&&(!signal||a.triggerSignal===signal)&&conditionMatches(a,eventValue)}).forEach(function(a){var delay=Math.max(0,Number(a.delay)||0);if(a.timing==='after')at+=delay;setTimeout(function(){executeAction(entry,a)},a.timing==='after'?at:delay)})}function runInteraction(root,c,phase){if(!root||!c)return;if(phase==='press'&&c.trigger==='press')play(root,c);if(phase==='release'&&c.trigger==='release')play(root,c);if(phase==='release'&&c.trigger==='press'&&c.preset==='press')play(root,c,true)}function wireInteraction(entry){var root=document.querySelector('[data-instance=\"'+entry.instance+'\"]'),list=tracks(entry),hold=0;if(!root)return;list.forEach(function(c){if(c.trigger==='delayed')play(root,c)});if((entry.actions||[]).some(function(a){return a.event==='timer'}))runActions(entry,'timer');(entry.actions||[]).filter(function(a){return a.event==='signal-change'&&a.triggerSignal}).forEach(function(a){subscribeRaw(a.triggerType||'digital',String(a.triggerSignal),function(value){runActions(entry,'signal-change',a.triggerSignal,value)})});root.addEventListener('pointerdown',function(e){var fx=list.find(function(c){return c.pressEffect&&c.pressEffect!=='none'})||entry.interaction;pressFx(root,fx,e);list.forEach(function(c){runInteraction(root,c,'press')});runActions(entry,'press');clearTimeout(hold);hold=setTimeout(function(){runActions(entry,'hold')},600)});root.addEventListener('pointerup',function(){clearTimeout(hold);list.forEach(function(c){runInteraction(root,c,'release')});runActions(entry,'release')})}",
      originalShow =
        "function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});diag('Page: '+id)}",
      animatedShow =
        "function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});var page=document.getElementById(id),config=pages.find(function(p){return p.id===id});if(page&&config&&config.transition!=='none'){var preset=config.transition.indexOf('slide')===0?'slide':config.transition,direction=config.transition==='slide-right'?'right':'left';page.animate(motion({preset:preset,direction:direction}),{duration:config.transitionDuration||350,easing:'ease-out'})}interactionItems.forEach(function(entry){if(entry.pageId===id){tracks(entry).filter(function(c){return c.trigger==='page-enter'}).forEach(function(c){play(document.querySelector('[data-instance=\"'+entry.instance+'\"]'),c)});runActions(entry,'page-enter')}});diag('Page: '+id)}",
      layeredController = pointerController
        .replace("(function(){var feedbackState=", `(function(){${wireCipText.toString()};${wireItemVisibility.toString()};${global.ComposerRuntime.wireUniformScrollbars.toString()};${global.ComposerRuntime.wireScrollReturn.toString()};var feedbackState=`)
        .replace(
          "function mount(item){var root=document.querySelector('[data-instance=\"'+item.instance+'\"]'),def=definitions[item.componentId];",
          "function mount(item){var holder=document.querySelector('[data-instance=\"'+item.instance+'\"]'),root=holder&&holder.querySelector('.scoped-preview'),def=definitions[item.componentId];",
        ),
      animatedController = layeredController
        .replace(
          "signals:signals,navigate:show,options:",
          "signals:signals,interactions:{bindPrimaryPointer:bindPrimaryPointer},resolveComponent:function(id){return definitions[id]},navigate:show,options:",
        )
        .replace(
          "root.dataset.component=item.componentId;",
          "root.dataset.component=item.componentId;root.classList.toggle('composer-scroll-horizontal',(def.scrollAxes||[]).indexOf('horizontal')>=0);root.classList.toggle('composer-scroll-vertical',(def.scrollAxes||[]).indexOf('vertical')>=0);root.classList.toggle('wrap-text',item.properties&&(item.properties.wrapText===true||item.properties.wrapText===1||item.properties.wrapText==='1'||String(item.properties.wrapText).toLowerCase()==='true'));",
        )
        .replace(
          "function show(id){",
          interactionRuntime + "function show(id){",
        )
        .replace(
          "glassCrack(root,c,e);return",
          "realisticGlassCrack(root,c,e);return",
        )
        .replace(
          "function tracks(entry){",
          "function shakePress(root,c){var target=root.querySelector('.scoped-preview')||root,d=Math.max(100,Number(c.effectDuration)||650),s=Math.max(25,Number(c.effectSize)||125)/100,distance=Math.max(2,6*s);target.animate([{transform:'translateX(0)'},{transform:'translateX('+(-.65*distance)+'px)'},{transform:'translateX('+distance+'px)'},{transform:'translateX('+(-distance)+'px)'},{transform:'translateX('+(.72*distance)+'px)'},{transform:'translateX('+(-.42*distance)+'px)'},{transform:'translateX(0)'}],{duration:d,easing:'ease-out'})}function tracks(entry){",
        )
        .replace(
          "if(!root||kind==='none')return;",
          "if(!root||kind==='none')return;if(kind==='shake'){shakePress(root,c);return}",
        )
        .replaceAll(
          "var r=root.getBoundingClientRect(),x=",
          "var r=root.getBoundingClientRect(),host=root.closest('.page')||root.parentElement||root,hr=host.getBoundingClientRect(),sx=host.offsetWidth/hr.width||1,sy=host.offsetHeight/hr.height||1,x=",
        )
        .replaceAll(
          "e.clientX-r.left:r.width/2",
          "(e.clientX-hr.left)*sx:(r.left+r.width/2-hr.left)*sx",
        )
        .replaceAll(
          "e.clientY-r.top:r.height/2",
          "(e.clientY-hr.top)*sy:(r.top+r.height/2-hr.top)*sy",
        )
        .replace(
          "d=Math.max(100,Number(c.effectDuration)||650),scale=",
          "d=Math.max(100,Number(c.effectDuration)||650)*2.5,scale=",
        )
        .replaceAll("root.appendChild(layer)", "host.appendChild(layer)")
        .replace(
          ":preset==='press'?[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.94)',filter:'brightness(1.14)'}]:[{opacity:0},{opacity:1}]",
          ":preset==='press'?[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.94)',filter:'brightness(1.14)'}]:preset==='shake'?[{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(7px)'},{transform:'translateX(-7px)'},{transform:'translateX(5px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}]:[{opacity:0},{opacity:1}]",
        )
        .replace(
          "if(!root||kind==='none')return;var r=",
          "if(!root||kind==='none')return;if(kind==='particle-burst'){particleBurst(root,c,e);return}var r=",
        )
        .replace(
          "size=Math.max(r.width,r.height)*2*s",
          "size=Math.max(r.width,r.height)*1.15*s",
        )
        .replace(
          "overflow:hidden;pointer-events:none;border-radius:inherit;z-index:9999",
          "overflow:visible;pointer-events:none;border-radius:inherit;z-index:9999",
        )
        .replace(
          "root.innerHTML='<style>'+def.styles+'</style>'+def.template;",
          "root.innerHTML='<style>'+(item.stylesOverride||def.styles)+'</style>'+(item.templateOverride||def.template);",
        )
        .replace(
          "subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,callback)}",
          "subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key],handler=key==='selected'?function(value){holder.dataset.assetSelected=value===true||value===1||value==='1'?'true':'false';callback(value)}:callback;if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,handler)}",
        )
        .replace(originalShow, animatedShow)
        .replace(
          "items.forEach(mount);show(",
          "items.forEach(mount);interactionItems.forEach(wireInteraction);show(",
        )
        .replace(
          "subscribeExact:subscribeAddress",
          "subscribeExact:function(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}",
        )
        .replace(
          "def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});wireScrollReturn(root,root.closest('.widget,.scoped-widget')||root,{scrollReturnAxes:def.scrollAxes||[]},item.properties||{});appearance(root,item.properties||{})",
          "try{def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});wireItemVisibility(root,def,item.properties||{},signals)}catch(error){diag('Component '+item.componentId+' failed: '+error.message);root.innerHTML='<div style=\"height:100%;padding:12px;border:1px solid #a65050;background:#291718;color:#ffc1c1;overflow:auto\"></div>';root.firstChild.textContent='Component error: '+(error.message||error)}wireCipText(root,signals);wireScrollReturn(root,holder||root,{scrollReturnAxes:def.scrollAxes||[]},item.properties||{});appearance(root,item.properties||{})",
        )
        .replace(
          "window.addEventListener('message',function(e){",
          "window.addEventListener('message',function(e){if(e.data&&e.data.type==='composer-interaction'){var root=Array.prototype.find.call(document.querySelectorAll('[data-instance]'),function(el){return el.contentWindow===e.source||(el.querySelector&&el.querySelector('iframe')&&el.querySelector('iframe').contentWindow===e.source)}),entry=root&&interactionItems.find(function(item){return item.instance===root.dataset.instance});if(entry){tracks(entry).forEach(function(c){runInteraction(root,c,e.data.phase)});runActions(entry,e.data.phase)}}",
        );
    const contractController = animatedController
        .replace(
          "function appearance(root,p){",
          "function standardAttribute(type,direction,value){var normalized=String(value||'').replace(/[^A-Za-z0-9_]/g,'_');if(/^(?:Visibility|Disabled)$/i.test(normalized))return /^Visibility$/i.test(normalized)?'Visibility':'Disabled';var suffix=type==='digital'?(direction==='output'?'Press':'Selected'):type==='analog'?(direction==='output'?'ValueSet':'Feedback'):(direction==='output'?'Text':'Name'),pattern=type==='digital'?/(?:_?(?:Press|Selected|Feedback|Value|Button|Btn))$/i:type==='analog'?(direction==='output'?/(?:_?(?:ValueSet|LevelSet|PositionSet|Set|Value))$/i:/(?:_?(?:Feedback|LevelValue|PositionValue|Value|Level))$/i):/(?:_?(?:IndirectText|Label|Name|Text))$/i,prefix=normalized.replace(/_+/g,'_').replace(/^_+|_+$/g,'').replace(pattern,'').replace(/_+$/g,'');if(/^(?:Level|Value|Position|Selected|Indirect|Signal)$/i.test(prefix))prefix='';return prefix+suffix}function contractAddress(value,type,direction,prefix){var address=String(value||'').replace(/^(.*)\\.(\\d+)\\.(.+)$/,function(_,prefix,index,attribute){return prefix+'['+Math.max(0,Number(index)-1)+'].'+attribute.replace(/\\./g,'_')}),array=address.match(/^([A-Za-z_][A-Za-z0-9_.]*\\[\\d+\\])\\.([A-Za-z0-9_.]+)$/),structured=array?array[1]+'.'+array[2].replace(/\\./g,'_'):'',parts=address.split('.');if(!structured)structured=parts.length>2?parts[0]+'.'+parts.slice(1).join('_'):address;if(prefix&&structured.indexOf('.')>=0)structured=prefix+'.'+(structured.indexOf('[')>=0?structured.slice(structured.indexOf('.')+1):address.split('.').pop());var separator=structured.lastIndexOf('.');return separator<0||!type||!direction?structured:structured.slice(0,separator)+'.'+standardAttribute(type,direction,structured.slice(separator+1))}function appearance(root,p){",
        )
        .replace(
          "function publishAddress(type,signal,value){",
          "function publishAddress(type,signal,value){signal=contractAddress(signal,type,'output',item.contractPrefix);",
        )
        .replace(
          "function subscribeAddress(type,signal,callback){",
          "function subscribeAddress(type,signal,callback){signal=contractAddress(signal,type,'input',item.contractPrefix);",
        )
        .replace(
          "properties:item.properties||{},definitionData:def.data||{}",
          "properties:item.properties||{},contractPrefix:item.contractPrefix||'',definitionData:def.data||{}",
        )
        .replace(
          "def.mount(root,{signals:signals",
          "if(item.properties.visibilityEnabled){root.style.visibility='visible';signals.subscribe('visibility',function(value){root.style.visibility=value===true||value===1||value==='1'?'visible':'hidden'})}if(item.properties.disabledEnabled){root.classList.remove('composer-disabled');root.removeAttribute('aria-disabled');signals.subscribe('disabled',function(value){var disabled=value===true||value===1||value==='1';root.classList.toggle('composer-disabled',disabled);root.setAttribute('aria-disabled',String(disabled));root.style.pointerEvents=disabled?'none':'';root.style.opacity=disabled?'.55':''})}def.mount(root,{signals:signals",
        ),
      restoredController = contractController
        .replaceAll(
          "signals:signals,navigate:show",
          "signals:signals,interactions:{bindPrimaryPointer:bindPrimaryPointer},navigate:show",
        )
        .replace(
          "function appearance(root,p){",
          "function appearance(root,p){return;",
        )
        .replace("Number(index)-1", "Number(index)")
        .replace(
          "if(prefix&&structured.indexOf('.')>=0)",
          "var legacyCollection=structured.match(/^[A-Za-z_][A-Za-z0-9_]*_([A-Za-z][A-Za-z0-9_]*)(\\[\\d+\\])\\.([A-Za-z0-9_.]+)$/);if(prefix&&legacyCollection){structured=prefix+'.'+legacyCollection[1]+legacyCollection[2]+'.'+legacyCollection[3];prefix=''}if(prefix&&structured.indexOf('.')>=0)",
        ),
      safeController = restoredController.replace(/<\/script/gi, "<\\/script");
    const subpageVisibilityConfigs = (project.subpages || []).flatMap((entry) =>
      outputPages.filter((page) => page.id !== entry.sourcePageId && !(entry.excludedPages || []).includes(page.id) && (!entry.includedPages?.length || entry.includedPages.includes(page.id))).map((page) => {
        const resolved = resolveSubpage(entry, page.id);
        return resolved.visibilityEnabled && resolved.visibility ? { id: entry.id, pageId: page.id, signal: resolved.visibility } : null;
      }).filter(Boolean));
    const subpageVisibilityRuntime = `(function(){var configs=${JSON.stringify(subpageVisibilityConfigs)};var lib=null;try{lib=window.CrComLib||(window.parent&&window.parent.CrComLib)}catch(e){};if(!lib)return;var subscribe=window.__composerSubscribeFeedback||function(type,signal,callback){return lib.subscribeState(type==='digital'?'b':type==='analog'?'n':'s',String(signal),callback)};configs.forEach(function(config){subscribe('digital',String(config.signal),function(value){var visible=value===true||value===1||value==='1';document.querySelectorAll('[data-subpage="'+config.id+'"][data-subpage-page="'+config.pageId+'"]').forEach(function(element){element.style.visibility=visible?'visible':'hidden'})})})})();`;
    const communicationBootstrap = `(async function startComposerCommunication(){try{var bundle=window.WebXPanel;if(!bundle||typeof bundle.getWebXPanel!=='function')throw new Error('WebXPanel runtime did not load');var inContainer=typeof bundle.runsInContainerApp==='function'&&bundle.runsInContainerApp();var api=bundle.getWebXPanel(!inContainer),panel=api.WebXPanel&&(api.WebXPanel.default||api.WebXPanel);window.__composerWebXPanel=api;window.__composerRunsInContainer=inContainer;window.__composerWebXPanelActive=!!api.isActive;window.__composerCommunicationMode=inContainer?'CH5 Desktop native container':(api.isActive?'Web XPanel':'touch panel');if(!inContainer&&api.isActive&&panel&&typeof panel.initialize==='function'){var params={},search=new URLSearchParams(window.location.search),saved={};search.forEach(function(value,key){params[String(key).toLowerCase()]=value});try{var response=await fetch('assets/data/project-config.json',{cache:'no-store'});if(response.ok){var projectConfig=await response.json();saved=projectConfig&&projectConfig.config&&projectConfig.config.controlSystem||{};}}catch(configError){console.warn('[Composer communication] Project configuration could not be read:',configError);}var configuration={ipId:params.ipid||saved.ipId||'0x03'},host=params.host||saved.host||'';if(host)configuration.host=host;if(params.port||saved.port)configuration.port=Number(params.port||saved.port);if(params.roomid||saved.roomId)configuration.roomId=params.roomid||saved.roomId;if(params.tokensource||saved.tokenSource)configuration.tokenSource=params.tokensource||saved.tokenSource;if(params.tokenurl||saved.tokenUrl)configuration.tokenUrl=params.tokenurl||saved.tokenUrl;if(params.authtoken||saved.authToken)configuration.authToken=params.authtoken||saved.authToken;window.__composerWebXPanelConfiguration=configuration;panel.initialize(configuration);}if(panel&&api.WebXPanelEvents&&typeof panel.addEventListener==='function'){Object.keys(api.WebXPanelEvents).forEach(function(key){var eventName=api.WebXPanelEvents[key];panel.addEventListener(eventName,function(event){var detail=event&&event.detail||null;window.__composerWebXPanelLastEvent={name:key,detail:detail,time:new Date().toISOString()};console.log('[WebXPanel]',key,detail||'');if(key==='NOT_AUTHORIZED'&&detail&&detail.redirectTo){window.__composerAuthenticationRedirect=detail.redirectTo;setTimeout(function(){window.location.replace(detail.redirectTo)},3000);}});});}window.__composerCommunicationReady=true;console.log('[Composer communication]',window.__composerCommunicationMode,window.__composerWebXPanelConfiguration||'');}catch(error){window.__composerCommunicationReady=false;window.__composerWebXPanelError=String(error&&error.message||error);console.error('CH5 communication initialization failed:',error);}})();`;
    return `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent!important;-webkit-touch-callout:none;scrollbar-width:thin;scrollbar-color:rgba(112,112,112,.76) rgba(42,42,42,.38)}*::-webkit-scrollbar{width:7px;height:7px}*::-webkit-scrollbar-track{border-radius:999px;background:rgba(42,42,42,.38)}*::-webkit-scrollbar-thumb{min-width:36px;min-height:36px;border:0;border-radius:999px;background:rgba(112,112,112,.76)}*::-webkit-scrollbar-thumb:hover{background:rgba(142,142,142,.88)}*::-webkit-scrollbar-button,*::-webkit-scrollbar-button:single-button,*::-webkit-scrollbar-button:horizontal:decrement,*::-webkit-scrollbar-button:horizontal:increment,*::-webkit-scrollbar-button:vertical:decrement,*::-webkit-scrollbar-button:vertical:increment,*::-webkit-scrollbar-button:start:decrement,*::-webkit-scrollbar-button:end:increment{display:none!important;width:0!important;height:0!important;min-width:0!important;min-height:0!important;border:0!important;background:transparent!important;-webkit-appearance:none!important}*::-webkit-scrollbar-corner{background:transparent}[data-component] :focus,.scoped-widget :focus{outline:none!important}.page{display:none;position:relative;width:${project.width}px;height:${project.height}px;overflow:hidden}.page.active{display:block}.scoped-preview{display:block;width:100%;height:100%;min-width:0;min-height:0}.widget-asset-overlay-selected{display:none}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.widget-asset-overlay-normal{display:none}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.widget-asset-overlay-selected{display:block}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"][data-graphic-mode="background"]{background-image:var(--selected-graphic-url)!important}#ch5-diagnostics{position:fixed;top:30px;right:30px;z-index:999999;width:920px;max-height:620px;padding:18px;border:2px solid #24d5b8;border-radius:10px;background:rgba(0,0,0,.88);color:#fff;font:22px/1.35 Consolas,monospace;pointer-events:none}#ch5-diagnostics strong{display:block;color:#55f2d7;pointer-events:auto;touch-action:manipulation}#ch5-communication-status{margin:10px 0;padding:10px;border:1px solid #55f2d7;color:#fff;white-space:pre-wrap}#ch5-diagnostic-log{height:360px;margin:10px 0 0;overflow:auto;color:#d8fffa;white-space:pre-wrap}</style><style id="composer-component-styles">${componentCss}</style><script src="ch5-webxpanel.js"><\/script><script>${communicationBootstrap}<\/script><script src="cr-com-lib.js"><\/script></head><body>${pages}${diagnosticMarkup}<script>${safeController};${subpageVisibilityRuntime}<\/script></body></html>`;
  }
  global.ComposerExporter = { exportProject };
})(window);
