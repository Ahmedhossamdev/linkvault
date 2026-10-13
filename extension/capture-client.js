export function sourceTabError(error) {
  return new Error('The source tab is unavailable or is not a full LinkedIn conversation. Open a conversation on www.linkedin.com and click the LinkVault toolbar icon FROM THAT TAB.',{cause:error});
}

export async function getSourceTab(api,tabId) {
  if (!Number.isSafeInteger(tabId) || tabId <= 0) throw sourceTabError();
  let tab;
  try {
    tab = await api.tabs.get(tabId);
  } catch (error) {
    throw sourceTabError(error);
  }
  let url;
  try {
    url = new URL(tab?.url);
  } catch (error) {
    throw sourceTabError(error);
  }
  if (url.protocol !== 'https:' || url.hostname !== 'www.linkedin.com' || url.port ||
      !/^\/messaging\/thread\/[^/]+\/?$/.test(url.pathname)) throw sourceTabError();
  return tab;
}

export async function startCapture(api,tabId,settings) {
  await getSourceTab(api,tabId);
  // Manual mode switches once, only after the collector successfully starts.
  // Automatic mode activates the source before measuring scroll positions.
  try {
    if (settings.auto) await api.tabs.update(tabId,{active:true});
    await api.scripting.executeScript({target:{tabId},files:['progress.js','capture.js']});
    const response = await api.tabs.sendMessage(tabId,{type:'start',...settings});
    if (response?.error) throw new Error(response.error);
    if (!response?.ok) throw new Error('The collector did not acknowledge startup. Refresh LinkedIn and reopen LinkVault.');
    if (!settings.auto) await api.tabs.update(tabId,{active:true});
    return response;
  } catch (error) {
    if (/no (?:tab|frame) with id|invalid tab id|tab.*(?:closed|removed|not found)|frame.*(?:removed|not found)/i.test(error?.message || String(error))) {
      throw sourceTabError(error);
    }
    throw error;
  }
}
