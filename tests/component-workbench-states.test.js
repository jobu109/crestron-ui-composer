const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");

assert.ok(html.includes("States &amp; Modes"));
assert.ok(html.includes('id="custom-state-add"'));
assert.ok(html.includes('id="custom-mode-add"'));
assert.ok(html.includes('id="custom-state-part"'));
assert.ok(html.includes("Which part changes appearance?"));
assert.ok(html.includes("Advanced target"));
assert.ok(editor.includes('kind === "analog" ? "analog-index" : "class"'));
assert.ok(editor.includes('type: "composer-state-simulate"'));
assert.ok(editor.includes("function renderCustomStatePartOptions"));
assert.ok(editor.includes("function updateCustomStateSimulationAvailability"));
assert.ok(editor.includes("Advanced state trigger"));
assert.ok(editor.includes("Authored transitions remain active"));
assert.ok(editor.includes("values.inheritContent"));
assert.ok(editor.includes("values.visibility"));
assert.ok(editor.includes("addCustomStateConnection"));
assert.ok(editor.includes('action: "stateIndex"'));
assert.ok(editor.includes('action: "selectedIndex"'));
assert.ok(editor.includes("target.dataset.composerMode=String(index)"));

const value = workbench.normalize({
  parts: [{ id: "part-button", name: "Button", selector: ".button" }],
  states: [{
    id: "state-selected",
    name: "selected",
    target: { partId: "part-button" },
    activation: { kind: "class", value: "selected" },
    definition: { inheritContent: true, visibility: "preserve" },
  }],
});
assert.deepStrictEqual(value.states[0].activation, { kind: "class", value: "selected" });
assert.strictEqual(workbench.validate(value).valid, true);

console.log("component-workbench-states.test.js passed");
