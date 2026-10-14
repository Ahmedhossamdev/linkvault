# LinkVault browser extension

Friends send you articles. You say "I will read this later." This tool gives "later" a home.

Save links from chats on your own computer. Track what you read. Export to Markdown for Obsidian. No extra installs. No Python needed. It will not make you read everything, but it will keep the links safe.

## Release status and browsers

Version 1.0.0 is for hand testing from GitHub. It is not in any browser store yet. Lab tests pass in Chromium, but that does not mean it works with live LinkedIn in all browsers.

| Browser | Extensions page | Status |
| --- | --- | --- |
| Chrome | `chrome://extensions` | Main target, hand tests still pending |
| Edge | `edge://extensions` | Should work, not verified |
| Brave | `brave://extensions` | Should work, not verified |
| Opera / Opera GX | `opera://extensions` | Should work, not verified |
| Firefox | No working package | Needs extra work and testing |
| Safari / phones | No package | Not supported |

Chrome code does not prove other browsers work. See the official guides for [Edge sideloading](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading), [Brave extensions](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave), and [Opera testing](https://help.opera.com/en/extensions/testing/).

Firefox needs a new manifest, new permission checks, and full testing. Just renaming this file does not make it work in Firefox. See Mozilla's [Manifest V3 guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/).

## Install by hand

1. Open your browser extensions page from the table above.
2. Turn on Developer mode.
3. Click **Load unpacked** and pick this `extension` folder.
4. Pin LinkVault to the toolbar and click it. Follow the short tour, or skip it and replay it later from Help.

You need Chrome or Chromium 123 or newer. There is no store version.

If you change the files, click **Reload** on the extension card in `chrome://extensions`, refresh the LinkedIn chat tab, and open LinkVault again.

## How to save links

You have two ways: live collect from LinkedIn, or import a file. File import is the safe way.

### Live collect from LinkedIn

Open a chat on the full LinkedIn messages page. Click the LinkVault icon. A new LinkVault window opens. It stays linked to the LinkedIn tab. Open **Collect** and type a chat name if you want. Old chats are reused. You can rename a chat in the side bar. **Return to LinkedIn conversation** takes you back.

Close extra small chat popups. Use the full messages page. Then read the risk note and pick:

* **Manual:** you scroll up yourself. LinkVault saves links from what you load.
* **Auto:** LinkVault scrolls up for you. Normal speed is every 0.75 seconds. **Gentle** is every 2 seconds for slow nets. It stops after 30 seconds with no new messages, or after 10 minutes max. Press **Stop** any time.

What to know:

* Links save as you go, even if old messages vanish from view.
* If you leave the chat, close the tab, or close LinkVault, saving stops. Start again to save more. Old links stay, new links are added.
* Stop saving before you edit or export.
* A small panel shows at the bottom left of LinkedIn while saving. It shows time, saved links, and scroll steps. You can press **Stop collection** there too. It does not show percent or time left, because we do not know how big your chat is.
* **Stop** first saves what is on screen, then stops. If the browser crashes, saved links stay, but the last small batch may be lost.
* No mode saves full history every time. Slow net, paused tabs, or LinkedIn changes can stop it early. Sender and date may be missing. Keep the tab open, check the result, and try again if needed.
* If the page does not move, open the dashboard and click **Show scrolling diagnostics**. It shows mode, message counts, and scroll numbers. It has no message text or links. Copy it when you report a bug.

**Account risk:** LinkedIn [does not allow tools that scrape or auto scroll](https://www.linkedin.com/help/linkedin/answer/a1341387). Both live modes can break its rules. Manual scroll, your own chats, or slow delays do not keep you safe. LinkVault does not skip limits or hide from LinkedIn. It is not approved by LinkedIn.

### File import (safe)

Use **Collect** for saved chat HTML or TXT link lists. Use **Backup and restore** for LinkVault JSON backups or Markdown files. After import, LinkVault opens Reading list so you can see the result. Old links stay, new links are added. File import never touches LinkedIn.

HTML import first looks for LinkedIn message text. If it is missing, it takes other links from the page and warns you. Check and remove bad links. LinkedIn archive ZIP or CSV import is not ready yet.

### Bring back JSON or Markdown

In **Backup and restore**, pick a `.json`, `.md`, or `.markdown` file.

* JSON version 2 keeps chats, reading states, name changes, edits, message text, and deleted link rules. Old version 1 files still load their links. Your current reading state wins if the same link is in both.
* Markdown loads web links and headings. The first big title becomes the list name. Smaller titles become topics. You can change the name before you pick the file. New links from Markdown start as **To read**. Markdown cannot bring back chat names, aliases, history, or private text. Use JSON for a full restore.
* Bad files change nothing. Your current list stays safe.

Markdown export uses `<...>` links so brackets in URLs still match on reimport. Pictures, code blocks, and plain URLs in text are skipped. Use TXT for a plain URL list.

### If the LinkedIn tab is lost

Always start LinkVault by clicking its icon while the LinkedIn chat tab is open. If you restarted Chrome, the old dashboard may point to a closed tab. Open the chat and click the icon again. You will see how to reconnect. Clicking the icon while on LinkVault does not switch chats by itself.

### LinkedIn data download

LinkedIn lets you download your messages in **Settings and Privacy > Data Privacy > Download your data**. See [Download your data](https://www.linkedin.com/help/linkedin/answer/a1339364/down-your-account-data). It can take up to 48 hours. LinkVault cannot read that ZIP or CSV yet.

## Reading list

**All chats** shows everything. Each link shows once, with its chats and its reading state. You can filter by chat, topic, website, reading state, or search text. Topic hints cover code and common topics like science, books, health, money, travel, food, art, and music. Hints can be wrong. Type your own topic in Edit title and topic. Your edits stay after title updates and backups. YouTube and GitHub are website filters, not topics. There is no AI tagging.

Light and dark modes are both supported. Main pages are **Reading list**, **Collect**, **Backup and restore**, and **Reports**. Help has guides and the replayable tour. Each page starts at the top. Small chips show which filters are on. You can remove them. Buy Me a Coffee and theme switch stay in the top bar.

Chat tools:

* Use **Chat settings** to rename or delete the picked chat. Delete removes its private links, but keeps links that are also in another chat.
* Add your own topics in the Topics panel. Assign one from a link's **Edit title and topic** menu. Empty custom topics stay in JSON backups. If you delete a custom topic, its links move to Unsorted.

Reports shows counts for To read, Reading, Read, and Archived, by chat and by topic. Shared links count once in total and once per chat. Deleted links do not count. Archived means hidden, not read. No dates, streaks, or totals over time.

The list shows 10 links per page. You can pick 25, 50, or 100. Page buttons show on top and bottom and stay in sync. New filters go back to page one. Title fetch and Markdown export use the full filtered list, not just the page you see. JSON backup always saves everything.

Link states:

* **To read**, **Reading**, **Read**, and **Archived** are set by you. Opening a page does not mark it read. **Active** hides archived links. **Archived** and **Everything** show them again so you can restore.
* **Delete** removes a link from all chats. Deleted links are skipped in future imports. **Undo last deletion** brings it back until you close the window or delete another link. Archive instead if you may want it later.
* The checkbox means **Read**. New links are unchecked. Check to mark Read. Uncheck to go back to To read. The state is the same in all chats. The checkbox does not pick links for export.

### Delete all links

In **Backup and restore**, open **Delete all links**. It shows the full count, not the filtered count. Back up to JSON first. Type `DELETE` to unlock the button. It removes links, states, message text, and deleted link rules. Chats and settings stay.

There is no Undo for this. Load your JSON backup to bring links back. Single Delete still has Undo. This button is off during live collect. It does not delete files you already downloaded. It does not fully wipe browser storage.

LinkVault removes tracking parts from URLs to find dupes. It keeps case, useful query parts, and page anchors. LinkedIn post links stay. Profile and menu links are skipped. Two short links to the same page may stay split until you resolve them. Resolve merges chats and keeps the reading state of the main link. Short links stay as aliases so they do not come back as new. Aliases are in backups. If the main link was deleted, resolving removes the short link too.

## Save, back up, move

Local first: no login, no cloud, no LinkVault account. One list lives in `chrome.storage.local` in the current browser profile. It stays after restart. It does not sync to other profiles or computers. Each profile has its own list.

* **Download Markdown:** saves the current filtered view, grouped by topic, with reading states. Save the `.md` file in your Obsidian vault. Message text is off unless you turn it on. This is not a full backup.
* **Back up full library (JSON):** saves chats, links, aliases, topics, states, message text, and deleted link rules, no matter the filters. Keep it where you keep backups.
* **Move to a new browser or computer:** download JSON, install LinkVault there, and import the file. Empty lists restore everything. Import to a used list merges links and chats, and keeps your current reading state when both differ. There is no auto sync.

If you remove the extension or clear its data, the list can be gone. Back up first. Backups are plain text and may hold private messages. If saving fails from lack of space, LinkVault shows an error and stops saving. Back up right away if you see this.

Old version 1 lists move by themselves into a chat named after the list. Title edits and message text stay. The old copy stays for safety. Clearing browser data removes it. Bad saved data is never silently replaced. Clicking the icon opens a new window and closes the old one. The list stays.

Auto backup and cloud sync are not built in. A portable backup does not mean Firefox is ready.

## Get titles (optional)

**Fetch titles for filtered list** asks for web access, then visits each link in the filtered list with no login. It can fix `lnkd.in` links and normal redirects. Locked pages stay with no title. Each page has a 20 second limit and a size limit. It goes one by one, so big lists take time. Keep the window open till it ends. Topic hints refresh from new titles.

This calls the websites in your list. It is optional. Saving, tagging by hand, and export work without it. Plain `http://` pages are not fetched.

## Use AI with your Markdown

Download Markdown and open it in Obsidian, or give it to your own AI tool for tags, groups, or a reading plan. LinkVault has no AI inside and needs no API key.

Try this prompt with your exported file:

> Group these links by topic and suggest Obsidian tags. Keep every original URL unchanged. Return Markdown, and do not invent summaries for pages you have not read.

Check the AI output before you keep it. Message text is off in Markdown by default. If you turned it on, check the file before you share it with any AI service.

## Privacy and access

* `activeTab` and `scripting`: adds the saver to the LinkedIn tab you clicked, only when you start saving.
* `storage`: keeps the list on your device in this browser profile. It is not encrypted. Clear the extension data when you no longer want message text saved.
* Optional web access: only for title fetch. Saving itself does not call hidden LinkedIn APIs or read cookies.

No stats, no remote code, no accounts, no LinkVault server. Exports may hold private chat text. Do not commit real chats, backups, or browser profiles to git.

## Build and test

Run `npm test` in this folder with Node 24 or newer. Tests use the built in Node test runner with `--test-isolation=none`. No build step. No extra installs.

Browser fake tests run with `node tests/browser.mjs`. Set `LINKVAULT_BROWSER` to your Chromium file if `chromium` is not on your PATH. These use fake chats, not your LinkedIn account. They cannot prove live LinkedIn works and they do not remove account risk.

Before you release, follow the [hand test checklist](../docs/RELEASING.md) and write down browser versions and results. Live tests are optional and risky. LinkedIn page changes may break the saver. See [privacy](../PRIVACY.md), [contributing](../CONTRIBUTING.md), and [security](../SECURITY.md).

Make a Chromium test ZIP from the repo root with `python scripts/package_extension.py` (Python 3.10+). It uses a fixed file list, blocks links to outside files, will not overwrite an old ZIP, and prints the file hash. Unzip to a new folder and load that folder unpacked. It is not a Firefox file and it is not store approval.

Fake import files are in [examples](../examples/README.md). GitHub runs extension tests, Python tests, and packing after upload. A workflow file on disk is not proof that CI passed.

## License

MIT, see [LICENSE](LICENSE). This folder can be shared on its own, apart from the Python tool.
