# Source-First Custom Creation Plan

Last updated: 2026-09-03

## Rollback checkpoint

The repaired 1.7.3 implementation immediately before this redesign is preserved as:

- Git commit: `3957690`
- Git tag: `checkpoint-before-source-first-custom-creation-2026-09-03`

## Authoritative workflow

Every custom component—blank, starter-template, or imported—uses the same sequence:

1. **Source & preview** — enter HTML, CSS, and JavaScript, then refresh an authored-source preview.
2. **Editable properties** — choose only declarations/content that already exist in that source and should be exposed in the Composer Inspector.
3. **Crestron connections** — accept source-compatible recommendations or manually bind a signal to an exact source target/effect/event.
4. **Test & create** — test Inspector values, signal inputs/outputs, state behavior, resizing, remounting, and the registered runtime before saving.

Starter templates prefill source, properties, and compatible signal recommendations. They do not use a separate creation engine.

## Non-negotiable rules

- Authored HTML/CSS/JavaScript is the only source of component structure and appearance.
- Composer must not add a label, icon, border, glow, state, property, or behavior that the source does not contain.
- Property discovery inventories real authored declarations and content; it does not offer a generic role-based property catalog.
- A property is created only when the user checks it or manually maps an existing authored target.
- A Crestron recommendation is shown only when matching source behavior/state evidence exists.
- Manual connections may target any inventoried element, pseudo-element, authored CSS declaration/custom property, DOM property, attribute, class, text node, or authored JavaScript hook.
- Editable properties and Crestron connections remain independent.
- Test controls must use the same canonical binding executor and token resolution as the saved, reopened, exported, and mounted component.
- Compatibility repairs remain explicit and never silently alter source.
- Advanced users retain direct source and selector access.

## Phase 1 — Wizard and data-flow separation

- [x] Replace the combined three-step wizard with Source, Editable properties, Crestron connections, and Test & create.
- [x] Keep source editors and authored preview visible only in the Source step (with an Advanced source editor available later).
- [x] Require a successful source refresh before deriving properties or connections.
- [x] Preserve source inventory and user selections when moving forward or backward.

## Phase 2 — Strict authored-property inventory

- [x] Inventory CSS declarations, CSS custom properties, pseudo-elements, inline styles, authored text, and applicable media/state variants.
- [x] Group duplicate declarations by target, declaration, and state while retaining every authored location.
- [x] Present checkboxes with exact target, state, authored value, Inspector label, and control type.
- [x] Remove role-based properties that lack authored evidence.
- [x] Never generate missing CSS declarations from a checked property.
- [x] Allow manual property mapping only to an existing authored declaration/content target.

## Phase 3 — Source-compatible Crestron connections

- [x] Infer Press/Held/Release outputs only from a real interactive target.
- [x] Infer Selected/Disabled/mode inputs only from authored classes, attributes, DOM properties, or JavaScript state hooks.
- [x] Infer Analog/Serial inputs only where a compatible authored value target exists.
- [x] Make every recommendation optional and show the exact target and effect/event before adding it.
- [x] Support manual selection of any inventoried source target and compatible Digital/Analog/Serial action.
- [x] Prevent connection creation from adding unrelated Composer properties or source declarations.

## Phase 4 — Live editing and test parity

- [x] Test every proposed property before saving it.
- [x] Test every proposed connection before saving it.
- [x] Keep authored preview, mapped preview, Step 4 runtime, registered component, and export behavior identical.
- [x] Validate generated adapter JavaScript after token resolution before allowing creation.
- [x] Add regression fixtures for blank source, each starter template, imported buttons, toggles, state families, text, analog controls, and pseudo-elements.

## Phase 5 — Templates and import

- [ ] Feed starter templates through the same source inventory rather than hard-coded property/connection rows.
- [ ] Prefill only template mappings backed by the template source.
- [ ] Carry Import & Translate selections into the same inventories without re-inference or replacement.
- [ ] Preserve imported local JavaScript and CSS behavior unless the user explicitly changes it.

## Phase 6 — Remove obsolete generation paths

- [ ] Remove mixed property/connection capability bundles from custom creation.
- [ ] Remove automatic generic appearance injection for custom components.
- [ ] Remove duplicate legacy behavior generation after migration coverage is verified.
- [ ] Retain compatibility readers for existing `.cuicomponent` packages and saved projects.

## Phase 7 — Verification and release

- [ ] Run targeted source-inventory, mapping, preview, runtime, packaging, and migration tests.
- [ ] Run the complete automated suite.
- [ ] Complete physical desktop and touch-panel testing.
- [ ] Commit, push, and publish only after acceptance testing.
