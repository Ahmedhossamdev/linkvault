# Release candidate status

LinkVault extension 0.3.0, prepared for manual testing on 2026-10-11. This document is a handoff, not a production-readiness certificate.

## Prepared locally

- Export & backup is a separate tab. Markdown keeps reading-list filters and exports all filtered pages; JSON backs up the whole library.
- Pagination appears above and below links with shared page and size controls.
- Branding, packaged browser icons, local privacy/security/contribution docs, and launch copy are present.
- Synthetic HTML, TXT, and 125-link pagination fixtures are in `examples/`.
- An allowlisted Chromium packaging script creates a ZIP without development settings, tests, or user data.
- A GitHub workflow runs extension and Python tests and produces a testing artifact. It has not run on GitHub yet.

## Verification boundaries

Local result: 76 extension tests passed, two stdlib packaging tests passed, and the three existing Python assertion checks passed via direct invocation. Every file in the 22-file ZIP matched its runtime source when checked. No recognizable credential patterns were found in the reviewed source directories; that limited scan is not an independent security audit.

A focused review found a stale export count after editing a searched title. The fix now refreshes the filtered list, pagination, export summary, and download availability immediately. A regression test covers the reported sequence.

Extension unit/handler tests and packaging tests can run here. Existing Python checks can run directly, but pytest is not installed in this environment. CI installs pytest before running the complete Python suite.

Chromium fixture execution is blocked by this environment: the browser aborts with `sandbox_host_linux.cc`, `Operation not permitted`, and `ECONNRESET`, even with its no-sandbox flag. The fixture tests are maintained, but no live browser or visual-pass claim is made.

No manual release checks have been recorded for Chrome, Edge, Brave, or Opera. Firefox is not ported. No store package has been submitted or approved.

## External blockers

Ahmed created `Ahmedhossamdev/linkvault` using `gh repo create --private` and shared the successful result. Repository URL: https://github.com/Ahmedhossamdev/linkvault. API connections still fail from this restricted environment, so repository visibility cannot be independently checked here. No source was uploaded by the assistant. This checkout exposes no usable Git repository metadata, so no commit or tag was made here.

Verify private visibility on your own machine before uploading the reviewed source. Do not share tokens or upload `.aws`, `.codex`, `.agents`, local environments, or real chats/backups. Changing repository visibility requires a separate decision.

## Your remaining checks

Use [RELEASING.md](RELEASING.md), starting with import, Read state, JSON export, and restoration in a fresh profile. Test the exact extracted ZIP, not only the development folder. Record browser versions, results, and any skipped live-capture tests.

After that: review permission/data-use disclosures, host the privacy policy publicly, capture synthetic screenshots, and decide whether to release a beta ZIP or submit to a browser store. A public LinkedIn announcement should use accurate browser availability and include the live-collection account risk.
