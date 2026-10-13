chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  const dashboardURL = chrome.runtime.getURL('app.html');
  const isDashboard = url => typeof url === 'string' && url.split(/[?#]/,1)[0] === dashboardURL;
  if (isDashboard(tab.url)) {
    await chrome.tabs.update(tab.id,{active:true});
    return;
  }
  const pages = await chrome.tabs.query({url:chrome.runtime.getURL('app.html*')});
  for (const page of pages) {
    // One dashboard owns storage writes and a capture session at a time.
    if (page.id && isDashboard(page.url)) await chrome.tabs.remove(page.id);
  }
  await chrome.tabs.create({url: chrome.runtime.getURL(`app.html?tab=${tab.id}`)});
});
