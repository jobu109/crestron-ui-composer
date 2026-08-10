const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");

assert.ok(html.includes('data-custom-tab="adapter"'));
assert.ok(html.includes('id="custom-source-adapter"'));
assert.ok(html.includes('id="custom-adapter-blocks"'));
assert.ok(editor.includes("function customGeneratedAdapter()"));
assert.ok(editor.includes("function customAdapterCollisions(adapter)"));
assert.ok(editor.includes("function customAdapterRuntimeMarkup(javascript)"));
assert.ok(editor.includes("customAdapterRuntimeMarkup(adapter.javascript)"));
assert.ok(editor.includes("adapterRuntime: customAdapterRuntimeMarkup("));
assert.ok(!editor.includes("adapterRuntime = customAdapterRuntimeMarkup("));
assert.ok(editor.includes("focusCustomAdapterMapping"));
assert.ok(editor.includes("adapterCss: entry.generatedAdapter?.css"));
assert.ok(editor.includes("entry.generatedAdapter?.javascript || \"\""));
assert.ok(editor.includes("generatedAdapter,"));
assert.ok(!/upsertCustomManagedSource\("(?:css|javascript)", `(?:property|signal)-\$\{key\}`/.test(editor));

const value = workbench.normalize({
  adapter: {
    version: 1,
    rules: [{ id: "property-color", mappingId: "property-color", kind: "property" }],
    css: ".button{color:{{color}}}",
    javascript: "(function(){})();",
  },
});
assert.strictEqual(value.adapter.css, ".button{color:{{color}}}");
assert.strictEqual(value.adapter.rules[0].mappingId, "property-color");

console.log("component-workbench-adapter.test.js passed");
