(function (runtime) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const DOT_POINTS = [
    [50, 50], [150, 50], [250, 50],
    [50, 150], [150, 150], [250, 150],
    [50, 250], [150, 250], [250, 250],
  ];

  runtime.register({
    id: "pattern-lock",
    name: "Pattern Lock",
    category: "Text & Input",
    defaultSize: { width: 420, height: 420 },
    signals: [
      { key: "pattern", name: "Pattern drawn", type: "serial", direction: "output", defaultValue: "PatternLock.Pattern" },
      { key: "reference", name: "Pattern reference", type: "serial", direction: "input", defaultValue: "PatternLock.Reference" },
      { key: "setPattern", name: "Set pattern", type: "digital", direction: "input", defaultValue: "PatternLock.SetPattern" },
      { key: "clearPattern", name: "Clear pattern", type: "digital", direction: "input", defaultValue: "PatternLock.ClearPattern" },
      { key: "viewPattern", name: "View pattern", type: "digital", direction: "input", defaultValue: "PatternLock.ViewPattern" },
      { key: "entered", name: "Pattern entered", type: "digital", direction: "output", defaultValue: "PatternLock.Entered" },
      { key: "passwordCorrect", name: "Password correct", type: "digital", direction: "output", defaultValue: "PatternLock.PasswordCorrect" },
    ],
    data: { SVG_NS, DOT_POINTS },
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "gridColor", name: "Background color", type: "color", defaultValue: "#20242c" },
      { key: "dotColor", name: "Dot idle color", type: "color", defaultValue: "#4a5058" },
      { key: "activeColor", name: "Dot active color", type: "color", defaultValue: "#88b3ed" },
      { key: "matchedColor", name: "Dot matched color", type: "color", defaultValue: "#22c55e" },
      { key: "errorColor", name: "Dot error color", type: "color", defaultValue: "#dc2626" },
      { key: "lineColor", name: "Connecting line color", type: "color", defaultValue: "#88b3ed" },
      { key: "dotRadius", name: "Dot radius", type: "number", min: 6, max: 30, defaultValue: 14 },
      { key: "lineWidth", name: "Line width", type: "number", min: 2, max: 20, defaultValue: 8 },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 80, defaultValue: 24 },
      { key: "holdDuration", name: "Hold pattern after release (ms)", type: "number", min: 300, max: 6000, defaultValue: 1500 },
    ],
    template: '<div class="ptl-stage"><svg class="ptl-svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet"><g class="ptl-lines"></g><g class="ptl-dots"></g></svg></div>',
    styles: '[data-component="pattern-lock"],[data-component="pattern-lock"] *{box-sizing:border-box}[data-component="pattern-lock"]{display:block;width:100%;height:100%}[data-component="pattern-lock"] .ptl-stage{position:relative;width:100%;height:100%;border-radius:var(--corner-radius-px);background:var(--bg-color);overflow:hidden}[data-component="pattern-lock"] .ptl-svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;-webkit-tap-highlight-color:transparent}[data-component="pattern-lock"] .ptl-segment{stroke:var(--line-color);stroke-width:var(--line-width);stroke-linecap:round;pointer-events:none}[data-component="pattern-lock"] .ptl-live{opacity:.55}[data-component="pattern-lock"] .ptl-dot{fill:var(--dot-color);transition:fill .15s ease}[data-component="pattern-lock"] .ptl-dot.active{fill:var(--active-color)}[data-component="pattern-lock"] .ptl-dot.matched{fill:var(--matched-color)}[data-component="pattern-lock"] .ptl-dot.error{fill:var(--error-color)}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {}, dotPoints = data.DOT_POINTS || [];
      const stage = root.querySelector(".ptl-stage"), svg = root.querySelector(".ptl-svg"), linesGroup = root.querySelector(".ptl-lines"), dotsGroup = root.querySelector(".ptl-dots");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";

      stage.style.setProperty("--bg-color", p.gridColor || "#20242c");
      stage.style.setProperty("--dot-color", p.dotColor || "#4a5058");
      stage.style.setProperty("--active-color", p.activeColor || "#88b3ed");
      stage.style.setProperty("--matched-color", p.matchedColor || "#22c55e");
      stage.style.setProperty("--error-color", p.errorColor || "#dc2626");
      stage.style.setProperty("--line-color", p.lineColor || "#88b3ed");
      stage.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 24)}px`);

      const dotRadius = Math.max(4, Number(p.dotRadius ?? 14)), lineWidth = Math.max(1, Number(p.lineWidth ?? 8)), hitRadius = Math.max(dotRadius * 2, 40), holdDuration = Math.max(200, Number(p.holdDuration ?? 1500));
      stage.style.setProperty("--line-width", String(lineWidth));

      dotsGroup.innerHTML = ""; linesGroup.innerHTML = "";
      const dotEls = dotPoints.map(([cx, cy]) => {
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", cx); circle.setAttribute("cy", cy); circle.setAttribute("r", dotRadius);
        circle.setAttribute("class", "ptl-dot");
        dotsGroup.appendChild(circle);
        return circle;
      });

      let drawing = false, patternIndices = [], liveLine = null, resetTimer = 0, referencePattern = "", lastDrawnValue = "", viewing = false, lastSetPatternValue = false, lastClearPatternValue = false;

      const toSvgPoint = (clientX, clientY) => {
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const point = svg.createSVGPoint();
        point.x = clientX; point.y = clientY;
        const transformed = point.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
      };
      const nearestDotIndex = pt => {
        let best = -1, bestDist = Infinity;
        dotPoints.forEach(([cx, cy], index) => {
          const dx = pt.x - cx, dy = pt.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) { bestDist = dist; best = index; }
        });
        return bestDist <= hitRadius ? best : -1;
      };
      const addSegment = (x1, y1, x2, y2, className) => {
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("class", className || "ptl-segment");
        linesGroup.appendChild(line);
        return line;
      };
      const clearVisuals = () => { linesGroup.innerHTML = ""; liveLine = null; dotEls.forEach(dot => dot.classList.remove("active", "matched", "error")); };
      const renderStaticPattern = indices => {
        clearVisuals();
        indices.forEach((dotIndex, order) => {
          dotEls[dotIndex].classList.add("active");
          if (order > 0) {
            const [x1, y1] = dotPoints[indices[order - 1]], [x2, y2] = dotPoints[dotIndex];
            addSegment(x1, y1, x2, y2);
          }
        });
      };
      const publishPattern = indices => {
        const value = indices.map(i => String(i + 1)).join("");
        context.signals.publish("pattern", value);
        lastDrawnValue = value;
        return value;
      };
      const updateIdleDisplay = () => {
        if (drawing) return;
        if (viewing && referencePattern) {
          const indices = referencePattern.split("").map(ch => Number(ch) - 1).filter(i => i >= 0 && i <= 8);
          if (indices.length) { renderStaticPattern(indices); return; }
        }
        clearVisuals();
      };

      const pulseTimers = new Set();
      const pulse = key => {
        context.signals.publish(key, true);
        const timer = setTimeout(() => {
          pulseTimers.delete(timer);
          context.signals.publish(key, false);
        }, 100);
        pulseTimers.add(timer);
      };

      const down = event => {
        const hit = nearestDotIndex(toSvgPoint(event.clientX, event.clientY));
        if (hit < 0) return;
        if (resetTimer) { clearTimeout(resetTimer); resetTimer = 0; }
        clearVisuals();
        drawing = true;
        patternIndices = [hit];
        dotEls[hit].classList.add("active");
        publishPattern(patternIndices);
        svg.setPointerCapture(event.pointerId);
        event.preventDefault();
      };
      const move = event => {
        if (!drawing) return;
        const pt = toSvgPoint(event.clientX, event.clientY), hit = nearestDotIndex(pt);
        if (hit >= 0 && !patternIndices.includes(hit)) {
          const [x1, y1] = dotPoints[patternIndices[patternIndices.length - 1]], [x2, y2] = dotPoints[hit];
          addSegment(x1, y1, x2, y2);
          patternIndices.push(hit);
          dotEls[hit].classList.add("active");
          publishPattern(patternIndices);
        }
        const [lx, ly] = dotPoints[patternIndices[patternIndices.length - 1]];
        if (!liveLine) liveLine = addSegment(lx, ly, pt.x, pt.y, "ptl-segment ptl-live");
        else { liveLine.setAttribute("x1", lx); liveLine.setAttribute("y1", ly); liveLine.setAttribute("x2", pt.x); liveLine.setAttribute("y2", pt.y); }
      };
      const up = event => {
        if (!drawing) return;
        drawing = false;
        try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
        if (liveLine) { liveLine.remove(); liveLine = null; }
        const value = publishPattern(patternIndices);
        pulse("entered");

        if (patternIndices.length && referencePattern) {
          const matched = value === referencePattern;
          patternIndices.forEach(i => dotEls[i].classList.add(matched ? "matched" : "error"));
          if (matched) {
            pulse("passwordCorrect");
          }
        }

        resetTimer = setTimeout(() => { patternIndices = []; updateIdleDisplay(); resetTimer = 0; }, holdDuration);
      };
      const cancel = event => { drawing = false; try { svg.releasePointerCapture(event.pointerId); } catch (_) {} if (liveLine) { liveLine.remove(); liveLine = null; } };

      svg.addEventListener("pointerdown", down);
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerup", up);
      svg.addEventListener("pointercancel", cancel);

      context.signals.subscribe("reference", value => {
        referencePattern = String(value || "");
        if (!drawing) {
          if (resetTimer) { clearTimeout(resetTimer); resetTimer = 0; }
          updateIdleDisplay();
        }
      });
      context.signals.subscribe("setPattern", value => {
        const next = truthy(value);
        if (next && !lastSetPatternValue && lastDrawnValue) {
          referencePattern = lastDrawnValue;
          if (!drawing) updateIdleDisplay();
        }
        lastSetPatternValue = next;
      });
      context.signals.subscribe("clearPattern", value => {
        const next = truthy(value);
        if (next && !lastClearPatternValue) {
          referencePattern = "";
          lastDrawnValue = "";
          if (resetTimer) { clearTimeout(resetTimer); resetTimer = 0; }
          patternIndices = [];
          if (!drawing) updateIdleDisplay();
        }
        lastClearPatternValue = next;
      });
      context.signals.subscribe("viewPattern", value => {
        viewing = truthy(value);
        updateIdleDisplay();
      });

      return () => {
        if (resetTimer) clearTimeout(resetTimer);
        pulseTimers.forEach(timer => clearTimeout(timer));
        pulseTimers.clear();
        svg.removeEventListener("pointerdown", down);
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", up);
        svg.removeEventListener("pointercancel", cancel);
      };
    },
  });
})(window.ComposerRuntime);
