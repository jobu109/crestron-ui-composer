# Unified Component Binding Simplification Plan

Last updated: 2026-09-01

## Rollback checkpoint

Before this changeover, release `v1.7.2` was preserved as:

- Git commit: `e81a90bf95007c03ee5e2fde406e4df2388aaef2`
- Git tag: `checkpoint-before-unified-bindings-2026-09-01`

To return to the exact pre-changeover source without rewriting branch history:

```powershell
git switch -c restore-before-unified-bindings checkpoint-before-unified-bindings-2026-09-01
```

Continuation prompt:

> Continue the Unified Component Binding Simplification Plan from the first unchecked item in `UNIFIED_COMPONENT_BINDING_PLAN.md`. Preserve compatibility with the rollback checkpoint and run the targeted tests plus the full suite before completing a phase.

## Product rule

Every component entry path must converge on the same workflow:

1. Import & Translate, a starter template, or blank HTML/CSS/JavaScript supplies authored source.
2. Composer identifies real component parts from that source.
3. A mapping selects one real target and one effect.
4. The mapping source is either:
   - a Composer Inspector property, which establishes an editable design value; or
   - a Crestron connection, which supplies or publishes a runtime value.
5. The same mapping drives the temporary test, Live Preview, Apply, validation, package, export, and runtime.

Composer properties and Crestron connections remain separate user-facing capabilities. They share targeting and effect execution; one does not require the other.

## Non-negotiable behavior

- A Composer property never gains a Crestron connection unless explicitly requested.
- A Crestron connection never creates unrelated Inspector properties.
- Applicable Inspector properties are offered for every component; inapplicable properties are omitted.
- Recommendations are optional presets that create ordinary visible mappings.
- Import & Translate may suggest mappings but must not create unselected mappings.
- Authored HTML, CSS, JavaScript, selectors, states, and transitions remain authoritative.
- Generated adapter code stays separate from authored source.
- One canonical binding definition must be used at every execution stage.
- Preview and installed/runtime behavior must be identical for the same value and state.
- Existing `.cuicomponent` packages and saved projects must migrate without losing legacy metadata.

## Canonical binding contract

Properties and connections retain their own metadata and add the same `binding` structure:

```json
{
  "binding": {
    "version": 1,
    "target": {
      "partId": "part-face",
      "selector": ".button-face",
      "pseudoElement": ""
    },
    "effect": {
      "kind": "css-property",
      "name": "background-color",
      "stateScope": "selected",
      "unit": ""
    }
  }
}
```

The containing entry determines the source:

- Property metadata: key, Inspector label/control/default/range.
- Connection metadata: key, Digital/Analog/Serial type, input/output direction, join/address, conversion, event lifecycle.

Supported effects include text, CSS property, CSS custom property, class, attribute, data attribute, DOM property, visibility, asset, transform, state activation, JavaScript adapter value, and output event.

## Implementation phases

### Phase 1 — Canonical contract and compatibility

- [x] Add canonical binding normalization and validation to `component-workbench.js`.
- [x] Derive canonical bindings from existing property and connection mappings.
- [x] Preserve legacy fields during round trips while making `binding` authoritative for new mappings.
- [x] Add contract and migration tests.

### Phase 2 — One execution engine

- [x] Implement one binding executor for temporary preview and simulator values.
- [x] Use the same executor when generating the installed component adapter.
- [x] Use the same state-scoping and selector resolution in preview, Apply, export, and runtime.
- [x] Add parity tests for every supported effect and state scope.

### Phase 3 — Simplified blank-button workflow

- [x] Render authored HTML/CSS/JavaScript before presenting mappings.
- [x] Make selecting a preview part establish the exact canonical target.
- [x] Simplify Add Editable Property to target, effect, state, Inspector control, and default.
- [x] Simplify Add Crestron Connection to target, effect/event, signal contract, and conversion.
- [x] Remove fields and panels that restate the same selection without changing the binding.
- [ ] Show each resulting mapping as one readable sentence with Edit, Test, Duplicate, and Delete.

### Phase 4 — Applicable Inspector defaults

- [ ] Define role-based applicable property sets for button, label, icon, container, toggle, track, handle, slider, gauge, input, and repeated item.
- [ ] Offer common component-level properties unless the component structure makes them inapplicable.
- [ ] Let users include or exclude every suggested property.
- [ ] Do not synthesize icon, label, track, or handle elements unless the user explicitly requests one.

### Phase 5 — Recommendations and Import & Translate

- [ ] Rebuild capability bundles as collections of ordinary canonical mappings.
- [ ] Make recommendation buttons visibly select/configure mappings and explain the result.
- [ ] Convert import detections into optional mapping suggestions using the same contract.
- [ ] De-duplicate suggestions by resolved DOM target plus effect plus state.
- [ ] Never add unselected or ineffective suggestions.

### Phase 6 — Remove redundant paths

- [ ] Stop separately regenerating behavior rules from definition rows.
- [ ] Stop using transient Component Map selection as saved mapping identity.
- [ ] Remove legacy UI paths only after compatibility migration and parity tests pass.
- [ ] Keep advanced selector and authored-source controls available behind Advanced.

### Phase 7 — End-to-end verification

- [ ] Verify blank button, default button, imported button, toggle, slider, text input, and repeated selector.
- [ ] Verify every property without a Crestron connection.
- [ ] Verify Digital, Analog, and Serial input/output mappings.
- [ ] Verify Standard, Pressed, Selected, Disabled, and Every-state scopes.
- [ ] Verify Live Preview, Apply, Step 3, creation, reopen, export, and packaged runtime parity.
- [ ] Run the full automated suite and complete physical desktop/touch testing.
