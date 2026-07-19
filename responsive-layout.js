(function (global) {
  "use strict";
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  function adaptRect(rect, fromSize, toSize, options = {}) {
    const fromW = Math.max(1, num(fromSize.width, 1)), fromH = Math.max(1, num(fromSize.height, 1)),
      toW = Math.max(1, num(toSize.width, fromW)), toH = Math.max(1, num(toSize.height, fromH)),
      sx = toW / fromW, sy = toH / fromH, proportional = options.scaleMode === "proportional";
    let w = Math.max(20, num(rect.w, 20) * (proportional ? sx : 1)),
      h = Math.max(20, num(rect.h, 20) * (proportional ? sy : 1)), x, y;
    const right = fromW - num(rect.x) - num(rect.w), bottom = fromH - num(rect.y) - num(rect.h),
      offsetX = num(rect.x) + num(rect.w) / 2 - fromW / 2,
      offsetY = num(rect.y) + num(rect.h) / 2 - fromH / 2;
    if (options.anchorX === "right") x = toW - right * (proportional ? sx : 1) - w;
    else if (options.anchorX === "center") x = toW / 2 + offsetX * (proportional ? sx : 1) - w / 2;
    else if (options.anchorX === "stretch") { x = num(rect.x); w = Math.max(20, toW - x - right); }
    else x = num(rect.x) * (proportional ? sx : 1);
    if (options.anchorY === "bottom") y = toH - bottom * (proportional ? sy : 1) - h;
    else if (options.anchorY === "center") y = toH / 2 + offsetY * (proportional ? sy : 1) - h / 2;
    else if (options.anchorY === "stretch") { y = num(rect.y); h = Math.max(20, toH - y - bottom); }
    else y = num(rect.y) * (proportional ? sy : 1);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }
  function fitsSafeArea(rect, panel, margin = 0) {
    margin = Math.max(0, num(margin));
    return num(rect.x) >= margin && num(rect.y) >= margin &&
      num(rect.x) + num(rect.w) <= num(panel.width) - margin &&
      num(rect.y) + num(rect.h) <= num(panel.height) - margin;
  }
  global.ComposerResponsiveLayout = { adaptRect, fitsSafeArea };
})(typeof window === "undefined" ? globalThis : window);
