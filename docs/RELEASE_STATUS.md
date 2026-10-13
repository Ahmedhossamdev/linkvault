# Release candidate status

LinkVault extension 1.0.0, prepared as the first GitHub release on 2026-10-13. It is a manual-install release, not a browser-store release.

## Implemented

- Four main sections: Reading list, Collect, Backup & restore, and Reports. Help contains the walkthrough.
- Warm editorial light/dark themes with paper panels, rust accents, compact cards, local site badges, and reading-state colors. No remote image requests were added.
- Clear reading scope, removable filters, expandable topic/site navigation, chat renaming only for selected chats, ten-link pages, and sticky navigation.
- Selected chats can be deleted without removing shared links. Custom topics can be added, assigned per link, backed up even when empty, and deleted by moving their links to Unsorted.
- JSON restoration alongside downloads. Markdown imports titles, heading topics, and links; new items start To read.
- Confirmed Delete all links with a full-library count, optional JSON backup, typed confirmation, and no bulk Undo.
- Bulk deletion clears links, context, deletion exclusions, and legacy recovery data while preserving chat metadata and preferences. Failed writes do not replace the existing library.
- Finished capture sessions are invalidated before imports and bulk deletion so delayed packets cannot overwrite restored data or resurrect links.
- Toolbar clicks on the dashboard preserve it. Stale source IDs receive reconnection instructions instead of raw browser errors; no other chat is selected automatically.
- The sun/moon SVG visibility issue found in browser screenshots is corrected.
- The library remains version 2 and keeps the existing local-storage/portable-backup contract. No new permissions, runtime dependencies, servers, or accounts were added.

## Verification

All 155 extension tests, two stdlib packaging tests, and three existing Python assertion checks passed locally. Pytest is not installed here; the Python assertions were invoked directly with the source path configured. CI installs pytest.

Synthetic Chromium fixture checks passed outside the restricted sandbox. They cover imports, URL/title preservation, explicit reading states, downloads, JSON/Markdown restore, deletion confirmation/cancellation, restore after bulk deletion, sticky pagination, theme-icon visibility, controlled manual/automatic capture, and narrow layouts. Synthetic light/dark screenshots were inspected.

These fixtures use a Chrome API shim and invented conversations. They do not prove real LinkedIn compatibility, account safety, every supported browser, or store acceptance. The user reported that launching from the active full LinkedIn conversation worked before this update. Full manual release checks remain in [RELEASING.md](RELEASING.md).

## Source and publishing

The repository is https://github.com/Ahmedhossamdev/linkvault. Earlier changes were committed and pushed through 69791b7. The current 1.0.0 changes need a commit, push, GitHub Actions result, and GitHub Release before this status is updated to published.

The Chromium package is produced with the runtime allowlist in scripts/package_extension.py. Load the exact extracted testing ZIP in a separate profile and restore your JSON backup there. Keep your original profile and backup untouched until restoration is verified.

The local `dist/linkvault-chromium-1.0.0.zip` contains 22 runtime files verified against the current source. SHA256: `b881986ae81d70bf1e23b25f9e2146538704d92c9973cd6975344dbfbee970a9`. Upload this exact file as the GitHub Release asset.

No store submission was made. Firefox is not ported. Publishing the source publicly or submitting to browser stores remains a separate decision.

## Remaining

- The requested warm editorial direction is implemented. Manually check the light and dark layouts in your browser before release.
- Test the exact 1.0.0 package in real Chrome, including your source-tab permissions and backup restoration.
- Record browser versions and results.
- Before a store submission, prepare the listing, synthetic screenshots, permission/data-use disclosures, and a public privacy-policy page.
