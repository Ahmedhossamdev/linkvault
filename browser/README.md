# Browser capture guide

These are legacy helpers for the Python tool. For the extension, use the [extension guide](../extension/README.md).

LinkedIn prohibits scraping and automation tools. These helpers interact with its page and can carry account risk. They are not an approved or ban-proof integration. Process only files you are authorized to use; never publish private chats. LinkedIn archive ZIP/CSV import is not implemented.

## Option A: saved HTML

1. Open the chat thread, for example `linkedin.com/messaging/thread/<id>/`.
2. Click inside the messages, hold PageUp until old messages stop loading.
3. F12, Console, paste `save-html.js`. You get `linkedin-chat.html`.
4. Run:
   `linkvault full linkedin-chat.html --out out --obsidian vault-notes`

For a huge thread, do it twice (recent half, older half) and merge. LinkVault dedupes.

## Option B: quick link list only

1. Same scroll step.
2. Paste `extractor.js`. You get `linkedin-links.txt`.
3. Useful for a fast check, but HTML gives better titles and topics.

## Bookmarklet

Create a bookmark with this URL (one line):

```
javascript:(()=>{const html=document.documentElement.outerHTML;const blob=new Blob([html],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='linkedin-chat.html';a.click();})()
```

Click it while on the chat page.
