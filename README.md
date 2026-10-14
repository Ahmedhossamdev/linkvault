# LinkVault

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/wordmark-dark.png">
  <img src="brand/wordmark-light.png" alt="LinkVault" width="360">
</picture>

Save links from LinkedIn chats in one place. Read them later.

Friends send you many links. You say "I will read this later" and then lose the link. LinkVault saves those links so you can find them again.

## What is this?

LinkVault is a small browser tool for saving links from chats.

* It saves links from your LinkedIn chats.
* It keeps them in one reading list on your own computer.
* You can mark links as To read, Reading, Read, or Archived.
* You can search, filter by chat or topic, and export to Markdown.
* No account. No cloud. Your links stay in your browser.

You do not need Python to use LinkVault. The browser extension is the main tool.

> Note: you must install it by hand in your browser. It is not in the Chrome Web Store yet.

Start here: [how to install and which browsers work](extension/README.md#release-status-and-browsers).

## What can it do?

* Save links from many chats in one list.
* Filter by chat, topic, website (like YouTube or GitHub), or reading state.
* Edit titles and topics.
* Delete a link, with Undo if you made a mistake.
* Import links from a saved HTML or TXT file.
* Get page titles if you want (optional).
* Export your list to Markdown for Obsidian.
* Back up your full list to JSON and move it to another browser.
* Light mode and dark mode.
* Help page and short tour on first open.

See the [full extension guide](extension/README.md), [privacy details](PRIVACY.md), and [how to help](CONTRIBUTING.md).

## Important: please read before you collect from LinkedIn

LinkedIn does not allow tools that scrape or auto scroll chats. LinkVault has two live modes:

* **Manual:** you scroll yourself.
* **Auto:** LinkVault scrolls for you.

Both modes can put your LinkedIn account at risk. Slow scrolling and delays do not make it safe.

Safe choice: use **file import**. It does not touch LinkedIn. It only reads a file you saved.

LinkVault is not made by or linked to LinkedIn in any way. Read the [risk help](extension/README.md#choose-a-collection-method) first.

## Which browsers work?

* **Chrome / Chromium:** works. This is the main target.
* **Edge, Brave, Opera:** should work, but not fully tested.
* **Firefox, Safari, phones:** not supported. Firefox needs extra work.

You need Chrome or Chromium version 123 or newer.

## Quick start

1. Load the `extension` folder as an unpacked extension in Developer mode.
2. Open a LinkedIn chat.
3. Click the LinkVault icon.
4. Go to **Collect** to save links, or **Reading list** to read them.

Full steps are in the [extension guide](extension/README.md).

## Backup and move

* **Markdown:** saves what you see now, grouped by topic. Good for reading and notes. Not a full backup.
* **JSON:** saves everything (chats, links, states, settings). Use this to back up or move to a new browser.

Delete all links needs you to type `DELETE` first. It keeps your chats and settings, but removes the saved links. Back up first, there is no Undo for this.

## Old Python tool (optional)

The extension above is enough for most people. Skip this part unless you like the command line.

The first version of LinkVault was a Python script. It reads a saved chat HTML file, finds links, fixes short `lnkd.in` links, gets titles, groups by topic, and writes Markdown.

It needs Python 3.10 or newer. It uses only Python built in tools, no extra installs.

```
chat thread (browser, logged in)
  -> browser/save-html.js saves linkedin-chat.html
  -> linkvault full linkedin-chat.html --out out --obsidian vault-notes
  -> out/collection.md + vault-notes/<topic>.md + link-collection-moc.md
```

How `lnkd.in` links work: LinkedIn shows a guard page first. The real link is in the tag with `data-tracking-control-name="external_url_click"`. LinkVault reads it. No login needed for this step.

### Install

```bash
pip install -e .
linkvault full --help
```

Or run with no install:

```bash
PYTHONPATH=src python -m linkvault.cli full linkedin-chat.html --out out
```

### Save the HTML

See `browser/README.md`. Short version:

1. Open the chat, scroll up (PageUp) until old messages load. Or paste `browser/scroll-loader.js` in DevTools Console to auto scroll.
2. Paste `browser/save-html.js` to download `linkedin-chat.html`.

### Run

```bash
linkvault full linkedin-chat.html --out out --obsidian vault-notes
```

What you get:

* `out/collection.md`: all links, grouped by topic.
* `vault-notes/`: one file per topic (`db.md`, `system-design.md`, ...) plus `link-collection-moc.md` index.

If your net is slow, use fewer workers:

```bash
linkvault full chat.html --out out --workers 10 --timeout 20
```

### Topics

Default groups: `dsa-interview`, `system-design`, `db`, `os-linux`, `network`, `docker-k8s-devops`, `backend`, `frontend-js`, `python`, `java`, `go`, `ai-ml`, `security`, `career-jobs`, `courses`, `videos`, `github-repos`, `articles`, `linkedin-posts`, `misc-useful`. Edit `src/linkvault/categorize.py` to add your own words.

This Python part does not fully support WhatsApp or Telegram. It can read plain HTML, but that is not the same as full support.

## Tests

```bash
PYTHONPATH=src python -m pytest -q
```

For the extension, run `npm test` inside the `extension` folder. See the [release checklist](docs/RELEASING.md) before you share a new version.

## Brand

Logo, colors, and launch image are in the [identity guide](brand/IDENTITY.md) and [launch art](brand/launch-card.png).

## License

MIT.
