# Release checklist

Use this checklist for the next beta and again before promoting that beta to stable.

## 1. Source and automated checks

- [ ] Confirm `git status --short` contains only intended release changes.
- [ ] Run `npm test` and confirm all regression, widget-audit, and continuity checks pass.
- [ ] Build and launch the desktop application with `./build-desktop.ps1`.
- [ ] Run **Project → Export/build self-test** and save the report.

## 2. Representative project checks

- [ ] Open a representative project with contracts, multi-device widgets, assets, responsive overrides, custom fonts, timelines, and actions.
- [ ] Run **Project → Health check** and resolve blocking errors.
- [ ] Run **Project → Panel performance** and review every high-cost finding on the lowest-powered target.
- [ ] Export the signal schedule and compare the generated `.cce` or `.cse2j` in Signal Manager.

## 3. CH5 runtime checks

- [ ] Build one CH5Z from the exact project under test.
- [ ] Inspect that CH5Z in the Deployment dialog and confirm index, CrComLib, Web XPanel, worker, contract mapping, target, and viewport.
- [ ] Open the same CH5Z in CH5 Desktop.
- [ ] Confirm the processor login prompt appears.
- [ ] Verify digital, analog, serial, navigation, repeated-item, and multi-device communication.
- [ ] Deploy the same CH5Z to a TSW-1070.
- [ ] Verify installation, startup, page changes, scrolling, animations, feedback, and output events.
- [ ] Confirm Deployment History records a successful result and that rollback can validate the backup package.

## 4. Installer checks

Build the candidate packages:

```powershell
./build-installer.ps1 -Version 1.4.0
```

Run the isolated upgrade test. It installs a separate test product, verifies replacement of application files, preserves user data, checks uninstall behavior, and cleans itself up:

```powershell
./test-installer-upgrade.ps1 -OldVersion 1.3.0 -NewVersion 1.4.0
```

- [ ] MSI was produced in `dist/installer`.
- [ ] Portable ZIP was produced in `dist/installer`.
- [ ] Isolated clean installation passed.
- [ ] Upgrade from 1.3.0 passed.
- [ ] User data survived upgrade and uninstall.
- [ ] Manual launch from a newly installed MSI passed.
- [ ] `.cuiproj` file association opened the installed application.

## 5. GitHub beta

- [ ] Update application/package/installer versions consistently.
- [ ] Commit only intended files; do not include local editor or assistant settings.
- [ ] Tag the release candidate.
- [ ] Publish MSI and portable ZIP as a GitHub prerelease.
- [ ] Use `RELEASE_NOTES_1.4.0-beta.1.md` as the initial release description.

## 6. Stable promotion

- [ ] No blocking beta reports remain.
- [ ] Repeat automated, installer, CH5 Desktop, and physical-panel checks using the final commit.
- [ ] Publish the stable tag and assets.
- [ ] Mark the GitHub release as stable.
