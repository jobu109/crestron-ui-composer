# Advanced Component Workbench — Implementation and Continuation Plan

Last updated: 2026-08-08

## Objective

Build one unified Component Creator that lets a programmer create an advanced Composer component without external development help.

The programmer must be able to:

- Import existing HTML, CSS, and JavaScript and preserve its appearance and behavior.
- Start from a Composer template or a completely blank component.
- Identify any visual element as a named component part.
- Expose a CSS value, DOM property, attribute, text value, asset, or JavaScript value as an editable Composer property.
- Connect pointer press, release, hold, and other events to Crestron outputs.
- Connect Crestron digital, analog, and serial inputs to component feedback, text, styling, state, animation, and behavior.
- Define Standard, Pressed, Selected, Disabled, and custom states or modes.
- See and manually edit the authored HTML, CSS, and JavaScript.
- See the generated Composer adapter separately from handwritten source.
- Test every property, signal, state, pointer interaction, responsive size, and runtime before installing the component.
- Export or permanently install the finished component and its dependencies.

## Core architecture decision

Do not create a second component system.

Extend the existing Component Creator and make all entry paths converge into one Advanced Component Workbench:

1. **Import HTML/CSS/JavaScript** analyzes the source and pre-populates the workbench.
2. **Create from template** supplies known source and standard mappings.
3. **Create blank component** opens the same workbench without mappings.
4. **Install or edit a component package** loads its source and mappings into the same workbench.

Import & Translate becomes an automatic assistant for the workbench. It is not a separate final workflow.

## Non-negotiable guardrails

- Never silently replace or simplify authored HTML, CSS, JavaScript, animations, shapes, or states.
- Generated Composer behavior must be stored separately from authored source.
- Every generated mapping must be visible, editable, testable, and removable.
- Visual changes in Editor, Preview, exported HTML, CH5 Desktop, and TSW panels must match.
- Mouse and touchscreen pointer behavior must use the same lifecycle.
- Crestron feedback state must survive page changes, widget refreshes, remounts, and responsive-layout changes.
- Multiple instances must not share IDs, DOM state, timers, variables, or feedback accidentally.
- Glow, shadow, and press effects must receive protected visual space without changing the component shape.
- Existing built-in components and existing `.cuicomponent` packages must continue working.
- Validation must report actionable errors, not a score or unexplained percentage.
- No feature is complete until it works for both automatically detected mappings and manually created mappings.

## Proposed persistent schema

Each custom component will retain its existing metadata and add a versioned `workbench` definition.

```json
{
  "workbench": {
    "schemaVersion": 1,
    "parts": [],
    "properties": [],
    "connections": [],
    "states": [],
    "repeatedCollections": [],
    "adapter": {
      "version": 1,
      "rules": []
    }
  }
}
```

### Part definition

```json
{
  "id": "part-track",
  "name": "Toggle track",
  "selector": ".toggle-track",
  "role": "surface",
  "multiple": false
}
```

### Editable property mapping

```json
{
  "id": "property-track-color",
  "key": "trackColor",
  "label": "Track color",
  "type": "color",
  "defaultValue": "#253436",
  "target": {
    "partId": "part-track",
    "kind": "css-property",
    "name": "background-color"
  }
}
```

Supported property targets must include:

- CSS property
- CSS custom property
- Text content
- HTML attribute
- DOM property
- Class presence
- Data attribute
- Asset/background image
- Foreground graphic
- Visibility
- JavaScript adapter value
- Multiple coordinated targets

### Crestron connection mapping

```json
{
  "id": "connection-selected",
  "key": "selected",
  "label": "Selected",
  "type": "digital",
  "direction": "input",
  "target": {
    "kind": "state",
    "stateId": "state-selected"
  }
}
```

Supported connection behavior must include:

- Digital output: press/release
- Digital output: pulse
- Digital output: held
- Digital input: selected/state/class/visibility/disabled
- Analog input: feedback, state index, count, size, speed, color range, opacity, fill, rotation, or other mapped numeric property
- Analog output: value set, position, selected index, or other numeric interaction
- Serial input: name/text/URL/asset/data value
- Serial output: text entry or component-generated text/data
- Range conversion and clamping
- Boolean true/false mapping
- Optional per-item zero-based ranges

### State definition

```json
{
  "id": "state-selected",
  "name": "Selected",
  "activation": {
    "kind": "class",
    "partId": "part-root",
    "className": "selected"
  }
}
```

States must support existing authored classes, attributes, data values, JavaScript callbacks, and Composer-managed property overrides.

## Ordered implementation phases

Work through these phases in order. Do not skip ahead unless a later phase is required to test the current phase.

### Phase 0 — Baseline and fixtures — COMPLETE

- [x] Record the current custom-component schema and package format.
- [x] Add representative test fixtures:
  - Basic button
  - Toggle with authored Standard/Selected CSS
  - Animated morphing button
  - Slider or rotary control
  - Text input
  - Repeated list
  - Component with advanced handwritten JavaScript
- [x] Add round-trip tests for existing `.cuicomponent` files.
- [x] Confirm current full regression suite passes before schema changes.

Completion criteria:

- Existing behavior has automated coverage.
- A failure introduced by the workbench can be distinguished from a pre-existing issue.

### Phase 1 — Shared workbench schema and migrations — COMPLETE

- [x] Define schema objects for parts, properties, connections, states, repeated collections, and adapter rules.
- [x] Add schema validation with human-readable errors.
- [x] Add migration from current `properties`, `signals`, `behaviors`, `stateStyles`, `elementRoles`, and `repeatedItems` fields.
- [x] Preserve existing fields during migration until all runtimes use the new schema.
- [x] Update `.cuicomponent`, `.cuicomponents`, portable project, and project serialization.
- [x] Add downgrade-safe handling for unknown future fields.

Completion criteria:

- Existing custom components open unchanged.
- Save/open and package export/import preserve the new workbench definition.
- No visual or runtime change occurs solely because of migration.

### Phase 2 — Component Parts editor — COMPLETE

- [x] Add a Component Parts panel in Step 2.
- [x] Allow clicking an element in Live Preview to create or select a part.
- [x] Show element tag, selector, classes, IDs, attributes, text, and computed appearance.
- [x] Allow friendly part names.
- [x] Highlight the selected part in Live Preview.
- [x] Validate that selectors find exactly the expected elements.
- [x] Support single elements and repeated/multiple elements.
- [x] Add manual selector entry for dynamically generated elements.
- [x] Add refresh/re-scan after source changes.

Completion criteria:

- A programmer can identify “button face,” “label,” “icon,” “track,” and “knob” without editing selectors manually.
- Invalid or ambiguous selectors show a precise repair action.

### Phase 3 — Editable Property builder — COMPLETE

- [x] Add **Add editable property** as a primary action.
- [x] Choose the target part first.
- [x] Offer applicable property types based on the selected element.
- [x] Support all property targets listed in the schema section.
- [x] Prefill the current computed or authored value as the default.
- [x] Allow friendly label, key, type, units, min/max/step, and default.
- [x] Allow one property to drive multiple targets.
- [x] Show exactly what CSS/HTML/adapter rule will be generated.
- [x] Add generated bindings to the source/adapter view immediately.
- [x] Ensure every added property appears and works in the normal Composer Inspector after placement.
- [x] Add remove, duplicate, reorder, and edit operations.

Completion criteria:

- A user can expose track color, knob size, corner radius, glow, text, icon, asset, and animation speed without writing adapter JavaScript.
- Changing each property locally updates the intended part in Editor and Preview.

### Phase 4 — Crestron Connection builder

- [x] Add **Add Crestron connection** as a primary action.
- [x] First choose Digital, Analog, or Serial.
- [x] Then choose Input or Output.
- [x] Present relevant connection actions only.
- [x] Add pointer press/release/pulse/hold output mapping.
- [x] Add held duration and Press-versus-Held exclusivity.
- [x] Add Selected and custom state input mapping.
- [x] Add serial text/name input and text-entry output mapping.
- [x] Add analog value, feedback, speed, size, count, index, and range mappings.
- [x] Add min/max conversion, clamping, inversion, zero-based indexing, and units.
- [x] Add multiple-button unique naming.
- [x] Add per-item zero-based signal ranges for repeated collections.
- [x] Ensure Visibility and Disabled remain Composer-level optional capabilities rather than redundant translated signals.

Completion criteria:

- A user can map a chosen button press to Crestron and map Selected feedback back to its authored visual state.
- Serial and analog mappings work without manual JavaScript.

### Phase 5 — States & Modes editor

- [x] Provide Standard, Pressed, Selected, and Disabled states.
- [x] Allow custom named digital states.
- [x] Allow analog-indexed modes.
- [x] Connect a state to an existing class, attribute, data value, function, or property set.
- [x] Preserve authored transitions and animations between states.
- [x] Allow state-specific text, icon, asset, background, and visibility.
- [x] Do not force color or shadow inheritance.
- [x] Allow explicit Standard inheritance for text/icons/assets only.
- [x] Provide state simulation controls.

Completion criteria:

- A complex authored toggle or multi-mode button can use its original CSS states and be controlled by Crestron feedback.
- Returning to Standard restores the original shape and appearance.

### Phase 6 — Generated adapter and synchronized source editors

- [x] Keep four visible tabs: HTML, CSS, JavaScript, Generated Adapter.
- [x] Never inject generated rules invisibly into handwritten source.
- [x] Generate instance-scoped adapter code from schema mappings.
- [x] Show which mapping generated each adapter block.
- [x] Clicking a mapping highlights its generated code.
- [x] Clicking an adapter block navigates back to its mapping.
- [x] Allow manual authored-code edits at every stage.
- [x] Regenerate only the adapter when mappings change.
- [x] Detect collisions between authored and generated behavior.
- [x] Scope selectors, IDs, timers, observers, and variables per instance.

Completion criteria:

- Mapping changes never erase authored JavaScript or animations.
- Two mounted component instances operate independently.

### Phase 7 — Import & Translate integration — COMPLETE

- [x] Replace its separate final generation path with workbench schema population.
- [x] Automatically create detected parts.
- [x] Automatically create likely editable properties, all initially checked.
- [x] Automatically create likely Crestron connections, all initially checked.
- [x] Preserve every detected authored behavior locally unless explicitly mapped or removed.
- [x] Let users uncheck unwanted automatic suggestions.
- [x] Send uncertain detections to a clear review list.
- [x] Do not create redundant Name, Visibility, Disabled, or analog signals.
- [x] Do not alter shapes, radii, sizing, animation, or selected behavior during translation.

Completion criteria:

- Importing a basic control produces the same workbench mappings a user could have created manually.
- Automatic and manual components use the same runtime.

### Phase 8 — Manual creation entry paths — COMPLETE

- [x] Blank component entry.
- [x] Button starter.
- [x] Toggle starter.
- [x] Slider/knob starter.
- [x] Gauge/status starter.
- [x] Text/input starter.
- [x] Repeated-list starter.
- [x] Existing component/package editing.
- [x] Every starter opens the same Parts/Properties/Connections/States workbench.

Completion criteria:

- A programmer can build a fully functioning component without importing anything.

### Phase 9 — Simulator and actionable validation

- [x] Simulate every input signal with appropriate controls.
- [x] Display every output signal and pulse lifecycle.
- [x] Simulate pointer press, release, cancellation, and hold.
- [x] Simulate each state and analog mode.
- [x] Test serial values and empty feedback behavior.
- [x] Test multiple mounted instances.
- [x] Test unmount/remount with retained feedback.
- [x] Test component resizing and responsive dimensions.
- [x] Test Widget List inclusion where supported.
- [x] Replace readiness percentages with pass/fail errors and review notes.
- [x] Every error must offer a direct action: select part, edit mapping, open source, apply safe repair, or remove mapping.

Completion criteria:

- A component cannot be installed with an unexplained blocking error.
- “Go to” lands on the exact editable field and explains the required correction.

### Phase 10 — Runtime parity and performance

- [x] Editor runtime test.
- [x] Preview runtime test.
- [x] Exported standalone HTML test.
- [x] CH5 package structural test.
- [x] CH5 Desktop manual verification entry.
- [x] TSW touchscreen manual verification entry.
- [x] Mouse/touch lifecycle parity.
- [x] Page remount and retained feedback.
- [x] Multiple-instance isolation.
- [x] Widget List repeated-instance test.
- [x] Performance limits for repeated effects, observers, timers, and animation.
- [x] Warnings for unsupported browser APIs and expensive effects.

Completion criteria:

- The same component definition is used in Editor, Preview, exported HTML, CH5 Desktop, and TSW.

### Phase 11 — Packaging, documentation, and release

- [x] Permanently save workbench components in the Composer-wide library.
- [x] Preserve all mappings in `.cuicomponent` exports.
- [x] Preserve all mappings and assets in `.cuicomponents` library exports.
- [x] Add migration notes for old packages.
- [x] Add a Component Workbench chapter to the user manual.
- [x] Add walkthroughs for button, selected toggle, serial label, analog gauge, and repeated list.
- [x] Complete acceptance tests using all fixtures.
- [ ] Publish as a major/minor feature release only after Preview, CH5 Desktop, and TSW verification.

## Recommended implementation sequence per development session

For every session:

1. Read this document completely.
2. Inspect `git status` and preserve unrelated user changes.
3. Identify the first unchecked task in the active phase.
4. Implement only a coherent, testable slice.
5. Add or update automated regression coverage.
6. Run JavaScript syntax checks and the relevant targeted tests.
7. Run the full `npm test` suite before declaring the slice complete.
8. Build and relaunch the Windows application.
9. Update this checklist with completed items and a dated progress note.
10. Record any physical CH5 Desktop or TSW validation still required from the user.

## Progress log

Add new entries at the top.

### 2026-08-09 — Import review to Workbench handoff repaired

- Fixed WebView2 modal sequencing that could close Import & Translate after “Continue to final setup” without opening Component Workbench.
- Removed an undefined `escapeHtml` dependency from the new Workbench simulator dropdown renderer; selectors and state names are now inserted with safe DOM Option objects.
- The handoff now shows progress, queues the second modal until the first has fully closed, and preserves/reopens the imported review with an actionable error if Workbench initialization fails.
- Added regression coverage for the queued handoff and failure recovery. JavaScript syntax validation and the complete test suite pass.
- Exact next task remains physical CH5 Desktop and TSW verification for the feature-release gate.

### 2026-08-09 — Phase 11 packaging and documentation complete; release verification pending

- Confirmed that completed Workbench components persist in the machine-wide Composer library while projects retain the exact definitions they use.
- Hardened `.cuicomponent` and `.cuicomponents` portability so Workbench-only asset properties and state assets are embedded and remapped correctly on another machine.
- Package and library installation now normalize or migrate older Workbench data, validate it before registration, and retain migration metadata for later review.
- Expanded readiness fingerprints to include the generated adapter and complete Workbench schema so mapping-only changes require a new test.
- Added a full Component Workbench chapter to the built-in user manual, including button Press, Selected toggle, serial label, analog gauge/slider, and repeated-list walkthroughs plus old-package migration notes.
- Added packaging/fixture acceptance coverage. All seven baseline fixture roles compile and retain required authored behavior; JavaScript syntax, the full suite, Preview runtime, 109-widget audit, Widget List compatibility, and continuity checks pass.
- Remaining release gate: run the rebuilt package in CH5 Desktop and on a physical TSW, record both as Passed in the component verification section, then publish the planned major/minor feature release.
- Exact next task: collect CH5 Desktop and TSW verification evidence, then prepare and publish the feature release.

### 2026-08-09 — Phase 10 Runtime parity and performance complete

- Added a saved Component Workbench definition fingerprint to every registered runtime and verified that the identical fingerprint is embedded in standalone/CH5 export output.
- The saved-runtime gate now separately verifies Editor registration, Preview mounting, two isolated responsive instances, exported HTML execution, CH5 payload structure, retained feedback after remount, and two Widget List instances.
- The acceptance matrix now records Preview and shared-definition parity explicitly while retaining separate, persistent CH5 Desktop and physical TSW verification entries with notes.
- Expanded compatibility auditing with direct source actions for unbounded intervals, excessive timers, excessive observers, expensive continuous effects, and multiplied repeated-item animation cost.
- Existing API compatibility warnings continue to cover storage, network access, dynamic evaluation, modern browser APIs, advanced CSS, external assets, and older touch-panel Chromium limitations.
- Added focused runtime-parity regression coverage. JavaScript syntax validation, the full test suite, Preview runtime, 109-widget audit, Widget List compatibility, and component continuity checks pass.
- Physical CH5 Desktop and TSW results are intentionally not auto-certified; programmers record those results in the saved manual verification section after loading the built CH5Z.
- Exact next task: Phase 11 — complete package/library preservation, documentation, fixture acceptance, and release preparation.

### 2026-08-09 — Phase 9 Simulator and actionable validation complete

- Replaced the single generic signal tester with typed Digital, Analog, and Serial feedback controls plus a live output monitor that shows values and pulse activity.
- Added direct pointer Press, Release, Cancel, and configured Hold simulation against the selected Component Part.
- State simulation now applies both the authored visual state and its mapped Selected digital or analog mode feedback connection.
- Expanded the automated component self-test to exercise cancellation and configured hold timing while retaining existing empty-serial, responsive resize, two-instance, page-remount, and Widget List runtime checks.
- Replaced user-facing readiness percentages with blocking FIX items and non-blocking REVIEW notes. Each finding provides a repair-location action or a safe automatic repair where available.
- Added focused simulator/readiness regression coverage. JavaScript syntax validation, the full test suite, 109-widget audit, Preview runtime, Widget List compatibility, and continuity checks pass.
- Exact next task: Phase 10 — verify runtime parity from the shared component definition through Editor, Preview, standalone HTML, CH5 structure, CH5 Desktop, and TSW evidence.

### 2026-08-09 — Phase 8 Manual creation entry paths complete

- Routed Blank, Button, Toggle, Slider/Knob, Gauge/Status, Text/Input, and Repeated List starters through the shared Component Workbench schema.
- Starter properties are represented as visible authored-token mappings, while starter Crestron signals are represented as visible authored-runtime mappings. Their existing source remains authoritative and is not duplicated by the generated adapter.
- Toggle starters include authored Standard and Selected state definitions; repeated starters persist their collection definition in the shared schema.
- Component rescanning now adds newly discovered nested parts without discarding already named parts.
- Legacy migrated mappings remain visible for editing instead of being hidden solely because they came from an older package.
- Installing a `.cuicomponent` package now opens the installed component immediately in the same Parts/Properties/Connections/States workbench.
- Added focused entry-path regression coverage. JavaScript syntax checks, the complete test suite, the 109-widget audit, Widget List runtime coverage, and continuity checks pass.
- Exact next task: Phase 9 — expand the simulator and replace unexplained readiness outcomes with direct, actionable validation repairs.

### 2026-08-09 — Phase 7 Import & Translate integration complete

- Replaced the translator's disconnected legacy-only handoff with direct population of the shared Component Workbench schema.
- Accepted detected elements now become named Parts; accepted editable values become Property mappings; accepted signals become Connection mappings; repeated-item definitions become repeated collections.
- All accepted translator suggestions remain removable before handoff, while unresolved targets are recorded in `translationReview` for precise follow-up.
- Authored HTML, CSS, JavaScript, transitions, and animations remain local source. The generated adapter is built separately from schema mappings and no longer requires hidden source injection.
- Visibility and Disabled remain optional Composer-level capabilities, and the existing signal-selection cleanup continues to prevent duplicate Name and unwanted analog signals.
- Added focused Phase 7 regression coverage and JavaScript syntax validation.
- Exact next task: Phase 8 — unify blank templates, manual source entry, existing-component editing, and imported-package editing on this same workbench path.

### 2026-08-09 — Phase 6 Generated Adapter and synchronized source editors complete

- Added four first-class source tabs: HTML, CSS, JavaScript, and Generated Adapter. The old duplicate generated-code panel is no longer shown.
- Property, connection, and state mappings now generate a separate persisted adapter instead of inserting managed blocks into authored CSS or JavaScript.
- Added adapter blocks labeled with their source mapping, bidirectional mapping/code navigation, and highlighted traceability.
- Added authored/generated collision findings for shared CSS targets and possible duplicate signal behavior.
- Adapter regeneration leaves handwritten HTML/CSS/JavaScript unchanged and updates only the schema-derived adapter artifact.
- Runtime mounts the adapter after authored code inside each component iframe, isolating selectors, IDs, callbacks, timers, observers, and variables per component instance.
- Generated adapters persist in both the component entry and versioned workbench schema. Focused adapter tests, syntax checks, and the complete 109-widget regression/runtime suite pass.
- Exact next task: Phase 7 — replace Import & Translate's separate generation path with direct workbench schema population and checked suggestions.

### 2026-08-08 — Phase 5 States & Modes editor complete

- Replaced the destructive visual-state replacement language with a persistent States & Modes mapping editor that keeps authored CSS and JavaScript authoritative by default.
- Added Standard, Pressed, Selected, Disabled, custom named digital states, and zero-based analog-indexed modes.
- State activation can use pointer state, an existing CSS class, HTML attribute, data value, DOM property, or analog mode index.
- Added per-state text, icon/symbol, asset, background, text color, border, glow, opacity, scale, and visibility controls.
- Standard inheritance is explicit and limited to text, icons, and assets; color and shadow inheritance is never forced.
- Added direct Preview simulation and automatic Selected/custom-state/analog State and State Feedback connection creation.
- Workbench state definitions persist with named Component Part references. Focused state tests, JavaScript syntax checks, and the complete 109-widget regression/runtime suite pass.
- Exact next task: Phase 6 — build the Repeated Collections editor on named container/template parts with zero-based per-item property and signal mappings.

### 2026-08-08 — Phase 4 Crestron Connection builder complete

- Rebuilt Add Crestron Connection around persistent named Component Parts with filtered Digital, Analog, and Serial input/output actions.
- Added pointer Press, Release, Pulse, and Held outputs, configurable pulse/hold timing, and exclusive Press-versus-Held behavior.
- Added Selected, checked, and custom-class feedback plus serial text/name, asset, URL, attribute, and text-entry mappings.
- Added analog value, property, state-index, glow, dimensions, opacity, fill, rotation, speed, count, Value Set, and selected-index mappings.
- Added input/output range conversion, clamping, inversion, units, zero-based indexing, unique signal naming, and per-item zero-based address ranges.
- Added exact generated JavaScript preview and persistent connection cards with edit, duplicate, reorder, delete, and managed-source cleanup.
- Visibility and Disabled remain optional Composer-level bindings. Focused connection tests, JavaScript syntax validation, and the complete 109-widget regression/runtime suite pass.
- Exact next task: Phase 5 — add the States & Modes editor, beginning with authored Standard, Pressed, Selected, and Disabled state discovery and simulation.

### 2026-08-08 — Phase 3 Editable Property builder complete

- Upgraded the existing Add Editable Property workflow to target persistent named Component Parts.
- Added background/text/border/glow colors, glow strength, width, height, font size, radius, opacity, displayed text, background asset, foreground asset, arbitrary CSS property, CSS variable, HTML attribute, DOM property, class presence, data attribute, and local visibility mappings.
- Added Inspector control type, units, min/max/step, computed/default value prefill, and coordinated multi-target mappings.
- Added an exact generated CSS/HTML/JavaScript explanation before insertion and visible Composer-managed source blocks afterward.
- Added persistent mapping cards with edit, duplicate, reorder, and source-cleaning delete operations.
- Added focused property-mapping and multi-target schema tests. Full regression suite passes.
- Exact next task: Phase 4 — rebuild Add Crestron Connection on the same named-part mapping model, then add range conversion and Press-versus-Held configuration.

### 2026-08-08 — Phase 2 Component Parts editor started

- Added persistent named parts to Step 2 with live-preview picking, manual selectors, roles, multiple-match support, selector counts, highlighting, deletion, and source rescanning.
- Parts migrate from legacy element roles and save in the versioned workbench without removing legacy runtime fields.
- Added visible element tag, ID, class, ARIA label, text, additional attributes, dimensions, colors, and font-size metadata.
- Added focused persistence and broken-reference tests. JavaScript syntax checks and the full regression suite pass.
- Rebuilt and relaunched the Windows desktop application.
- Exact next task: Phase 3 — build the Editable Property Mapping editor using named Component Parts as targets, beginning with CSS properties and CSS custom properties.

### 2026-08-08 — Phase 1 schema foundation complete

- Project and component-package round trips preserve the workbench definition.
- Unknown future workbench and adapter fields survive normalize/open/save cycles.
- Full regression suite passed before beginning Phase 2.

### 2026-08-08 — Phase 1 schema foundation started

- Added `component-workbench.js` as the versioned schema, normalization, migration, and validation module.
- Existing custom components receive a non-destructive `workbench` definition during registration while retaining all legacy fields used by current runtimes.
- Migrated parts retain selectors and roles; properties, signals, states, repeated collections, and adapter rules retain their legacy definitions.
- Added validation for unsupported versions, duplicate IDs, missing selectors, broken part references, and unresolved mapping review notes.
- Added migration and validation regression tests; full `npm test` suite passes.
- Exact next task: finish Phase 1 package/project round-trip assertions for `workbench`, then add unknown-future-field preservation.

### 2026-08-08 — Phase 0 complete

- Added seven isolated workbench fixtures covering button, toggle, animated morph, analog control, text input, repeated list, and advanced authored JavaScript.
- Added a frozen version-3 `.cuicomponent` fixture recording the current pre-workbench package schema.
- Added `tests/component-workbench-baseline.test.js` and placed it first in the full `npm test` chain.
- Confirmed the version-3 package survives JSON round trips and the current parser/exporter retain version-3 compatibility.
- Full `npm test` suite passes.
- Exact next task: Phase 1 — define the versioned workbench schema objects and migration from existing custom-component fields.

### 2026-08-08 — Planning baseline

- Unified-workbench architecture selected.
- Import & Translate will populate the workbench rather than remain a separate component system.
- Manual creation, templates, and package editing will use the same schema and runtime.
- No implementation phase has started yet.

## Pause/resume handoff template

Before stopping a session, append this block to the progress log:

```text
Date:
Active phase:
Completed this session:
Files changed:
Tests run and results:
Application build/relaunch status:
Manual validation completed:
Manual validation still required:
Known issues or decisions:
Exact next unchecked task:
```

## Ready-to-paste continuation prompt

Use this prompt when beginning a future session:

```text
Continue implementing the Advanced Component Workbench in the Crestron UI Composer repository.

First, read ADVANCED_COMPONENT_WORKBENCH_PLAN.md completely. Treat it as the authoritative architecture, ordered checklist, guardrails, and acceptance criteria. Inspect the current git status and the newest Progress log entry. Resume from the exact next unchecked task in the active phase; do not redesign the workflow or skip ahead.

Preserve authored HTML/CSS/JavaScript and existing built-in components. Keep generated Composer adapter behavior separate and visible. Add regression coverage for each completed slice, run the relevant targeted tests and full npm test suite, rebuild the Windows desktop app, relaunch it, and update the plan's checklist and Progress log before stopping.

Tell me what phase and exact task you are resuming before making changes.
```

## User-side physical validation checkpoints

The assistant can implement and automate Editor/Preview/export checks. The user will be needed at these milestones:

1. First complete manual Press/Selected/Name component on a TSW-1070.
2. First analog feedback and analog speed mapping in CH5 Desktop and TSW.
3. First repeated component with per-item signals on a TSW.
4. Complex authored JavaScript component with two instances.
5. Final release acceptance project in Preview, CH5 Desktop, and TSW-1070.

Record the result of each checkpoint in the Progress log.
