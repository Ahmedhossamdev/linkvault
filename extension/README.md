# LinkVault browser extension

Your friends send you articles. You send back "I'll read this later." Later needs somewhere to live.

Keep shared links in a local reading library, track reading progress, and export Markdown for Obsidian. This is a dependency-free Manifest V3 extension. Python is not required. No promise that installing it will make you read everything.

## Release status and browsers

Version 0.3.0 is a pre-release for manual testing, not a browser-store release. Browser-specific release results have not been recorded yet.

| Browser | Extensions page | Status |
| --- | --- | --- |
| Chrome | `chrome://extensions` | Primary target; manual release checks pending |
| Edge | `edge://extensions` | Chromium test target; unverified |
| Brave | `brave://extensions` | Chromium test target; unverified |
| Opera / Opera GX | `opera://extensions` | Chromium test target; unverified |
| Firefox | No compatible package | Port and testing required |
| Safari / mobile | No package | Not supported |

Chromium architecture does not prove compatibility with every browser. See the official guides for [Edge sideloading](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading), [Brave extensions](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave), and [Opera testing](https://help.opera.com/en/extensions/testing/).

Firefox is not supported by the current manifest, which declares a Chrome background service worker. Mozilla's [Manifest V3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) describes its event-page background model. A Firefox release needs a compatible manifest, API and permission checks, persistence tests, packaging, and signing. Renaming this package to an XPI is not a Firefox port.

## Install locally

1. Open your browser's extensions page from the table above.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension` directory.
4. Pin LinkVault to the toolbar and click its icon. Follow the first-open walkthrough, or skip it and replay it later from Guide.

This version targets Chrome and Chromium version 123 or newer. Firefox packaging has not been implemented or verified. No store publication is included.

After updating the extension files, click **Reload** on its card in `chrome://extensions`, refresh the LinkedIn conversation tab, and open LinkVault again. Refreshing replaces any collector code already injected into that page.

## Choose a collection method

### Live collection

Open a conversation on LinkedIn's full messaging page and click the LinkVault toolbar icon. A separate dashboard opens and remains connected to the original LinkedIn tab. Open **Collect** and optionally enter a chat name. Existing threads reuse their saved chat. Rename one by selecting it in the sidebar. **Return to LinkedIn conversation** takes you back to the source. Manual activates the source only after successful startup; automatic activates it before detecting scrolling. The full messaging conversation takes precedence over floating chats; close extra chats when they are ambiguous. Acknowledge the risk notice and choose:

- **Manual:** scroll the conversation yourself while LinkVault collects links from loaded messages.
- **Automatic:** LinkVault scrolls toward older messages immediately, then every 0.75 seconds by default. Choose **Gentle** for a two-second interval on slower connections. Each step overlaps the previous viewport to retain links from virtualized messages. Standard and reversed message lists are supported. The 30-second idle pause and ten-minute limit are based on elapsed time and remain unchanged at either speed. Press **Stop** in the dashboard at any time.

Links are captured incrementally, including before old messages disappear from a virtualized message list. Leaving the source conversation, closing its tab, or closing the dashboard stops collection. Restarting merges links into the saved collection. Stop collection before editing or exporting.

A small LinkVault panel appears at the bottom-left of the LinkedIn tab while collecting. It shows elapsed time, acknowledged saved-link counts for the whole collection, and successful scroll steps for the current session. Its activity state distinguishes scrolling, waiting for older messages, manual watching, saving, paused, and interrupted collection. Press **Stop collection** directly in this panel. When stopped, the elapsed timer freezes and the panel remains until you dismiss it. The dashboard shows the same session progress. It does not estimate completion percentages or remaining time because the total history is unknown.

**Stop** flushes links from the currently loaded messages to local storage before acknowledging the stop. Closing a tab or the browser unexpectedly retains already-saved links but may lose the latest unsaved batch. Reopening LinkVault restores the saved collection. Start again to collect more links and merge duplicates; LinkVault does not restore an exact scroll checkpoint.

Neither mode guarantees complete history. A slow connection, browser timer throttling, or changed LinkedIn markup can stop collection early. Sender and date fields are best-effort and may be missing. Keep the source tab open, review the collection, and retry if needed.

If the page does not move, return to the dashboard and check its status. **Show scrolling diagnostics** displays the active mode, running state, detected message counts, container dimensions, overflow settings, and the last requested and actual scroll positions. It excludes message text and URLs. Copy these diagnostics when reporting a scrolling bug. If a container rejects scrolling, collection pauses with an explicit error instead of claiming that history is loading.

**Account risk:** LinkedIn [prohibits extensions that scrape or automate activity](https://www.linkedin.com/help/linkedin/answer/a1341387). Both live modes may violate its rules. Manual scrolling, collecting your own conversation, or adding delays does not guarantee protection from restrictions. LinkVault makes no claim that live collection is approved or ban-proof. It does not bypass rate limits, login challenges, or detection.

### File import

Import saved chat HTML, a text link list, or a LinkVault version 1 or version 2 JSON backup. HTML, TXT, and old collection backups each create a chat, using your optional chat name or the filename. A version 2 backup merges its original chats and reading states into your library. File import does not connect to LinkedIn or inject anything into its page. The extension cannot verify whether the original file was obtained in accordance with platform rules.

HTML extraction prefers LinkedIn message bodies. When their markup is missing, it falls back to candidate links from the page and displays a warning. Review the result to remove navigation or unrelated links. Supported import formats are HTML, TXT, and LinkVault JSON, not LinkedIn archive ZIP or CSV.

### Official message archive

LinkedIn's [Download your data](https://www.linkedin.com/help/linkedin/answer/a1339364/down-your-account-data) documentation lists Messages as including sent, received, and archived message content and dates, with availability within 48 hours. Request it through **Settings & Privacy > Data Privacy > Download your data**, using the larger archive if Messages is not available as a separate category. Processing an exported archive would avoid scrolling through the browser's message history. Archive ZIP/CSV import and conversation selection are not implemented in this extension yet.

## Reading library

**All chats** is the general reading list. Shared URLs appear once with their originating chats and one reading state. Filter independently by chat, subject topic, site, reading state, or search. Local suggestions cover programming and broader subjects such as science, books, health, finance, travel, food, art, and music. Suggestions are imperfect: enter custom topics in Edit title & topic. Edited topics survive enrichment and backup restoration. YouTube and GitHub are site filters, not subject topics. There is no AI labeling.

The interface uses a paper-like light theme and neutral dark theme, local system fonts, serif titles, and visible monospace URLs. Use the header's sun/moon button to switch themes; your choice is remembered. Compact titles show at most two lines, with full titles retained in the editor and hover tooltip. Footer links point to Ahmed's blog, GitHub, LinkedIn, and Buy Me a Coffee. **Collect links** opens the separate Collect tab. Guide contains permanent instructions and a replayable walkthrough.

The folded-page icon and bookmark cutout are LinkVault's own mark. Browser icons are packaged at 16, 32, 48, and 128 pixels. See the [identity guide](../brand/IDENTITY.md) for artwork and usage.

Reports shows current To read, Reading, Read, and Archived counts across the whole library, with chat and topic breakdowns. Shared links count once overall and once in each originating chat. Deleted links do not count. Archived is a separate state, not evidence of reading. Dates, streaks, lifetime totals, and verified reading are not tracked.

Open **Export & backup** for downloads. Its summary shows how many links Markdown will export from your current reading-list filters, and how many links the full JSON backup contains. Switching tabs preserves filters. Pagination appears above and below the links; both controls share the same page and page size.

The list renders 25 links per page by default, with 50 and 100 also available. Compact page controls show the current range and support keyboard navigation. Changing a filter or page size returns to page one. Reading states persist across pages. Markdown and optional title fetching operate on the full filtered list, not only the visible page; a JSON backup always includes the full library.

- **To read**, **Reading**, **Read**, and **Archived** are explicit, editable states. Opening a page does not claim you have read it. **Active** hides archived links; **Archived** and **Everything** let you find and restore them.
- **Delete** removes a link from all chat views. Deleted URLs are excluded from future collection and backup imports. **Undo last deletion** restores its state and chat memberships until you close the dashboard or delete another link. Archive a link instead if you might want it later.
- Edit titles and topics under each link's metadata control. A link's checkbox means **Read**: new links are unchecked, checking marks a link Read, and unchecking resets it to To read. Reading and Archived remain unchecked. This reading state is shared across chat views. Checkboxes are not export selection controls.

URLs are deduplicated with tracking parameters removed. Case-sensitive paths, meaningful query parameters, and fragments are preserved. LinkedIn post links are retained; profile and navigation links are filtered out. Different short URLs pointing to the same destination can remain separate until you resolve them with optional enrichment. Resolving a URL into an existing item merges its chat memberships and context, preserving that destination item's reading state. Resolved short URLs are retained as aliases, so recapture does not create an unread duplicate. Aliases travel in backups and are excluded when deleting their article. Resolving to a deleted destination removes the short-link entry instead of resurrecting that article.

## Storage, backups, and moving browsers

The simplest architecture is local-first: no sign-in, hosted database, automatic cloud sync, or LinkVault account. One version 2 library is stored in `chrome.storage.local`, on your device inside the current browser profile. It persists across browser restarts, but is not a file in your Documents folder and does not sync through your browser account. Different profiles and browsers have separate libraries.

- **Download Markdown:** all pages of the current filtered view, grouped by subject topic and annotated with reading states. Read and unread links are both exported. Save the `.md` file inside your Obsidian vault. Context is excluded unless you enable it. Markdown is not a full-fidelity backup.
- **Back up full library (JSON):** all chats, links, URL aliases, categories, reading states, captured message context, legacy selections, and deleted-URL exclusions, regardless of the current filters. Store it wherever you keep your personal backups.
- **Move to another browser or computer:** download the JSON backup, install LinkVault in a supported Chromium browser, and import that file. An empty library restores all exported data. Importing into an existing library merges URLs and chat memberships, keeping the current local reading state and deletion exclusions when they conflict. There is no automatic two-way synchronization.

Uninstalling the extension or clearing its browser data can erase the library. Back up before doing either. Backups are not encrypted and may contain private messages. Local storage also has a browser-managed quota; if saving fails, the dashboard reports an error and the collector stops rather than acknowledging an unsaved batch. Export a backup promptly if you see a storage error.

Previous version 1 collections migrate automatically into a chat named after the collection, without losing title edits, selections, or captured context. The old storage snapshot is retained for recovery, so library deletion is not secure erasure of that legacy snapshot or previously downloaded files. Clearing the extension's browser data removes its local snapshots. Invalid saved libraries are not silently replaced. Clicking the toolbar opens a fresh dashboard and closes the previous one; the library remains.

Automatic file backup and cloud sync are not implemented. Chrome/Chromium is the current target; the browser table distinguishes test targets from verified release results. A portable backup format does not imply Firefox packaging is ready.

## Optional enrichment

**Fetch titles for filtered list** requests HTTPS site access, then visits URLs across all pages of the current filtered list without login cookies. It can resolve `lnkd.in` interstitial links and ordinary redirects. Links behind authentication or unavailable sites are retained. Requests have a twenty-second timeout and a bounded response size. Requests run sequentially; a large collection can take time. Leave the dashboard open until it finishes. Current topic suggestions are refreshed from fetched titles.

This action contacts the filtered websites. It is optional; capture, local keyword labeling, and export work without it. HTTP public URLs are not granted access by this feature.

## Organize the Markdown with AI

Download the Markdown collection and open it in Obsidian, or give it to your preferred AI tool to suggest topics, tags, summaries, or a reading plan. The extension does not include an AI integration or ask for an API key.

For example, use this prompt with your exported file:

> Group these links by topic and suggest Obsidian tags. Keep every original URL unchanged. Return Markdown, and do not invent summaries for pages you have not read.

Review the results before replacing your notes. Message context is excluded from Markdown by default. If you included it, review the file before sharing it with an external AI service.

## Privacy and permissions

- `activeTab` and `scripting`: inject the collector into the tab where you invoked the toolbar action, only when you start collection.
- `storage`: retain the library on your device in this browser profile. This is not encrypted storage. Clear the extension's browser data when you no longer want its stored context or migration snapshot saved.
- Optional HTTPS host permissions: requested for title fetching. Capture itself does not call hidden LinkedIn APIs or read cookies.

No analytics, remote extension code, accounts, or LinkVault server. Exports may contain private conversation information. Avoid committing real chats, backups, or browser profiles to the repository.

## Development and verification

Run `npm test` inside this directory with Node 24 or newer. Tests use Node's built-in test runner with `--test-isolation=none`. There is no build step or runtime dependency.

Browser fixture tests can be run with `node tests/browser.mjs`; set `LINKVAULT_BROWSER` to a Chromium or Chromium headless-shell executable if `chromium` is not on your PATH. These use synthetic conversations and a browser API shim, not your LinkedIn account. They cannot prove compatibility with live LinkedIn or eliminate account risk.

Before releasing, follow the [manual test and release checklist](../docs/RELEASING.md) and record browser versions and actual results. Live testing is optional and carries account risk. Live selectors need maintenance when LinkedIn changes its page. See [privacy](../PRIVACY.md), [contributing](../CONTRIBUTING.md), and [security reports](../SECURITY.md).

Create a Chromium testing ZIP from the repository root with `python scripts/package_extension.py` (Python 3.10+). The script uses an explicit runtime allowlist, rejects symlinked sources, and refuses to overwrite an existing output. It prints the ZIP's SHA256. Extract the ZIP into a new directory and load that directory unpacked. It is not a Firefox package or proof of store approval.

Synthetic import files are available in [examples](../examples/README.md). The GitHub workflow runs extension tests, Python tests, and packaging after this source is uploaded. A workflow file on disk is not a successful CI run.

## License

MIT, under the included [LICENSE](LICENSE). This directory can be distributed separately from the Python project.
