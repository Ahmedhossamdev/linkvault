# Synthetic testing files

These files contain invented titles, names, messages, and example.com URLs. They are not real articles, recommendations, or private chat exports. They are intended for import, layout, reports, and backup tests, not successful website title fetching.

1. Load LinkVault and open Collect.
2. Import `demo-chat.html` as "Demo friends".
3. Import `demo-links.txt` as "Demo reading group". The science URL is intentionally shared so you can check deduplication and chat membership.
4. Mark one link Read, another Reading, and another Archived. Check Reports.
5. Open Backup & restore and download JSON. Import it through that same screen in a separate test browser profile and compare the results.
6. Import `many-links.txt` to test pagination without scrolling through a real chat.

Import `demo-reading.md` through Backup & restore to test Markdown titles and topic headings. New links start To read, while overlapping existing links retain their current progress. To test Delete all links safely, download JSON, use the confirmed action in Backup & restore, and import the saved JSON again.

Use these fixtures for screenshots instead of friends' conversations. Do not replace these checked-in files with personal exports.
