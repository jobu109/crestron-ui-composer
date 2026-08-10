# Component Workbench UX Improvement Plan

Last updated: 2026-08-10

## Purpose

Improve the completed Advanced Component Workbench so programmers can visually identify component parts, add Composer properties and Crestron connections, test every mapping immediately, and correct errors without understanding CSS selectors or generated adapter code.

This plan extends `ADVANCED_COMPONENT_WORKBENCH_PLAN.md`. That document remains authoritative for schema, runtime, packaging, compatibility, and preservation requirements. This plan is authoritative for the next Workbench usability and automation improvements.

## Desired user workflow

1. Import HTML/CSS/JavaScript, choose a starter, or open an existing component.
2. Composer inventories meaningful visible parts such as Container, Track, Handle, Label, Icon, and repeated Item.
3. The programmer confirms or renames those parts by clicking the preview or component map.
4. The programmer adds capabilities using plain-language choices:
   - Make a property editable in Composer.
   - Connect an event or value to Crestron.
   - Define how Standard, Pressed, Selected, and Disabled states behave.
5. Every new property or connection receives an immediate test control beside the preview.
6. Composer compares the original and scoped component across all states and sizes.
7. Only actual runtime failures block creation. Every failure identifies the exact part or mapping and offers a useful repair action.

## Non-negotiable requirements

- Preserve authored HTML, CSS, JavaScript, shapes, animations, and state behavior.
- Keep advanced/manual controls available without making them necessary for normal use.
- Never require the programmer to understand a CSS selector for a normally detectable element.
- Hidden controls must resolve to their visible label, track, handle, or container.
- Hovering or selecting a part anywhere must identify the same part everywhere.
- Added properties and connections must work in Composer Inspector, Editor, Preview, exported HTML, CH5 Desktop, TSW, responsive layouts, and Widget List where supported.
- Mouse and touchscreen interactions must share the same pointer lifecycle.
- Crestron feedback must survive refresh, remount, page changes, and responsive target changes.
- Validation must use actionable errors and review notes, never a readiness percentage.
- No phase is complete until targeted automated tests and the full regression suite pass.

## Ordered implementation phases

Work through the phases in order. Complete one coherent, testable slice at a time.

### Phase 0 — Baseline and UX fixtures

- [ ] Capture the current Workbench screens and workflows as the comparison baseline.
- [ ] Add fixtures for:
  - Button with label and icon
  - Checkbox toggle with hidden input, track, handle, and label
  - Morphing animated button
  - Slider or rotary control
  - Text input
  - Repeated selector/list
  - JavaScript-generated elements
- [ ] Add tests for current part picking, highlight fallback, properties, connections, states, simulator, and validation navigation.
- [ ] Record current known usability problems without changing runtime behavior.

Completion criteria:

- Each later UX change can be tested against representative simple and advanced components.
- Existing `.cuicomponent` packages still round-trip unchanged.

### Phase 1 — Visual Component Map

- [ ] Add a persistent Component Map beside the Live Preview.
- [ ] Display a semantic tree such as Component → Container → Track → Handle / Label / Icon.
- [ ] Group hidden inputs beneath the visible control they drive.
- [ ] Show friendly name, role, visibility, match count, and selector only in expanded technical details.
- [ ] Hovering a map row highlights the preview element.
- [ ] Hovering a preview element highlights and scrolls to the corresponding map row.
- [ ] Clicking either location selects the same persistent Component Part.
- [ ] Use a strong yellow highlight that lasts 10 seconds for explicit Highlight commands.
- [ ] Resolve invisible nodes to a visible label, sibling, parent, pseudo-element host, or authored control surface.
- [ ] Show a clear message when no visible target can be highlighted.
- [ ] Support Shift-click or an explicit control to move from the deepest element to its outer visual layers.
- [ ] Add rename, merge, split, ignore, and restore-detected-part operations.

Completion criteria:

- A programmer can reliably identify Container, Track, Handle, Label, and Icon without reading selectors.
- Every Highlight action either visibly highlights the intended surface or explains why it cannot.

### Phase 2 — Better automatic part classification

- [ ] Classify container/surface, track, handle/knob, label, icon, background asset, input, gauge/fill, and repeated item.
- [ ] Use HTML semantics, label relationships, classes, computed styles, geometry, and event ownership together.
- [ ] Detect pseudo-element styling and map it to its host element.
- [ ] Detect state-only elements that appear after Standard/Selected changes.
- [ ] Run imported JavaScript safely before completing the inventory.
- [ ] Observe short-lived dynamic DOM changes and add JavaScript-generated elements.
- [ ] De-duplicate technical selectors that refer to the same visual part.
- [ ] Prefer meaningful visible parts over broad generic mappings.
- [ ] Explain uncertain classifications and allow one-click correction.

Completion criteria:

- The toggle fixture initially exposes Track, Handle, Label, and Toggle control correctly.
- Dynamically created parts appear without requiring the live picker in normal cases.

### Phase 3 — State-aware selection and preview

- [ ] Add a state toolbar visible throughout Workbench: Standard, Pressed, Selected, Disabled, and custom modes.
- [ ] Keep the selected state active while moving between Workbench sections.
- [ ] Refresh the Component Map for parts that appear only in a specific state.
- [ ] Automatically carry the current part and state into Add Property and Add Crestron Connection.
- [ ] Clearly show whether a mapping applies to one state or every state.
- [ ] Preserve authored transitions when switching states.
- [ ] Allow side-by-side Standard/Selected comparison.
- [ ] Restore Standard exactly after state simulation.

Completion criteria:

- A programmer can choose Label in Standard, add Idle text, choose Selected, and add Selected text without guessing targets.
- State simulation never permanently changes the component shape.

### Phase 4 — Plain-language capability builder

- [ ] Make the primary actions **Add editable property** and **Add Crestron connection**.
- [ ] Build mappings as readable sentences, for example:
  - Make the Handle color editable in every state.
  - Make the Label text editable only in Selected state.
  - Send a digital Press output when Button is pressed.
  - Use a digital Selected input to activate the authored Selected state.
- [ ] Choose part, capability, and state using friendly names from the Component Map.
- [ ] Hide keys, selectors, adapter kinds, and technical parameters under Advanced details.
- [ ] Show the generated Inspector field and Crestron signal name before adding it.
- [ ] Warn about duplicate or conflicting mappings before insertion.
- [ ] Retain direct source and generated-adapter editing for advanced users.

Completion criteria:

- Common button, toggle, text, slider, and gauge mappings can be created without manipulating selectors or adapter code.

### Phase 5 — Property templates and immediate testing

- [ ] Offer applicable property choices for the selected part and state.
- [ ] Support text, font, size, alignment, wrapping, colors, background, border, radius, shadow, glow, opacity, dimensions, spacing, icons, assets, fill, position, rotation, and animation timing.
- [ ] Prefill defaults from authored or computed values.
- [ ] Add a temporary Inspector control next to Live Preview before the mapping is saved.
- [ ] Update the preview immediately as the temporary value changes.
- [ ] Provide Reset, Compare with original, and Remove mapping actions.
- [ ] Verify resizing changes the component itself rather than only its bounding box.
- [ ] Preserve protected effect/glow space without changing authored geometry.

Completion criteria:

- Every offered property visibly affects its intended part before installation.
- Unused or ineffective properties are not offered as successful mappings.

### Phase 6 — Crestron connection templates and immediate testing

- [ ] Present Digital, Analog, and Serial connection types in plain language.
- [ ] Filter relevant actions by selected part and role.
- [ ] Digital inputs: Selected, state, visibility, disabled, charging, enabled, and custom boolean behavior.
- [ ] Digital outputs: Press, Release, Pulse, Held, completed, and custom event.
- [ ] Analog inputs/outputs: feedback, value set, mode/index, count, size, speed, fill, position, opacity, rotation, and custom numeric property.
- [ ] Serial inputs/outputs: Name, Text, URL, asset, text entry, and custom string property.
- [ ] Place a typed simulator directly under each mapping:
  - Digital toggle/pulse
  - Analog slider and numeric entry using exactly the configured Crestron range
  - Serial input field
  - Output event and pulse log
- [ ] Support multiple connections without replacing earlier mappings.
- [ ] Explain exactly which part, state, event, or property the connection controls.

Completion criteria:

- A connection can be fully verified before moving to Test & Create.
- Analog simulation accepts the same range the processor will send, with no hidden alternate range.

### Phase 7 — Capability bundles and automatic suggestions

- [ ] Add one-click capability bundles:
  - Standard Button
  - Toggle
  - Slider / Gauge
  - Text / Input
  - Repeated Selector
- [ ] Build bundles from the same individual property/connection builders.
- [ ] Automatically select every confident detected capability initially.
- [ ] Allow users to uncheck unwanted suggestions.
- [ ] Explain every suggested property and connection in plain language.
- [ ] Avoid redundant Name, Visibility, Disabled, Selected, or analog mappings.
- [ ] Generate unique friendly names for multiple controls.
- [ ] Provide **Apply all safe recommendations**.

Completion criteria:

- A basic imported toggle requires confirmation rather than rebuilding its capabilities manually.
- Removing a suggestion leaves the authored component behavior intact.

### Phase 8 — Unified Test & Create workspace

- [ ] Show Live Preview and Crestron values simultaneously without overlap.
- [ ] Keep validation details compact until expanded.
- [ ] Provide controls for every editable property, input signal, output event, state, and mode.
- [ ] Add Original / Composer side-by-side comparison.
- [ ] Test Standard, Pressed, Selected, Disabled, and custom states.
- [ ] Test multiple sizes and responsive dimensions.
- [ ] Test two simultaneously mounted instances.
- [ ] Test remount/page-change feedback retention.
- [ ] Test Widget List inclusion where supported.
- [ ] Preserve test values while navigating between steps.

Completion criteria:

- The programmer can verify every created capability without leaving the final screen.
- Panels never overlap or obscure required controls at supported desktop sizes.

### Phase 9 — Actionable validation and repairs

- [ ] Separate blocking errors from non-blocking review notes.
- [ ] Remove all readiness scores and percentages.
- [ ] Every finding identifies the affected part, property, connection, state, or source location.
- [ ] Replace generic Go to behavior with **Open exact setting**, **Select part**, **Open source line**, **Apply safe repair**, or **Remove mapping**.
- [ ] Highlight and scroll to the exact field after navigation.
- [ ] Explain what is wrong, why it matters, and what a valid correction looks like.
- [ ] Re-run only the affected validation immediately after a repair.
- [ ] Prevent validation from becoming stuck in a permanent Validating state.
- [ ] Keep creation blocked only for genuine runtime or unresolved-reference failures.

Completion criteria:

- A programmer never lands on an unexplained screen after selecting a repair action.
- Every blocking error can be corrected without restarting the wizard.

### Phase 10 — Runtime parity and persistence acceptance

- [ ] Verify properties, signals, states, and animations in Editor.
- [ ] Verify the same definition in Preview.
- [ ] Verify exported standalone HTML.
- [ ] Verify CH5 Desktop.
- [ ] Verify a TSW-1070 touchscreen.
- [ ] Verify responsive targets and Widget List.
- [ ] Verify two instances, page unload/remount, and retained Crestron feedback.
- [ ] Verify component library persistence across projects and Composer upgrades.
- [ ] Verify `.cuicomponent` and `.cuicomponents` transfer to another machine.
- [ ] Add performance safeguards for observers, timers, animations, and repeated effects.

Completion criteria:

- The same saved Workbench definition produces matching behavior in every supported runtime.
- Physical CH5 Desktop and TSW results are recorded before release.

### Phase 11 — Documentation and release

- [ ] Update the built-in user manual with the new visual workflow.
- [ ] Add walkthroughs for button, toggle, serial state text, analog speed, slider/gauge, repeated list, and JavaScript-generated parts.
- [ ] Include Original versus Composer troubleshooting examples.
- [ ] Add migration notes for components created with the earlier Workbench UI.
- [ ] Run clean-install and upgrade-install acceptance tests.
- [ ] Publish a beta release for physical testing.
- [ ] Promote to stable only after Preview, CH5 Desktop, and TSW validation pass.

## Development-session procedure

For every implementation session:

1. Read this file completely.
2. Read `ADVANCED_COMPONENT_WORKBENCH_PLAN.md` for architecture and guardrails.
3. Inspect `git status`; preserve unrelated user work.
4. Read the newest Progress Log entry below.
5. Resume the first unchecked task in the active phase.
6. Implement one coherent, testable slice.
7. Add or update targeted automated coverage.
8. Run JavaScript syntax checks, targeted tests, and the full regression suite.
9. Rebuild and relaunch the Windows application.
10. Update checkboxes and add a dated Progress Log entry.
11. Record any CH5 Desktop or physical TSW testing required from the user.

## Progress Log

Add new entries at the top using the handoff template below.

### 2026-08-10 — Planning baseline

- Created this UX improvement plan as a companion to the completed architectural Workbench plan.
- Current immediate behavior: explicit Highlight opens Live Preview, lasts 10 seconds, and attempts to resolve hidden mappings to a visible control surface.
- Exact next task: Phase 0 — add/capture representative UX fixtures and baseline tests, then begin the persistent Visual Component Map.

## Pause/resume handoff template

Append this block to the top of the Progress Log before stopping:

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

Use this prompt whenever work has paused or a new conversation begins:

```text
Continue the Component Workbench UX improvements in the Crestron UI Composer repository.

First read COMPONENT_WORKBENCH_UX_IMPROVEMENT_PLAN.md completely, then read ADVANCED_COMPONENT_WORKBENCH_PLAN.md for the underlying architecture and guardrails. Treat the UX plan as the authoritative ordered checklist for this upgrade. Inspect git status and the newest Progress Log entry, then resume from the exact next unchecked task in the active phase. Do not skip phases or redesign the established Workbench schema.

Preserve authored HTML/CSS/JavaScript, existing built-in components, existing custom packages, and generated-adapter separation. Implement one coherent slice, add regression coverage, run syntax checks plus targeted and full tests, rebuild and relaunch the Windows app, and update the UX plan checklist and Progress Log before stopping.

Tell me the active phase and exact task you are resuming before making changes.
```

## User physical-validation checkpoints

The assistant can automate Editor, Preview, export, packaging, and structural checks. The user is needed for:

1. Visual part map and state-aware mapping acceptance using a real imported toggle.
2. First complete Press/Selected/Standard Text/Selected Text component in CH5 Desktop and TSW.
3. Analog speed/value mapping using the exact configured Crestron range.
4. Repeated component and Widget List behavior on a TSW.
5. JavaScript-generated component with two simultaneous instances.
6. Final release acceptance project in Preview, CH5 Desktop, and TSW-1070.

Record each result in the Progress Log.
