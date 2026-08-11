# Component Workbench UX Baseline

Recorded: 2026-08-10

This document freezes the user-visible workflow immediately before the Component Workbench UX Improvement Plan begins. It describes behavior rather than prescribing the redesigned interface.

## Current workflow

1. Step 1 imports source or creates a starter and proposes detected properties and signals.
2. Step 2 exposes Editable properties, Crestron connections, States & modes, Repeated items, source editors, and Advanced technical mappings.
3. Component Parts can be detected, entered manually, or picked from a focused Live Preview.
4. Highlight opens the preview and outlines the matched part for ten seconds. Hidden controls attempt to highlight a visible label, sibling, or parent.
5. Step 3 presents Live Preview, signal controls, state simulation, compatibility results, readiness findings, and component creation.

## Existing strengths to preserve

- Authored HTML, CSS, JavaScript, animations, and state transitions remain intact.
- Generated adapters remain separate from authored source.
- Parts, properties, connections, states, repeated collections, and adapter rules persist in the versioned Workbench schema.
- Digital, Analog, and Serial simulation exists.
- Validation distinguishes blocking failures from review findings and provides repair-location navigation.
- Runtime checks cover multiple instances, resizing, remounting, package round trips, and Widget List inclusion.

## Known usability problems

- Component Parts are presented as a flat technical list rather than a semantic visual tree.
- Some selectors refer to hidden controls; their relationship to the visible track, handle, label, or container is not always obvious.
- Highlight can identify a visible surface but does not yet synchronize hover and selection between a persistent map and preview.
- The selected part and state do not consistently follow the user through every property and connection workflow.
- Common mappings still expose technical terminology and too many fields at once.
- Property and connection testing is concentrated in the final screen instead of appearing immediately beside each new mapping.
- Dynamically generated elements may require the live picker after their JavaScript runs.
- Validation navigation can reach the relevant section without making the exact field and corrective action sufficiently obvious.
- Original-versus-Composer state comparison is not available side by side.

## Baseline fixture coverage

- Button containing both icon and label
- Checkbox toggle containing hidden input, visible container, track, handle, and label
- Animated morphing button
- Analog slider/fill control
- Text input
- JavaScript-generated repeated list
- Advanced JavaScript/observer/animation component
- Delayed JavaScript-generated control

## Acceptance boundary

The UX redesign may reorganize and simplify these workflows, but it may not remove existing mapping types, manual source access, runtime checks, package compatibility, or authored behavior.
