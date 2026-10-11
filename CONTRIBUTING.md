# Contributing

Start with a focused issue or change. Discuss behavior changes that affect capture, permissions, deletion, or backup compatibility.

## Development

The extension has no build step or runtime dependencies. Load `extension/` unpacked in a current Chromium browser. Run tests with Node 24 or newer:

```sh
cd extension
npm test
node tests/browser.mjs
```

Set `LINKVAULT_BROWSER` if `chromium` is not on your PATH. Browser fixtures use synthetic conversations and an API shim; they do not prove real LinkedIn compatibility.

For the Python tool, use Python 3.10 or newer, install pytest in your development environment, and run `PYTHONPATH=src python -m pytest -q` from the root.

Release packaging is dependency-free: `python scripts/package_extension.py`. Its artifact checks can run without pytest using `python -m unittest discover -s tests -p test_packaging.py`. CI runs both Python and extension suites and creates a Chromium testing artifact; it does not submit to stores or publish a release.

## Changes and bug reports

- Add regression tests before fixes. Preserve full titles, meaningful URLs, reading progress, custom topics, and chat provenance.
- Test backup merge and restore when changing the library contract.
- Keep dependencies, permissions, and network activity minimal and explicit.
- Use synthetic examples. Never commit personal chats, backups, credentials, or browser profiles.
- Include browser/extension versions, reproduction steps, expected/actual behavior, and redacted diagnostics in reports.
- Record actual browser results before advertising support. Follow [the release checklist](docs/RELEASING.md).

Personal LinkedIn testing is not required: live collection carries account risk. File imports and synthetic fixtures are available for development.

Contributions use the MIT license. For private vulnerability reports, see [SECURITY.md](SECURITY.md).
