chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  const pages = await chrome.tabs.query({url:chrome.runtime.getURL('app.html*')});
  for (const page of pages) {
    // One dashboard owns storage writes and a capture session at a time.
    if (page.id) await chrome.tabs.remove(page.id);
  }
  await chrome.tabs.create({url: chrome.runtime.getURL(`app.html?tab=${tab.id}`)});
});
