export async function startCapture(api,tabId,settings) {
  // Manual mode switches once, only after the collector successfully starts.
  // Automatic mode activates the source before measuring scroll positions.
  if (settings.auto) await api.tabs.update(tabId,{active:true});
  await api.scripting.executeScript({target:{tabId},files:['progress.js','capture.js']});
  const response = await api.tabs.sendMessage(tabId,{type:'start',...settings});
  if (response?.error) throw new Error(response.error);
  if (!response?.ok) throw new Error('The collector did not acknowledge startup. Refresh LinkedIn and reopen LinkVault.');
  if (!settings.auto) await api.tabs.update(tabId,{active:true});
  return response;
}
