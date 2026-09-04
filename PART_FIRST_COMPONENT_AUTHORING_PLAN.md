# Part-First Component Authoring Plan

Last updated: 2026-09-04 (Phase 0 executed live against the real app)

## Reality check — why this looked "never really working"

Before touching any code, two things were verified against the actual running
app, not just `npm test`:

1. **The deployed app was stale.** `editor.js` (576 diff lines) and
   `component-workbench.js` (217 diff lines) in the AppData install were
   behind the repo by most of the Part-First work — commits `04b1cfa` through
   `337d0a5`. Anyone testing the running app before this session was testing
   an older workflow, not the one described by the checked-off phases below.
   Files are now synced and the app relaunched.
2. **Every "[x]" in the old version of this plan was earned by a test that
   never drives the real UI.** `tests/regression.test.js`'s part-first checks
   are `editor.js.includes("some substring")` assertions — they prove code
   exists, not that it works. `tests/part-first-authoring-acceptance.test.js`
   ("cover part-first authoring acceptance flow") calls
   `component-workbench.js` functions directly with hand-built fixture
   objects; it never loads `editor.html`, never calls `renderPartFirstParts`,
   `renderPartFirstProperties`, or `setCustomWizardStep`, and never simulates
   a paste → click → check-a-box user session. **This is the exact failure
   mode that killed `VISUAL_COMPONENT_DESIGN_PLAN.md`** on 2026-09-02: 272
   green checks, broken in hand. See that memory — the lesson wasn't learned
   the first time.

**Verdict: adjust, don't abandon.** The data/model layer
(`component-workbench.js` — canonical binding executor, part-capability
inventory, migration, validation) is genuinely well-built and is not the
problem: it deduplicates cleanly, only reports capabilities backed by real
declarations, and the acceptance test (limited as it is) proves its logic is
correct in isolation. Source & preview (step 0), Parts (step 1), and Composer
properties (step 2) have real, dedicated UI that materially matches the
target workflow below. The gap is concentrated in **Crestron connections
(step 3)** and in **how "done" gets decided** — string-matching tests instead
of a driven UI session.

## Phase 0 results — driven live against the real app (2026-09-04)

The app's WebView2 content was driven directly over Chrome DevTools Protocol
(`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`, no code
changes) so this was a real click/type session against the actual running
process, not a simulation. A toggle was hand-authored end to end:

```html
<label class="switch"><input id="toggle" type="checkbox"><span class="track"></span><span class="label">Off</span></label>
```
```css
.switch{display:inline-flex;align-items:center;gap:8px}
.track{width:40px;height:20px;background-color:#4a4f5c;border-radius:10px;display:inline-block}
input:checked + .track{background-color:#14b8a6}
.label{color:#ffffff;font-size:14px}
```

**Found and fixed — a real crash that blocked every custom component from
opening at all:** clicking "Blank Component" (or any starter template, since
they share the same render path) threw
`ReferenceError: normalizeCssSelector is not defined` at
`editor.js:18938`, inside `renderCustomAuthoredConnectionRecommendations`.
Every other call site in `editor.js` correctly calls through
`window.ComposerComponentWorkbench.normalizeCssSelector(...)`; this one call
was left as a bare reference and threw immediately, silently aborting
`openCustomBuilder` before the dialog ever became visible. **This alone is
enough to explain "never really worked"** — it is plausible no custom
component creation session has completed since this was introduced. Fixed by
qualifying both calls through `window.ComposerComponentWorkbench`; deployed
to the running app and confirmed fixed live; `npm test` still passes in full
(no test caught this, confirming the Phase C rationale below).

**With the fix in place, the full 5-step flow worked correctly end to end:**
paste → refresh showed the real toggle with the real track color; Parts step
found exactly the 4 real parts (`label.switch`, `#toggle`, `.track`,
`.label`) with sensible auto-suggested names; Composer properties listed 10
real, correctly-sourced capabilities (verified every row's evidence string
against the pasted CSS by hand — nothing invented, including a legitimate
`.custom-component` background token that ships with the Blank template
itself, not something authored); Crestron connections recommended 8 real
part+capability/event options with accurate plain-English descriptions;
adding a selected-state digital input and a press digital output, then
running the built-in self-test, produced `COMPONENT READINESS — PASSED`
(11/11 checks) after correctly **failing first** when the output signal was
missing — proving the self-test's pass/fail logic is trustworthy, not just
present. Driving the Step 4 simulator's checkbox for the selected input
changed the live preview's track color to the exact authored `#14b8a6` and
set the real DOM checkbox's `.checked` — the canonical binding executor is
genuinely wired end to end, not just in the model layer.

**Two more real (non-blocking) findings from this session, beyond the ones
already known from source reading:**
- The Parts step's name field shows a *suggested* friendly name
  (`customFriendlyTargetName`) but only commits it to `part.name` on the
  input's own `change` event. If a user accepts the suggestion by just
  clicking Next without touching the field, later steps recompute their own
  fallback name independently and can show a different, shorter label for
  the same part (observed: "Component root" in Parts vs. plain "Component"
  in Composer properties, for the same `.switch` element). Minor, but worth
  fixing alongside Phase A since it's the same kind of "trust the suggestion,
  get something else later" surprise.
- Confirmed live, not just from source reading: authored `font-size: 14px`
  on `.label` produced no capability row at all — matches the Phase A gap
  below exactly.

The earlier claim in this document that Composer properties already has a
live-test-before-add control reachable in the normal flow was **wrong** —
`custom-property-live-test` only exists inside the legacy
`custom-property-creator` panel, which is hidden behind the explicit
"Advanced mapping" toggle. In the actual part-first checklist
(`part-first-properties-list`), checking a box adds the property immediately
with no preview-before-commit step of its own; the real "live" experience for
adjusting values happens in Step 4's simulator, same as connections. Phase B
below is corrected accordingly — the target is parity in Step 4's simulator
coverage and clarity, not inventing a duplicate test control this session
found doesn't actually exist where it was assumed to.

## Target workflow (verbatim from the user — this replaces the old "Authoring
workflow" section as the source of truth)

1. Open with a blank template, like now.
2. Paste HTML/CSS/JS. See a live view of the result; a manual refresh
   afterward is fine.
3. See **editable properties**: exactly what the pasted CSS/HTML provides,
   as checkboxes to include or not. Nothing invented beyond the source (text
   present → text color/size; border present → border color/width; etc).
4. Once saved, move to **Crestron connections**: recommend defaults (press,
   selected, etc.) only when they match the actual HTML/CSS/JS. Also allow
   manually adding a connection targeting *any* portion of the HTML/CSS/JS —
   not limited to the recommended set. Both the recommended and the manual
   paths must be testable/editable live, the same as properties are.
5. Continue to Test & create like every other component. Templates go
   through the same steps, just pre-filled.

## Verified status per step

| Step | Real UI exists? | Matches target workflow? | Notes |
|---|---|---|---|
| 0. Source & preview | Yes | Yes | **Verified live 2026-09-04.** Paste, refresh, preview all real (`refreshCustomPreview`). |
| 1. Parts | Yes (`renderPartFirstParts`, `part-first-parts-step`) | Mostly | **Verified live.** Auto-detects real parts with sensible suggested names/roles. Minor bug found: suggested name isn't committed to `part.name` until the input's `change` event fires — see Phase 0 results. |
| 2. Composer properties | Yes (`renderPartFirstProperties`, `part-first-properties-step`) | Mostly | **Verified live.** Real checklist of source-backed capabilities with accurate evidence text — hand-checked every row against the pasted CSS, nothing invented. **Gap confirmed live:** authored `font-size` produced no row at all. `box-shadow` also collapses to one opaque capability instead of color+size like border does. No live-test-before-add in this checklist (that only exists in the hidden legacy/Advanced form) — parity comes from Step 4's simulator, same as connections. |
| 3. Crestron connections | Yes (previously blocked by a crash, now fixed) | Yes | **Verified live.** `custom-authored-connection-recommendations` is a genuine part+capability/event checklist; the manual `custom-signal-creator` form correctly covers "target any portion of the source." Was completely unreachable before this session's fix (see Phase 0 results) — a `ReferenceError` in `renderCustomAuthoredConnectionRecommendations` crashed component creation before the dialog even opened. |
| 4. Test & create | Yes | Yes | **Verified live.** `runCustomComponentSelfTest` genuinely drives the real preview iframe and correctly failed, then correctly passed (11/11) once the hand-authored toggle had both an input and an output signal. |
| Templates/import preselection | Code exists | Unverified | Not exercised this session (Phase 0 used the Blank template only). Still needs a pass — see Phase D. |

## Revised plan

### Phase 0 — Prove it live before writing more code (do this first, blocks everything else)
- [x] With the app synced, author one real component by hand in the running
  app end-to-end (a toggle with a text label, a border/corner-radius, and a
  selected-state color change) through all 5 steps. Done 2026-09-04 by
  driving the real WebView2 content over CDP — see "Phase 0 results" above.
- [x] Confirm: preview renders after refresh; Parts step lists real parts;
  Composer properties step shows checkboxes for exactly the CSS provided and
  nothing invented; Crestron connections step recommends options that match
  the CSS; Test & create step's self-test passes. All confirmed.
- [x] Write down anything that breaks, looks wrong, or feels like extra
  friction. Found and fixed a crash (`normalizeCssSelector` undefined
  reference) that blocked every custom component from opening at all; found
  the font-size gap and the Parts-step name-persistence issue live —
  captured in Phase A below.

### Phase A — Close the gaps Phase 0 actually found (done 2026-09-04)
- [x] Added `font-size`, `font-weight`, and `font-family` to
  `declarationCapabilities` in `component-workbench.js`. Verified live: an
  authored `font-size` now produces a real "Text size" row.
- [x] Root-caused and fixed the actual Parts-naming bug — it was **not** a
  name-persistence issue as first guessed. Parts are registered from a live
  DOM walk and can get a tag-qualified selector (`label.switch`), while
  capability inventory reads the same element's identity back out of the
  literal authored CSS/HTML text (`.switch`, exactly as written). Those two
  strings never matched in `materializePartCapabilities`'s part lookup, so
  that one capability's `partId` stayed empty and fell back to a generic
  name. Fixed with a `relaxedSelectorIdentity` fallback match (strips a
  leading bare tag name before comparing) in `component-workbench.js`.
  Verified live: "Component root — Visibility" now matches "Component root
  — Background color" for the same element, instead of showing as the
  generic "Component."
- [x] Fixed a real correctness bug found while investigating: `box-shadow`
  and `filter` values were misclassified as a plain color control whenever
  a color happened to appear anywhere inside the shorthand (e.g. `0 2px 4px
  rgba(0,0,0,.5)`), so editing "Shadow" through the resulting color picker
  would have silently replaced the whole declaration and dropped the
  offsets. `authoredControlType` now requires the *entire* value to be a
  bare color, not just contain one.
- [ ] Full `box-shadow` decomposition into independently-editable shadow
  color + shadow size (deferred — see below).
- [x] Every addition only fires on real source evidence — no unconditional
  allowlist entries.
- All three fixes deployed to the running app and re-verified with a full
  hand-driven pass (Source → Parts → Properties → Connections →
  self-test PASSED) and a full `npm test` pass.

**Box-shadow decomposition, deferred on purpose:** the existing legacy
`shadowColor`/`shadowSize` capability actions in `bindingDeclaration`
reconstruct the shadow from a *fixed template*
(`0 var(--size) var(--size) var(--color)`), which would silently discard
whatever offsets/spread the author actually wrote — that's inventing a
shape, which breaks this plan's own "nothing invented beyond source" rule.
Properly decomposing it means parsing the real authored shorthand and
tokenizing just the color and blur pieces inside it, which the current
"one property → one token" mapping model (`addCustomAuthoredProperty`)
doesn't support yet. Rather than rush a version that violates the rule,
this is left as a real bare "Shadow" capability (now at least safely typed
as text, not a data-losing color picker) until it can be designed properly.

### Phase B — Preview-before-add for both properties and connections (done 2026-09-04)
Decision (user, 2026-09-04): Step 4's simulator alone isn't enough — build a
live preview-before-add control, and build it for **both** properties and
connections together, not connections alone. Parity is the point.
- [x] Kept `custom-authored-connection-recommendations` (the checklist) and
  `custom-signal-creator` (the manual/raw form) as the two connection paths —
  verified live that they already match "recommend defaults" + "manually
  target any portion."
- [x] Added a live-test control to each included row in the part-first
  properties checklist (`renderPartFirstPropertyTest`). Checking a box still
  adds the property immediately at its authored default (unchanged from
  before — no visual difference until touched), but the row now shows a
  value control wired straight to the canonical binding
  (`applyEntryBinding`) plus a Reset button that restores the exact
  authored default captured in `descriptor.source` at accept-time.
- [x] Added the equivalent to the connections form (`custom-signal-creator`,
  `renderCustomSignalLiveTest`) for **input** connections (digital/analog/
  serial) — a value control that live-drives the real preview using the
  same canonical-binding shape the exported runtime uses
  (`customSignalTestEntry`, mirroring `customScopedSignalJavascript`),
  entirely before the connection is added. Output connections (Press/
  Release/Held) were deliberately left to Step 4's existing simulator +
  preview log, which is the better fit for "did it fire," not a value to
  preview.
- [x] Did not build one shared control implementation between properties and
  connections as originally planned — connections need Crestron-range-aware
  value handling (`mapBindingValue`, min/max from the configured
  conversion) that properties don't, and forcing one shape added more
  complexity than it removed. Both call the same canonical
  `applyEntryBinding`/`applyBinding` executor underneath, which is the part
  that actually mattered for consistency.
- [x] Two real bugs found and fixed while building and testing this live
  (not from source reading):
  - **Stale iframe reference.** `refreshCustomPreview()` reloads the
    preview iframe via `srcdoc`, which is asynchronous; both live-test
    renderers had captured `contentDocument` once at render time, which
    runs immediately after a refresh call and can grab the
    about-to-be-replaced document. A test control's first interaction
    silently styled a detached iframe and visibly did nothing. Fixed by
    re-fetching the iframe's document at the moment of each interaction
    instead of once at setup.
  - **Reset didn't reset a native DOM mutation.** The `__preserve__`
    convention (remove the temporary `<style>` element) only undoes
    CSS-declaration effects; it does nothing for a `state-activation`/
    `dom-property` effect that mutates the DOM directly (a checkbox's real
    `.checked`, a class). Connections' Reset was leaving a tested "on" value
    stuck. Fixed by having Reset explicitly apply an off value
    (`false`/`0`/`""` by type) through the canonical binding first, then
    clean up any leftover style.
- [x] Re-ran Phase 0's hand-authored toggle through all of this — checked
  Corner radius, dragged its live-test control from 10 to 2 (preview
  updated), Reset (correctly back to 10); configured the selected-state
  connection, toggled its live-test checkbox (preview showed the selected
  color, checkbox real state changed, **nothing was added yet** — confirmed
  the connections list was still empty), Reset (correctly back to
  unselected); added both connections for real; self-test passed 11/11.
  `npm test` passed in full throughout.

### Phase C — Replace the tests that proved nothing (done 2026-09-04)
Built `tests/part-first-live-app-acceptance.js` instead of a jsdom test as
originally written above. **Why the pivot:** `preview-runtime.test.js`
documents, correctly, that `editor.js` is a single browser-loaded IIFE with
`document`/`window` baked into its top-level scope and cannot be required or
driven headlessly — that's *why* every existing test extracts individual
pure functions rather than running the file. jsdom isn't a dependency of
this project, and even with it added, a simulated DOM would not have caught
two of the three real bugs found this session — the async-`srcdoc`-reload
timing bug and the WebView2-cache staleness that had the whole app running
stale code — since those are specific to how the real WebView2 host behaves,
not to `editor.js`'s logic. A script that drives the actual process is a
better fit for what actually broke here than a simulated DOM would have
been.
- [x] `tests/part-first-live-app-acceptance.js`: syncs `Web/` from the repo
  (same file list the csproj links), restarts the real app with WebView2
  remote debugging enabled (no source changes — see
  `reference_cdp_driving_the_desktop_app` in memory), connects over CDP, and
  drives the exact session from "Phase 0 results" through real DOM
  clicks/inputs — paste → refresh → Parts → check a property + drive its
  live-test control → configure and add a connection → Test & create's
  self-test — with 10 real assertions (crash-free, correct part attribution,
  live preview values, self-test PASSED). Restores the app to a normal,
  non-debug launch afterward either way (`finally`).
- [x] Deliberately **not** added to `npm test` — it launches and stops a
  real desktop process and takes ~15s, which doesn't belong in a fast
  hermetic suite. Documented at the top of the file: run it by hand
  (`node tests/part-first-live-app-acceptance.js`) after any change to the
  custom-component wizard.
- [x] Ran it twice in a row to confirm it's reliably repeatable, not a
  fluke, plus a full `npm test` pass — all green.
- [x] Left the existing string-matching tests in place as a cheap regression
  net for accidental deletions, but they are not evidence a step works —
  this script is.

### Phase D — Re-verify templates and Import & Translate (2026-09-04 — templates good, imports found broken)
- [x] **Starter template — verified good.** Opened the "Toggle Button"
  template live, unmodified: Composer properties correctly preselected 8
  real capabilities across standard *and* selected state (track/handle
  color, corner radius, shadow, border-color, transform — each correctly
  attributed to its part), Crestron connections came with 3 real signals
  already added (Press, Selected, Label), and the self-test **passed 11/11
  with zero manual changes**. Templates genuinely work.
- [ ] **Import & Translate — found real, unshipped breakage**, not just
  unverified. Importing a plain sample button (`<button class="my-btn"
  id="myButton">Click me</button>` with normal CSS) and continuing to the
  Component Workbench produced a Composer properties list with:
  - **A literal `{{text}}` token as a part's displayed name** ("`{{text}}`
    — Text"). Import & Translate tokenizes the source *before* handing it
    to the part-first capability scanner (`{{text}}` in place of the real
    "Click me", `{{BackgroundColor}}`, `{{TextIconColor}}`, etc. in the
    CSS) — the scanner was built and tested against raw authored source and
    has no awareness that Import & Translate's own output is already
    tokenized, so it re-detects the token text as if it were real content.
  - **The same capability duplicated 8 times** ("Component — Text size" ×8,
    "Component — Width" ×8, similarly for Height and Text/icon color).
    Import & Translate emits its own generic, broadly-applicable boilerplate
    CSS rules (e.g. `button,input,textarea,[data-translated-text],
    [data-custom-text],.label,.text,.value{font-size:{{textSize}}px;}`) —
    catch-all styling meant to cover many possible imported shapes, not
    this-button-specific. The capability scanner correctly splits a
    comma-separated selector into one descriptor per branch (needed for
    real cases like `.track, .thumb`), so this one generic rule alone
    explodes into 8 near-identical rows.
  - Confirmed this is a real, reproducible product gap and not a test
    artifact: re-ran in isolation on a freshly-restarted app (ruling out
    stale draft state carried over from an earlier manual test in the same
    session, which did initially produce a misleading result) and got the
    same outcome both times.
  - **Not fixed this session** — this is a real integration gap between two
    subsystems (Import & Translate's own tokenizing/generic-CSS pipeline,
    and the part-first capability scanner built against raw authored
    source), not a one-line bug, and doesn't belong squeezed into whatever
    budget is left after everything above. Likely direction: either have
    the capability scanner recognize and skip Import & Translate's own
    generated tokens/boilerplate selectors (treat them as evidence, not
    editable-value source), or have Import & Translate hand the scanner the
    *pre-tokenization* source and apply its own mappings as already-accepted
    `partCapabilities` entries directly, the way the plan's Phase 5 rule
    ("Carry Import & Translate detections into Parts and capability
    selections without re-inference") actually intends. Needs its own scoped
    pass — proposed as Phase E below rather than rushed here.

### Phase E — Fix Import & Translate feeding the part-first capability scanner (done 2026-09-04)
- [x] **First attempt was wrong, caught before shipping.** Filtered
  `{{token}}`-valued declarations out of `inventoryAuthoredProperties`
  itself (the raw scanner). This fixed the Import & Translate case but
  broke the ordinary case: accepting *any* part-first capability tokenizes
  its own declaration in the source (`materializeAuthoredCssMapping`, e.g.
  `border-radius: 10px` → `border-radius: {{radius}}px`) — filtering at the
  raw-scan level meant the very next render couldn't find that capability's
  own identity in the freshly-generated list, and it immediately flagged
  itself "Source changed — remove this mapping" right after being checked.
  Caught by re-running `tests/part-first-live-app-acceptance.js`, which
  failed at exactly that step — this is the concrete payoff of Phase C.
- [x] **Correct fix**: reverted the raw-scanner filtering, and instead
  filter `materializePartCapabilities`'s final result — drop an entry only
  when it is both *unselected* and token-valued
  (`!entry.selected && /\{\{[^{}]+\}\}/.test(entry.source.value)`), applied
  after the existing accepted/selected-merge logic has already run. An
  already-accepted capability keeps resolving via its saved identity
  regardless of what the source now says (exactly the behavior the
  existing code comment above that merge already documented as
  intentional); only a never-accepted, token-sourced *suggestion* —
  Import & Translate's own tokenized values and generic boilerplate — gets
  hidden.
- [x] Verified live, fresh app, both scenarios: hand-authored toggle
  (`tests/part-first-live-app-acceptance.js`, 10/10) and the Phase D import
  case — properties list is now the single real "Component — Corner
  radius" row (no `{{text}}`, no ×8 duplicates), accepting it shows the
  live-test control correctly (not unresolved), and self-test passes
  (12 properties · 3 signals: the 11 Import & Translate already added,
  plus the one just accepted through part-first). `npm test` green
  throughout.
- [x] Extended `tests/part-first-live-app-acceptance.js` with a permanent
  Import & Translate scenario (`runImportScenario`): imports a plain
  button, asserts the properties list is exactly the one real capability
  (no `{{token}}` label, no duplicates), accepts it and asserts it does
  *not* immediately flag unresolved (the exact regression this test caught
  once already), and asserts the self-test passes. Ran twice back to back
  — 15/15 both times — plus a full `npm test` pass. This scenario is no
  longer only verified by hand.

### Phase 7 — Acceptance and release (done 2026-09-04)
- [x] Physical desktop and touch-panel testing using a custom button, custom
  toggle, custom numeric control, and an imported component — confirmed by
  the user.
- [x] Published as v1.8.0: tagged, GitHub release with MSI + portable ZIP
  (https://github.com/jobu109/crestron-ui-composer/releases/tag/v1.8.0),
  `main` pushed. Release was cut before this hardware confirmation lands,
  matching this project's standing convention (`project_release_process`
  memory) of not blocking `gh release create` on a hardware pass the
  author performs separately — the automated suite plus the two live
  end-to-end CDP scenarios were the bar for what could be verified before
  publishing.

## Status: complete

Every phase above is done and verified — live in the running app, not just
by `npm test`. This plan document's job (as a plan) is finished; treat it
from here as a record of what shipped in v1.8.0 and how it was verified,
not an open checklist.

## Rules (kept from the original plan — still correct)

- HTML, CSS, and JavaScript remain the source of truth for all appearance and
  behavior.
- Composer never creates a visual feature merely because it is common for a
  button or toggle — every capability must resolve to real source evidence.
- Inspector properties and Crestron connections stay separate, but share one
  part/capability binding.
- The standard UI must not make authors choose raw CSS property names —
  except in the explicitly-manual Crestron connection path, which the user
  wants to be able to target any portion of the source directly.
- Advanced mapping remains intentionally explicit and never replaces a basic
  mapping behind the author's back.
- Preview, test controls, saved components, exports, and installed runtime
  must use the same canonical binding executor (`component-workbench.js`).
- A green test suite is not evidence a step works. Only a driven session in
  the actual running app (by hand, or Phase C's real e2e harness) counts.
