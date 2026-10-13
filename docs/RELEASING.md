# Manual testing and release checklist

Extension 0.3.1 is a testing candidate, not a store release.

## Browser results

Fill in exact versions and actual results. Pending is not a pass.

| Browser | Version / OS | Install | Import / restore | UI / persistence | Live capture, optional | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome | Pending | Pending | Pending | Pending | Pending | Pending |
| Edge | Pending | Pending | Pending | Pending | Pending | Pending |
| Brave | Pending | Pending | Pending | Pending | Pending | Pending |
| Opera / Opera GX | Pending | Pending | Pending | Pending | Pending | Pending |
| Firefox | No compatible package | Blocked | Blocked | Blocked | Blocked | Port required |

## First end-to-end check

Install unpacked in a fresh Chrome test profile. Import synthetic TXT links, mark one Read, export JSON, and restore it in another profile. Confirm URLs, chats, topics, and reading states survive before continuing.

## Manual cases

| Name | Given / action | Expect |
| --- | --- | --- |
| Guide | Fresh profile; finish, skip, replay | Walkthrough preference persists without changing library |
| Imports | Synthetic HTML, TXT, valid and invalid JSON | Expected links; invalid data does not replace saved library |
| Topics / sites | Science video and custom topic | Independent filters; edits survive restart and enrichment |
| Shared links | Same URL in two chats | One overall entry with both origins and shared state |
| Reading | Open new link, then check it | Only explicit marking changes it to Read |
| Compact rows | Long title and URL | Two visible title lines; full editable title; visible URL |
| Pagination | More than 100 links | Ten rows by default; top bar remains visible while scrolling; top/bottom controls share page and size; exports include all filtered pages |
| Export tab | Filter reading list; switch to Export & backup | Summary matches filters; Markdown includes all filtered pages; JSON includes whole library |
| Theme / layout | Light, dark, keyboard, narrow window | No overlap or horizontal overflow; usable focus |
| Reports | Change states and delete | Correct current counts; shared links count once overall |
| Delete / undo | Delete shared URL; recapture; undo | Excluded from recapture; membership/state restored by undo |
| Short links | Resolve into existing destination | No lost edits or progress; unavailable pages remain usable |
| Backup merge | Conflicting local and incoming state | Current local progress and deletion exclusions retained |
| Duplicate dashboard | Open second dashboard manually | Only owner can edit library |
| Persistence | Close/reopen browser | Acknowledged saved data remains |
| Manual capture, optional | Accept risk; Start on one chat | Watches without scrolling; no startup tab bounce |
| Automatic capture, optional | Fast / Gentle; Stop | Older-message scrolling, visible progress, final save |
| Interrupted capture, optional | Leave chat or close source | Capture stops; already-saved data remains |
| Diagnostics, optional | Capture problem | Useful layout data without text or URLs |

Skip live cases if you do not accept the platform risk, and record Not tested. No test proves ban immunity or complete chat capture.

## Private source repository

- Restore GitHub authentication and create the repository explicitly as private.
- Review files and any Git history for private data before uploading.
- Exclude `.aws`, `.codex`, `.agents`, credentials, local environments, real chats, and personal backups.
- Upload an explicit reviewed file set, not an entire workstation directory.
- Verify private visibility. Making it public is a separate decision.

## Release package

Run `python scripts/package_extension.py` from the root. It creates `dist/linkvault-chromium-0.3.1.zip` and prints its SHA256. Existing outputs are not overwritten: use `--output /path/to/a/new-name.zip` for another candidate. Extract the ZIP to a new folder and load that folder unpacked for manual testing.

Use the [synthetic examples](../examples/README.md) when testing without private chat data. The release status and remaining checks are recorded in [RELEASE_STATUS.md](RELEASE_STATUS.md).

- Run extension unit tests and browser fixtures where Chromium can launch.
- Run Python tests if releasing the CLI too.
- Update docs with actual UI and recorded browser results.
- Package runtime extension files, the manifest, license, and the entire `icons/` directory. Exclude tests, development metadata, credentials, real chats, and backups.
- Load the exact packaged contents unpacked; repeat the first end-to-end check.
- Prepare synthetic screenshots and a short demo. Do not expose friends' messages or chat identifiers.
- Label downloads as pre-release until checks are complete. Do not claim store availability before approval.

## Browser stores, later

Chrome Web Store, Edge Add-ons, Firefox Add-ons, and Opera Add-ons are separate submissions. No submissions are made by this checklist.

Chrome needs icons, screenshots, a clear single-purpose description, a public privacy-policy URL, and accurate permissions/data-use disclosures. Check the current [publishing guide](https://developer.chrome.com/docs/webstore/publish) and [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy). Approval is not guaranteed and would not establish LinkedIn policy compliance.

Firefox first needs a compatible package and manual results. See Mozilla's [Manifest V3 guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) and [distribution guide](https://extensionworkshop.com/documentation/publish/distribute-your-extension/). Do not advertise a Firefox download while only the Chromium package exists.
