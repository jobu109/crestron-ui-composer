# Part-First Component Authoring Plan

Last updated: 2026-09-04

## Rollback checkpoint

This redesign starts from the working source-first implementation at:

- Git commit: `47356a3`

The existing source-first workflow remains supported throughout the work. No
existing component package or project may require reauthoring to remain usable.

## Product goal

An author can paste their own HTML, CSS, and JavaScript, identify the meaningful
visual and interactive parts, and expose only source-backed Composer properties
and Crestron signals. Composer should talk in component terms such as **Track
corner radius** or **Knob color**, not require CSS knowledge for normal work.

Raw selectors, CSS properties, DOM properties, classes, attributes, and adapter
code remain available in **Advanced mapping** for exceptional components.

## Authoring workflow

1. **Source & preview** — paste or edit HTML, CSS, and JavaScript; refresh and
   verify the authored preview.
2. **Parts** — select preview elements and give their purpose a clear name
   (for example Toggle input, Track, Knob, Label). Suggested parts are optional.
3. **Composer properties** — choose source-backed capabilities for a selected
   part, such as Track color or Track corner radius.
4. **Crestron connections** — bind signals to the same capabilities, native
   state/input behavior, or authored events.
5. **Test & create** — test the Inspector values and signal mappings through
   the same runtime that is saved and exported.

## Rules

- HTML, CSS, and JavaScript remain the source of truth for all appearance and
  behavior.
- Composer never creates a visual feature merely because it is common for a
  button or toggle.
- A basic capability must resolve to an existing authored declaration/content
  target or native interactive state.
- Inspector properties and Crestron connections stay separate, but share one
  part/capability binding.
- The standard UI must not make authors choose raw CSS property names.
- Advanced mapping remains intentionally explicit and never replaces a basic
  mapping behind the author's back.
- Preview, test controls, saved components, exports, and installed runtime must
  use the same canonical binding executor.
- Existing forms and role-based defaults are compatibility-only. Reuse an
  existing subsystem only when it provides source parsing, exact target
  resolution, canonical execution, package migration, or test coverage; do not
  carry its UI or inferred choices into the new workflow merely because it
  already exists.

## Phase 1 — Foundation and compatibility

- [x] Define a source-backed `partCapability` descriptor: part, friendly
  capability, canonical binding, source evidence, state scope, control type,
  range/unit, and whether it is safe for Composer/Crestron use.
- [x] Derive descriptors from existing authored-property and state inventories
  without changing their current package format.
- [x] Store accepted descriptors independently and resolve them to real
  Component Map parts; legacy properties/connections remain compatibility-only
  and are not used to populate the new authoring UI.
- [x] Add fixtures for the rolling-square toggle, a button, label, numeric
  control, pseudo-element knob, and imported component.

## Phase 2 — Parts step

- [x] Add the dedicated Parts wizard step between Source & preview and
  Composer properties.
- [x] Reuse the existing Component Map/preview picker to select a real target;
  allow the friendly name and role to be accepted or corrected.
- [x] Display source evidence and preview highlight for every part.
- [x] Prevent document canvas/support nodes from becoming component parts.

## Phase 3 — Basic Composer capabilities

- [x] Replace the normal raw-property picker with part-aware capability cards.
- [x] Group authored declarations into human-readable capabilities (color,
  border color, border width, corner radius, size, opacity, shadow/glow,
  text, transform, visibility) only when source evidence exists.
- [x] Let authors choose a state when the source has a real state variant.
- [x] Show the generated canonical target/effect only as a read-only detail;
  move direct selector/property editing to Advanced mapping.
- [x] Keep the current source-property inventory as an Advanced audit view.

## Phase 4 — Part-aware Crestron connections

- [x] Make the basic connection form choose **part + capability/event**, not a
  CSS/DOM property.
- [x] Offer Digital native states/events, Analog numeric capabilities, and
  Serial text/asset capabilities according to the selected descriptor.
- [x] Provide clear conversion controls only when a numeric capability is
  selected, including source-derived units/ranges.
- [x] Retain Advanced mapping for classes, attributes, custom variables, DOM
  properties, and authored JavaScript hooks.

## Phase 5 — Templates, imports, and recommendations

- [x] Have starter templates preselect their parts/capabilities using the same
  descriptor path.
- [x] Carry Import & Translate detections into Parts and capability selections
  without re-inference or replacement.
- [x] Present recommendations as optional preselected capabilities/connections,
  each with source evidence and an editable target.

## Phase 6 — Runtime and validation parity

- [x] Route basic capability test controls, Crestron simulator values, Apply,
  package export, and registered runtime through canonical bindings.
- [x] Validate that every selected capability still resolves after source edits;
  offer retarget/remove rather than silently changing it.
- [ ] Add end-to-end tests for Inspector-only properties, Digital/Analog/Serial
  mappings, every supported state scope, source refresh, reopen, export, and
  installed runtime.

## Phase 7 — Acceptance and release

- [ ] Perform physical desktop and touch-panel testing using a custom button,
  custom toggle, custom numeric control, and imported component.
- [ ] Commit, publish, and document the authoring workflow only after the
  acceptance matrix passes.
