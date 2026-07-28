# Crestron UI Composer 1.4.0-beta.1

This beta focuses on project safety, contract engineering, responsive design, deployment reliability, and release validation. It contains the accumulated work completed after the 1.3.0 release.

## Project safety and recovery

- Added rotating, integrity-checked recovery snapshots with crash-aware recovery.
- Expanded undo/redo coverage across widget properties, signals, layouts, responsive overrides, assets, reusable designs, custom components, timelines, actions, and page operations.
- Added named history entries with timestamps.
- Added navigable Project Health findings and safe, undoable quick fixes.
- Added Export/Build Self-Test coverage for save, recovery, export, runtime, and CH5 packaging gates.

## Project creation and reusable design

- Added editable Blank, Conference Room, Classroom, and Multi-Room starter projects.
- Added versioned `.cuilibrary` import/export for reusable designs, page templates, custom components, themes, assets, and fonts.
- Library imports are non-destructive and remap conflicts instead of replacing built-in widgets.

## Responsive workflow

- Added side-by-side Responsive Compare previews.
- Missing target overrides are highlighted.
- Added copy-layout and breakpoint-family workflows for compact touch panels, HD/iPad layouts, and large displays.
- Added batch Fit and Validate for supported targets.
- Corrected scrolling widgets so bounded horizontal/vertical scrolling remains intact beside global glow and press effects.

## Contract and signal engineering

- Expanded Signal Manager with page/widget maps, address maps, Where Used, global rename/refactor, join allocation, and standardized contract-name generation.
- Added SIMPL Preview using the same hierarchy generated for Contract Editor export.
- Added `.cce` and `.cse2j` comparison for missing, extra, and mismatched signals.
- Added human-readable signal schedule export alongside CSV export.
- Added validation for duplicate, invalid, unbound, and Contract Editor-incompatible signal definitions.

## CH5 runtime and deployment

- Corrected CH5 Desktop/Web XPanel startup so processor-injected configuration is loaded before communication initialization.
- Added CH5Z structural inspection, runtime checks, target metadata, contract-state/event counts, and package hashing.
- Added build-artifact provenance tied to the current project fingerprint and target panel.
- Deployment now records the actual terminal result, device, package, hash, log, and exit status.
- Added verified rollback to a previously successful deployment package.
- Preserved complete deployment output and authentication prompts.

## Validation and performance

- Added a persistent cross-runtime acceptance checklist covering Editor, Preview, CH5 Desktop, TSW-1070, portable packages, components, and contracts.
- Added target-aware Panel Performance profiling for page complexity, simultaneous widgets, animation load, CSS filters, custom frames, and embedded assets.
- Performance metrics include definitions, recommended/caution/high guidelines, and navigable findings.
- Added Release Readiness gates for Project Health, contracts, acceptance evidence, performance, a current build artifact, and verified deployment.

## Testing

- Regression coverage now includes project migration, recovery, undo history, libraries, starter projects, responsive layouts, deployment rollback, CH5 package inspection, Signal Manager tools, contract comparison, performance profiling, release readiness, fonts, and acceptance workflow.
- The catalog audit exports and compiles all 102 widget definitions.
- Component continuity checks cover 66 component scripts.

## Beta validation requested

- Run the Acceptance Test workflow in Editor and Preview.
- Open the same CH5Z in CH5 Desktop and verify login plus digital, analog, serial, page, and multi-device signals.
- Deploy to a TSW-1070 and verify startup, touch response, scrolling, animations, and signal communication.
- Run Panel Performance and Release Readiness against a representative full project.
- Verify clean installation and upgrade from 1.3.0 using `RELEASE_CHECKLIST.md`.

This is a prerelease. Promote it to stable only after the clean-install, upgrade-install, CH5 Desktop, and physical-panel checks pass.
