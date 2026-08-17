(function (runtime) {
  "use strict";

  const MAX_ROWS_CAP = 15, MAX_COLUMNS_CAP = 10;

  const rowCellProperties = [];
  for (let i = 0; i < MAX_ROWS_CAP; i++) {
    rowCellProperties.push(
      { key: `row${i}CellBase`, name: `Row ${i + 1} cell value base / pattern`, type: "text", defaultValue: `DynamicTable.Row${i + 1}.Cells.{index}.Label`, signalSetting: true, visibleWhen: { key: "defaultRows", gte: i + 1 }, group: `Row ${i + 1}` },
      { key: `row${i}CellIncrement`, name: `Row ${i + 1} cell join increment`, type: "number", defaultValue: 1, signalSetting: true, visibleWhen: { key: "defaultRows", gte: i + 1 }, group: `Row ${i + 1}` },
    );
  }

  runtime.register({
    id: "dynamic-table",
    name: "Dynamic Table",
    category: "Text & Input",
    defaultSize: { width: 640, height: 420 },
    signals: [
      { key: "rowsInput", name: "Rows (set)", type: "analog", direction: "input", defaultValue: "DynamicTable.RowsSet" },
      { key: "colsInput", name: "Columns (set)", type: "analog", direction: "input", defaultValue: "DynamicTable.ColsSet" },
      { key: "rowsFeedback", name: "Rows (feedback)", type: "analog", direction: "output", defaultValue: "DynamicTable.RowsFeedback" },
      { key: "colsFeedback", name: "Columns (feedback)", type: "analog", direction: "output", defaultValue: "DynamicTable.ColsFeedback" },
    ],
    dynamicRangeBindings(properties) {
      const rows = Math.max(1, Math.min(MAX_ROWS_CAP, Number(properties.defaultRows) || 3)),
        bindings = [
          { name: "Serial column name range", type: "serial", direction: "input", baseKey: "columnNameBase", incrementKey: "columnNameIncrement", countKey: "defaultCols" },
          { name: "Serial row name range", type: "serial", direction: "input", baseKey: "rowNameBase", incrementKey: "rowNameIncrement", countKey: "defaultRows" },
        ];
      for (let i = 0; i < rows; i++)
        bindings.push({ name: `Row ${i + 1} cell value range`, type: "serial", direction: "input", baseKey: `row${i}CellBase`, incrementKey: `row${i}CellIncrement`, countKey: "defaultCols" });
      return bindings;
    },
    data: { MAX_ROWS_CAP, MAX_COLUMNS_CAP },
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "defaultRows", name: "Rows", type: "number", min: 1, max: MAX_ROWS_CAP, defaultValue: 3 },
      { key: "defaultCols", name: "Columns", type: "number", min: 1, max: MAX_COLUMNS_CAP, defaultValue: 3 },
      { key: "showControls", name: "Show rows / columns / create controls", type: "checkbox", defaultValue: true },
      { key: "columnNameBase", name: "Column name base / pattern", type: "text", defaultValue: "DynamicTable.Columns.{index}.Label", signalSetting: true },
      { key: "columnNameIncrement", name: "Column name join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "rowNameBase", name: "Row name base / pattern", type: "text", defaultValue: "DynamicTable.Rows.{index}.Label", signalSetting: true },
      { key: "rowNameIncrement", name: "Row name join increment", type: "number", defaultValue: 1, signalSetting: true },
      ...rowCellProperties,
      { key: "cardColor", name: "Card background color", type: "color", defaultValue: "#20242c" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#3a4048" },
      { key: "accentColor", name: "Accent / button color", type: "color", defaultValue: "#04aa8e" },
      { key: "accentTextColor", name: "Accent text color", type: "color", defaultValue: "#0b1210" },
      { key: "headerColor", name: "Header cell background", type: "color", defaultValue: "#2c3038" },
      { key: "rowNameColor", name: "Row name cell background", type: "color", defaultValue: "#2c3038" },
      { key: "cellColor", name: "Value cell background", type: "color", defaultValue: "#171a20" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "textSize", name: "Cell text size", type: "number", min: 8, max: 28, defaultValue: 13 },
      { key: "cornerRadius", name: "Card corner radius", type: "number", min: 0, max: 40, defaultValue: 12 },
    ],
    template: '<div class="dtb-card"><div class="dtb-controls"><label class="dtb-field"><span>Rows</span><input type="number" class="dtb-rows-input" min="0" placeholder="Rows"></label><label class="dtb-field"><span>Columns</span><input type="number" class="dtb-cols-input" min="0" placeholder="Columns"></label><button type="button" class="dtb-create">Create</button></div><div class="dtb-hint"></div><div class="dtb-scroll"><div class="dtb-grid"></div></div></div>',
    styles: '[data-component="dynamic-table"],[data-component="dynamic-table"] *{box-sizing:border-box}[data-component="dynamic-table"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="dynamic-table"] .dtb-card{display:flex;flex-direction:column;width:100%;height:100%;padding:14px;border-radius:var(--corner-radius-px);border:1px solid var(--border-color);background:var(--card-color);gap:10px;overflow:hidden}[data-component="dynamic-table"] .dtb-controls{display:flex;align-items:flex-end;gap:14px;flex:none}[data-component="dynamic-table"] .dtb-controls.hidden{display:none}[data-component="dynamic-table"] .dtb-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-color)}[data-component="dynamic-table"] .dtb-field input{width:90px;height:34px;padding:0 10px;border-radius:6px;border:1px solid var(--border-color);background:#12151a;color:var(--text-color);font-size:13px}[data-component="dynamic-table"] .dtb-create{height:34px;padding:0 18px;border:0;border-radius:6px;background:var(--accent-color);color:var(--accent-text-color);font-weight:700;cursor:pointer}[data-component="dynamic-table"] .dtb-create:active{filter:brightness(.92)}[data-component="dynamic-table"] .dtb-hint{flex:none;min-height:0;color:#f87171;font-size:12px;display:none}[data-component="dynamic-table"] .dtb-hint.visible{display:block}[data-component="dynamic-table"] .dtb-scroll{flex:1 1 auto;min-height:0;overflow:auto}[data-component="dynamic-table"] .dtb-grid{display:grid;grid-template-columns:minmax(80px,auto) repeat(var(--cols,0),minmax(90px,1fr));gap:1px;background:var(--border-color);width:fit-content;min-width:100%}[data-component="dynamic-table"] .dtb-cell{margin:0;padding:0 8px;height:36px;border:0;background:var(--cell-color);color:var(--text-color);font-size:var(--text-size-px);font-family:inherit;outline:none}[data-component="dynamic-table"] .dtb-corner{background:var(--header-color)}[data-component="dynamic-table"] .dtb-header{background:var(--header-color);font-weight:700}[data-component="dynamic-table"] .dtb-row-name{background:var(--row-name-color);font-weight:700}[data-component="dynamic-table"] .dtb-value::placeholder,[data-component="dynamic-table"] .dtb-header::placeholder,[data-component="dynamic-table"] .dtb-row-name::placeholder{color:#6b7280}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {};
      const maxRowsCap = data.MAX_ROWS_CAP || MAX_ROWS_CAP, maxColsCap = data.MAX_COLUMNS_CAP || MAX_COLUMNS_CAP;
      const card = root.querySelector(".dtb-card"), controls = root.querySelector(".dtb-controls"), rowsInputEl = root.querySelector(".dtb-rows-input"), colsInputEl = root.querySelector(".dtb-cols-input"), createBtn = root.querySelector(".dtb-create"), hint = root.querySelector(".dtb-hint"), grid = root.querySelector(".dtb-grid");

      card.style.setProperty("--card-color", p.cardColor || "#20242c");
      card.style.setProperty("--border-color", p.borderColor || "#3a4048");
      card.style.setProperty("--accent-color", p.accentColor || "#04aa8e");
      card.style.setProperty("--accent-text-color", p.accentTextColor || "#0b1210");
      card.style.setProperty("--header-color", p.headerColor || "#2c3038");
      card.style.setProperty("--row-name-color", p.rowNameColor || "#2c3038");
      card.style.setProperty("--cell-color", p.cellColor || "#171a20");
      card.style.setProperty("--text-color", p.textColor || "#ffffff");
      card.style.setProperty("--text-size-px", `${Number(p.textSize ?? 13)}px`);
      card.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 12)}px`);
      controls.classList.toggle("hidden", p.showControls === false || String(p.showControls).toLowerCase() === "false");

      const maxRows = Math.max(1, Math.min(maxRowsCap, Number(p.defaultRows) || 3)), maxCols = Math.max(1, Math.min(maxColsCap, Number(p.defaultCols) || 3));
      const clampRows = n => Math.max(0, Math.min(maxRows, Math.round(Number(n) || 0)));
      const clampCols = n => Math.max(0, Math.min(maxCols, Math.round(Number(n) || 0)));
      const address = (base, index, increment) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(increment) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);

      const columnNameCache = new Array(maxCols).fill("");
      const rowNameCache = new Array(maxRows).fill("");
      const cellValueCache = Array.from({ length: maxRows }, () => new Array(maxCols).fill(""));
      let currentRows = maxRows, currentCols = maxCols;
      let columnNameEls = [], rowNameEls = [], valueEls = [];

      const rebuild = (rows, cols) => {
        currentRows = rows; currentCols = cols;
        grid.innerHTML = ""; columnNameEls = []; rowNameEls = []; valueEls = [];
        grid.style.setProperty("--cols", String(cols));
        rowsInputEl.value = String(rows); colsInputEl.value = String(cols);
        if (rows > 0 && cols > 0) {
          const corner = document.createElement("div");
          corner.className = "dtb-cell dtb-corner";
          grid.appendChild(corner);
          for (let c = 0; c < cols; c++) {
            const input = document.createElement("input");
            input.type = "text"; input.className = "dtb-cell dtb-header"; input.placeholder = `Column ${c + 1}`;
            input.value = columnNameCache[c] || "";
            grid.appendChild(input);
            columnNameEls.push(input);
          }
          for (let r = 0; r < rows; r++) {
            const rowNameInput = document.createElement("input");
            rowNameInput.type = "text"; rowNameInput.className = "dtb-cell dtb-row-name"; rowNameInput.placeholder = `Row ${r + 1}`;
            rowNameInput.value = rowNameCache[r] || "";
            grid.appendChild(rowNameInput);
            rowNameEls.push(rowNameInput);
            for (let c = 0; c < cols; c++) {
              const cellInput = document.createElement("input");
              cellInput.type = "text"; cellInput.className = "dtb-cell dtb-value"; cellInput.placeholder = "Value";
              cellInput.value = cellValueCache[r][c] || "";
              grid.appendChild(cellInput);
              valueEls.push(cellInput);
            }
          }
        }
        context.signals.publish("rowsFeedback", currentRows);
        context.signals.publish("colsFeedback", currentCols);
      };

      const createFromControls = () => {
        const rows = Number(rowsInputEl.value), cols = Number(colsInputEl.value);
        if (!(rows > 0) || !(cols > 0)) { hint.textContent = "Enter row and column counts greater than 0."; hint.classList.add("visible"); return; }
        hint.classList.remove("visible");
        rebuild(clampRows(rows), clampCols(cols));
      };
      createBtn.addEventListener("click", createFromControls);

      context.signals.subscribe("rowsInput", value => rebuild(clampRows(value), currentCols));
      context.signals.subscribe("colsInput", value => rebuild(currentRows, clampCols(value)));

      for (let c = 0; c < maxCols; c++) {
        context.signals.subscribeAddress("serial", address(p["columnNameBase"], c, p["columnNameIncrement"]), value => {
          columnNameCache[c] = value == null ? "" : String(value);
          if (columnNameEls[c]) columnNameEls[c].value = columnNameCache[c];
        });
      }
      for (let r = 0; r < maxRows; r++) {
        context.signals.subscribeAddress("serial", address(p["rowNameBase"], r, p["rowNameIncrement"]), value => {
          rowNameCache[r] = value == null ? "" : String(value);
          if (rowNameEls[r]) rowNameEls[r].value = rowNameCache[r];
        });
      }
      for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < maxCols; c++) {
          const rowIndex = r, colIndex = c;
          context.signals.subscribeAddress("serial", address(p[`row${r}CellBase`], c, p[`row${r}CellIncrement`]), value => {
            cellValueCache[rowIndex][colIndex] = value == null ? "" : String(value);
            if (rowIndex < currentRows && colIndex < currentCols) {
              const el = valueEls[rowIndex * currentCols + colIndex];
              if (el) el.value = cellValueCache[rowIndex][colIndex];
            }
          });
        }
      }

      rebuild(currentRows, currentCols);

      return () => createBtn.removeEventListener("click", createFromControls);
    },
  });
})(window.ComposerRuntime);
