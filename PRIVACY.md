# Privacy

LinkVault stores its library in the extension's local browser-profile storage. There are no LinkVault accounts, analytics, hosted database, automatic cloud synchronization, or model calls.

## Stored data

URLs, titles, topics, reading states, chat names and membership, URL aliases, and deletion exclusions. Captured sources can include message text, sender names, and dates. Theme and walkthrough preferences are also saved. A legacy collection snapshot can remain for migration recovery.

Storage and exported backups are not encrypted. Do not assume they protect data from someone with access to your browser profile or downloaded files.

## Permissions and network activity

- `activeTab` and `scripting` inject the live collector into the source tab when collection starts.
- `storage` persists the library and preferences.
- Optional HTTPS site access enables title fetching. That action contacts filtered websites without login cookies. Websites can observe request metadata such as your IP address.

Live collection reads loaded page content, not hidden LinkedIn APIs or browser cookies. File import parses selected files locally. Article and creator links contact external websites when clicked. There is no remote extension code.

## Exports and deletion

Markdown excludes message context by default; the context option includes it. Full JSON backups include stored context. Treat them as private data.

Delete removes an item from the active library and excludes known URLs against recapture. Undo is session-limited. Deletion does not erase downloaded backups or the retained migration snapshot. Clearing extension data or uninstalling can erase local snapshots, not files exported elsewhere. Back up first if you want to retain your library.

The separate **Delete all links** action requires confirmation and overwrites the saved library's links and exclusions, plus the retained legacy collection value. Chat metadata and preferences remain. Bulk deletion has no Undo; restore from a JSON backup if needed. It does not erase copies in downloaded backups or guarantee physical secure erasure of browser storage.

Do not attach real chats, full backups, browser profiles, or credentials to public issues. Use synthetic examples and redacted diagnostics. See [SECURITY.md](SECURITY.md).
