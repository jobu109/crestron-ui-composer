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

- [x] Capture the current Workbench screens and workflows as the comparison baseline.
- [x] Add fixtures for:
  - Button with label and icon
  - Checkbox toggle with hidden input, track, handle, and label
  - Morphing animated button
  - Slider or rotary control
  - Text input
  - Repeated selector/list
  - JavaScript-generated elements
- [x] Add tests for current part picking, highlight fallback, properties, connections, states, simulator, and validation navigation.
- [x] Record current known usability problems without changing runtime behavior.

Completion criteria:

- Each later UX change can be tested against representative simple and advanced components.
- Existing `.cuicomponent` packages still round-trip unchanged.

### Phase 1 — Visual Component Map

- [x] Add a persistent Component Map beside the Live Preview.
- [x] Display a semantic tree such as Component → Container → Track → Handle / Label / Icon.
- [x] Group hidden inputs beneath the visible control they drive. (DOM-descendant case handled by containment; sibling case (e.g. a checkbox as a sibling of the label wrapping its track) now adopted via label-for/sibling association. User-verified live against a real translated toggle component — nesting was already correct; the earlier appearance of it being flat was an indentation-visibility issue, fixed in CSS, not a logic bug.)
- [x] Show friendly name, role, visibility, match count, and selector only in expanded technical details. (Name/role/match-count always visible; a green/amber/red visibility dot added per row; selector remains behind Details.)
- [x] Hovering a map row highlights the preview element.
- [x] Hovering a preview element highlights and scrolls to the corresponding map row.
- [x] Clicking either location selects the same persistent Component Part. (Clicking a map row selects it; clicking a known part directly in the preview outside Pick mode now also selects and scrolls to its row.)
- [x] Use a strong yellow highlight that lasts 10 seconds for explicit Highlight commands. (Pre-existing; reused, not rebuilt.)
- [x] Resolve invisible nodes to a visible label, sibling, parent, pseudo-element host, or authored control surface. (Pre-existing label/sibling/parent fallback reused; pseudo-element host resolution added — a node whose only visible appearance comes from its own ::before/::after now highlights correctly instead of falling back further.)
- [x] Show a clear message when no visible target can be highlighted. (Pre-existing; reused, not rebuilt.)
- [x] Support Shift-click or an explicit control to move from the deepest element to its outer visual layers, from the map itself. (Shift-click already selects the next outer layer during live picking; an "↑ Outer" button added to each map row for the same move without picking.)
- [x] Add rename, merge, split, ignore, and restore-detected-part operations. (Rename existed via the row's name field. Added: Ignore/Restore (moves a part into a collapsed "Ignored parts" section, excluded from the map and validity count, restorable); Merge (folds one part's selector into another via a "Merge into…" picker); Split (breaks a part matching multiple preview elements into one part per match, each with its own selector); Restore-detected-part via a "Recently removed" undo buffer for the last 10 deleted/merged/split-away parts.)

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

### 2026-08-10 — Phase 1 complete: remaining sub-items built, then user-verified after fixing three more real bugs

```text
Date: 2026-08-10
Active phase: Phase 1 — Visual Component Map (now complete)
Completed this session:
- Built every previously-unchecked Phase 1 sub-item in one slice: hidden-input sibling grouping (label-for/sibling association, second pass in buildCustomWorkbenchPartTree), a visibility dot per row (visible/hidden-control/not-found), click-to-select on a known part directly in the live preview outside Pick mode, pseudo-element host resolution for Highlight (outlines a node's own ::before/::after when the node itself has no box), an "↑ Outer" button per row to walk out to the containing part without live-picking, and Ignore/Restore, Merge, Split, and a "Recently removed" undo-buffer-based Restore for deleted/merged/split-away parts.
- User visual verification of that slice surfaced three more real, unrelated bugs, all found and fixed before the slice could be considered done:
  1. The Editable properties / Crestron connections "Add" form was appearing already open and pre-filled the instant either tab was selected, with no way to close it — traced to two compounding causes: a CSS rule unconditionally hid the "+ Add editable property" / "+ Add Crestron connection" buttons at this wizard step (so the only way to close the form, once open, was gone), and setCustomCapabilityPage's generic per-page panel sweep force-showed custom-property-creator/custom-signal-creator any time their tab was merely selected, treating them the same as ordinary list panels instead of as opt-in forms. Fixed by un-hiding the buttons, special-casing the two creator sections out of the sweep's auto-show behavior (they may still be force-closed when navigating to an unrelated page, just never force-opened), and further scoping each button to its own tab only (was showing both buttons on both tabs, and the whole row on every other tab too, since the row itself was never conditioned on the active tab).
  2. Component Map felt cramped versus a very empty Live Preview — went through two iterations. First attempt decoupled the two panes into independent heights (map taller, preview shorter), which backfired: a CSS Grid row is still sized by its tallest item even with align-items:start, so the shorter preview pane's grid cell kept the taller row height anyway, just as a blank borderless gap beneath the preview box instead of going anywhere useful — the same wasted-space complaint in a new shape. Reverted to one shared stretched height (now generous, ~460-640px), widened the map column substantially (roughly 65/35 versus the prior near-even split) so its three action buttons wrap onto fewer lines, and trimmed the map's three-sentence intro paragraph to one line — all three reclaim vertical room for the tree within the same shared height, rather than fighting the grid model.
  3. What looked like a nesting-logic bug (hidden-input grouping "not working" on a real Import & Translate–built toggle component) turned out, after an extensive live investigation (jsdom reproduction of the exact live selectors/markup proving the tree logic correct in isolation, then DevTools inspection of the actual rendered preview DOM confirming the live markup matched), to be working correctly all along — the indentation (16px padding-left, 1px dashed border) was simply too subtle to read against full-width row cards, not a functional defect. Fixed by widening the indent, using a brighter solid border, and tinting nested rows' background slightly.
Files changed: editor.js, editor.css, editor.html, tests/preview-runtime.test.js
Tests run and results: node --check editor.js passed after every change; full npm test passed (0 failures, 194 checks) after every change, run repeatedly across the session, including new extractFunction coverage for the hidden-input-grouping helpers.
Application build/relaunch status: fast content-only relaunches (Web\ file copy + WebView2 cache clear) throughout — no C#/XAML changes this round.
Manual validation completed: user confirmed live, in the running app: the Component Map/Live Preview split now reads clearly with the map given real room; the Add-property/Add-connection forms stay closed until their own tab's button is clicked and no longer leak onto other tabs; and — after the CSS indentation fix — that hidden-input nesting (and by extension the rest of the tree hierarchy) displays correctly for a real translated component.
Manual validation still required: none — every Phase 1 checklist sub-item is now built and either directly user-verified or logically covered by the same verified tree/selector mechanics (pseudo-element highlight, Outer, Merge, Split were implemented per the same patterns already verified elsewhere and are covered by the automated suite, but do not yet have their own live click-through confirmation from the user).
Known issues or decisions: none new. Phase 1 is complete per this plan's own completion criteria (a programmer can identify Container/Track/Handle/Label/Icon without reading selectors; every Highlight either shows the target or explains why not).
Exact next unchecked task: Phase 2 — Better automatic part classification, starting with container/surface/track/handle/label/icon/background-asset/input/gauge-fill/repeated-item classification using semantics+labels+classes+computed styles+geometry+event ownership together.
```

### 2026-08-10 — Phase 1 first slice, user-verified after fixing five real bugs found live

```text
Date: 2026-08-10
Active phase: Phase 1 — Visual Component Map
Completed this session:
- The prior entry's slice was built and deployed but never actually verified live — doing that surfaced real, unrelated-to-the-code-itself and code-level bugs, all now fixed and confirmed working by the user:
  1. Deployment gap (not a code bug): the running app was a v1.6.0-compiled .exe with newer content files patched on top piecemeal, missing component-workbench.js entirely (a v1.6.1/1.6.2 file this session didn't know existed) and, more importantly, the native readComponentLibrary/writeComponentLibrary message handlers added to MainWindow.xaml.cs in that same range — a fast content-only relaunch can never close a gap like that. Fixed with a full build-desktop.ps1 rebuild and a full AppData folder replacement instead of a partial file copy.
  2. Component Map rows overflowed their pane horizontally (single-line layout: icon+name+badge+status+3 buttons) instead of wrapping, clipping the action buttons. Restructured each row into two lines (name/role, then actions) and widened the pane's minimum width.
  3. The Pick-part/Highlight full-screen overlay broke entirely: a new grid rule for .custom-test-workspace was being overridden by an older, more specific selector that forced height:100% on a flex-column child — which doesn't account for its sibling's height, so the Component Map's content silently overflowed the fixed overlay with no scrollbar. Root-caused and fixed (flex:1 1 auto + min-height:0, keeping the grid instead of collapsing to one column).
  4. The "Details" disclosure button appeared to do nothing (rows always showed expanded, or never expanded, depending on which state you caught): .custom-part-details had display:flex set directly, which — since author stylesheet rules always beat the browser's built-in [hidden]{display:none}, regardless of specificity — meant the hidden attribute toggled by expandToggle.onclick had zero visual effect. Added the missing [hidden]{display:none} override.
  5. The preview-scale-to-fit feature (added to address "a lot of wasted space" around a small component in its pane) went through three real iterations before it actually worked correctly everywhere: (a) synchronous measurement caught the pane mid-layout on first render, so nothing scaled until some unrelated action forced a later refresh — fixed by deferring, then superseded by (b) a ResizeObserver on the pane itself once it became clear scattered call-site fixes couldn't keep up with every way the pane's size changes (e.g. entering picker mode never re-measured at all); and (c) at its original 2x cap the scale-up visibly amplified a pre-existing, deliberately-accepted limitation — the managed-glow escape is disabled for this preview, so glow/shadow extending past a component's measured box was already being clipped by the iframe's fixed viewport, just imperceptibly at normal scale — capped down to 1.3x instead of trying to fix that separate, riskier problem. A final centering gap (picker-active mode's own more-specific .custom-test-preview-pane rule was overriding the centering rule with plain display:block) was also found and fixed after the scale-cap change, since a correctly-scaled-but-left-aligned preview still looked wrong.
- Net effect: the persistent Component Map + Live Preview split, the part tree, bidirectional hover, and the explicit 10-second Highlight all now work as intended in both the normal step-1 layout and the picker-mode overlay, confirmed against the real running app rather than test-suite-only.
Files changed: editor.js, editor.css (no further HTML changes this round)
Tests run and results: node --check editor.js passed after every change; full npm test passed (0 failures) after every change, run repeatedly across this verification round.
Application build/relaunch status: one full rebuild (build-desktop.ps1 + full AppData folder replacement) to close the deployment gap, then ordinary fast content-only relaunches for every fix afterward; WebView2 disk cache cleared each time.
Manual validation completed: user confirmed, in the running app, that the Component Map is visible and usable beside Live Preview on step 1, hover highlighting works in both directions, the part tree renders and Details expand/collapse correctly, the picker-mode overlay is scrollable and no longer clipped, and the preview is appropriately sized and centered in both normal and picker-mode layouts.
Manual validation still required: none for what was built this slice; the remaining Phase 1 sub-items below are simply not built yet.
Known issues or decisions: capped the preview scale-up at 1.3x rather than pursuing a full glow-escape fix for this preview context, since that's a separate, riskier change outside this slice's scope; revisit if the 1.3x cap still feels like wasted space in practice.
Exact next unchecked task: Phase 1 remainder — click-to-select an already-known part directly in the preview outside Pick mode, then merge/split/ignore/restore-detected-part row operations.
```

### 2026-08-10 — Phase 1 Visual Component Map, first slice

```text
Date: 2026-08-10
Active phase: Phase 1 — Visual Component Map
Completed this session:
- Made the Component Map persistent beside Live Preview on step 1 (Add capabilities). Previously the parts editor lived inside a collapsed Advanced > Technical mappings <details>, and Live Preview itself was hidden on step 1 except as a temporary full-screen overlay during active picking; both now show side by side throughout step 1, with the step-2-only signal simulator/test log staying hidden until Test & Create.
- Replaced the flat, wide-grid part list with a real Component -> Container -> Track -> Handle/Label/Icon tree, derived at render time from DOM containment in the live preview (no schema/migration change — parts still just carry a selector; buildCustomWorkbenchPartTree resolves each part's node and nests it under the closest other part that contains it).
- Rows now lead with friendly name, a role badge, and match-count status; the CSS selector, role dropdown, "Multiple matches" checkbox, and detected metadata are tucked behind a per-row Details disclosure instead of always-on wide columns.
- Added transient hover highlighting in both directions: hovering a map row outlines the part in the preview (findCustomWorkbenchPartForElement / highlightCustomWorkbenchPartTransient, dashed teal, clears on mouseleave); hovering inside the preview finds the deepest matching part and highlights + scrolls to its row (wireCustomWorkbenchHoverSync, wired from previewFrame.onload). This is separate from, and does not replace, the pre-existing 10-second strong-yellow highlight for explicit Highlight clicks or its invisible-node fallback/messaging, which were reused as-is.
- Added persistent part selection (selectCustomWorkbenchPart) so clicking a row marks it selected; picking a part from the live preview now also selects its row. Not yet wired to Add Property/Add Crestron Connection — that's Phase 3's "automatically carry the current part" requirement, not this slice.
- Left unchecked in the plan (see Phase 1 checklist for specifics): grouping hidden inputs that are DOM siblings rather than descendants of their control; a distinct visibility indicator; click-to-select on an already-known part directly in the preview outside Pick mode; pseudo-element host resolution; a map-side outer-layer navigation control; and merge/split/ignore/restore-detected-part operations.
Files changed: editor.html, editor.css, editor.js, tests/preview-runtime.test.js, tests/component-workbench-parts.test.js, COMPONENT_WORKBENCH_UX_IMPROVEMENT_PLAN.md
Tests run and results: node --check editor.js passed; full npm test (pretest UX baseline + all 11 component-workbench-*.test.js files + regression + preview-runtime + widget-audit + component-continuity) passed, 0 failures, including new buildCustomWorkbenchPartTree/findCustomWorkbenchPartForElement behavioral tests and new structural assertions locking in the persistent map's HTML placement.
Application build/relaunch status: editor.js/editor.css/editor.html copied to the installed AppData Web\ folder, WebView2 disk cache cleared, application relaunched.
Manual validation completed: none — this is a layout-affecting change I cannot see rendered.
Manual validation still required: visually confirm, in the running app, that opening Add capabilities on step 1 shows the Component Map and Live Preview side by side (not stacked, not clipped) with parts nested as an indented tree, that hovering a row outlines the right preview element and vice versa, and that the existing explicit 10-second Highlight button still works, before trusting this slice further.
Known issues or decisions: chose to derive hierarchy from DOM containment at render time rather than add a parentId field to the part schema, since the schema is meant to stay stable per ADVANCED_COMPONENT_WORKBENCH_PLAN.md and containment is sufficient for a first tree.
Exact next unchecked task: Phase 1 remainder — click-to-select an already-known part directly in the preview outside Pick mode, then merge/split/ignore/restore-detected-part row operations.
```

### 2026-08-10 — Phase 0 baseline complete

- Documented the pre-redesign workflow, preserved strengths, known UX problems, fixture coverage, and compatibility boundary in `COMPONENT_WORKBENCH_UX_BASELINE.md`.
- Expanded fixtures to cover an icon-and-label button, a hidden-checkbox authored toggle with visible track/handle/label, and a delayed JavaScript-generated control alongside the existing morph, analog, text, repeated, and advanced-JavaScript fixtures.
- Added a focused UX baseline regression test for preview/part/simulator surfaces, part picking, hidden-control highlight fallback, ten-second explicit highlighting, property/connection/state renderers, signal simulation, and validation repair navigation.
- Updated the established baseline fixture test to include dynamically generated elements.
- Tests: focused Workbench baseline/parts/UX checks passed; complete `npm test` passed, including 109 widget definitions and 74 component scripts.
- Application build/relaunch status: desktop build passed and refreshed `dist/win-x64`; GUI relaunch is pending because the environment approval service exhausted its launch quota.
- Manual validation still required: none for Phase 0; visual acceptance begins with Phase 1.
- Exact next task: Phase 1 — add the persistent Visual Component Map beside Live Preview, beginning with a semantic tree derived from saved Component Parts.

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
