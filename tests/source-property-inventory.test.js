const assert = require("assert");
const workbench = require("../component-workbench.js");

const entries = workbench.inventoryAuthoredProperties({
  html: '<button id="pair" style="opacity: .8"><span class="label">Pair</span></button>',
  css: `
    .pair { color:#fff; border:2px solid #09f; --glow: 8px; }
    .pair::before { background-color: rgba(0, 20, 40, .5); }
    .pair.selected { color: #00ff99; }
    @media (max-width: 480px) { .pair { width: 90px; } }
  `,
});

const find = (predicate, message) => {
  const entry = entries.find(predicate);
  assert.ok(entry, message);
  return entry;
};

assert.strictEqual(find((entry) => entry.property === "color" && entry.stateScope === "standard", "standard color missing").controlType, "color");
assert.strictEqual(find((entry) => entry.property === "color" && entry.stateScope === "selected", "selected color missing").value, "#00ff99");
assert.strictEqual(find((entry) => entry.property === "background-color", "pseudo-element declaration missing").pseudoElement, "::before");
assert.strictEqual(find((entry) => entry.property === "--glow", "custom property missing").kind, "css-custom-property");
assert.strictEqual(find((entry) => entry.property === "opacity", "inline style missing").kind, "inline-style");
assert.strictEqual(find((entry) => entry.property === "width", "media declaration missing").atRules[0], "@media (max-width: 480px)");
assert.strictEqual(find((entry) => entry.kind === "text-content", "authored text missing").value, "Pair");
assert.ok(!entries.some((entry) => entry.property === "box-shadow"), "inventory must not synthesize absent appearance declarations");

const grouped = workbench.groupAuthoredProperties([
  { kind: "css-declaration", selector: ".pair", pseudoElement: "", property: "color", value: "#fff", stateScope: "standard", controlType: "color", sourceIndex: 10, atRules: [] },
  { kind: "css-declaration", selector: ".pair", pseudoElement: "", property: "color", value: "#ddd", stateScope: "standard", controlType: "color", sourceIndex: 40, atRules: ["@media (max-width: 480px)"] },
]);
assert.strictEqual(grouped.length, 1, "the same authored target/declaration/state should be one choice");
assert.deepStrictEqual(grouped[0].values, ["#fff", "#ddd"]);
assert.strictEqual(grouped[0].locations.length, 2, "every authored declaration location must remain available");
assert.deepStrictEqual(grouped[0].locations[1].atRules, ["@media (max-width: 480px)"]);

console.log("source-property-inventory.test.js passed");
