const steps = [
  ['Choose how to add links','Collect imports HTML or TXT and captures LinkedIn conversations. Backup & restore imports JSON backups or Markdown. For live collection, open one LinkedIn conversation and click the extension icon FROM THAT TAB. Both live modes carry account risk. File import does not interact with LinkedIn.'],
  ['Find what interests you','The Reading list brings all chats together without duplicate links. Use chat, topic, site, and search filters. Local topic suggestions are imperfect: edit them or enter a custom topic.'],
  ['Keep your place','New links start unchecked. Check a link only when you have read it, or choose Reading while you are partway through. Archive links to put them aside. Reports summarize current reading states, not a historical activity log.'],
  ['Keep a backup','Backup & restore contains imports, Markdown export, and full JSON backups. JSON preserves chats, topics, reading states, and context. Markdown restores links, not reading history. Download a full backup before Delete all links, uninstalling, or clearing browser data.'],
];
export function setupNavigation({onTab = () => {},onError = () => {}} = {}) {
  const $ = id => document.getElementById(id), tabs = ['library','collect','export','reports'];
  let step = 0;
  function showTab(name,{focus = false} = {}) {
    if (![...tabs,'guide'].includes(name)) return;
    for (const tab of [...tabs,'guide']) $(`panel-${tab}`).hidden = tab !== name;
    for (const tab of tabs) {
      $(`tab-${tab}`).setAttribute('aria-selected',String(tab === name));
      $(`tab-${tab}`).tabIndex = tab === name || (name === 'guide' && tab === 'library') ? 0 : -1;
    }
    $('tab-guide').setAttribute('aria-expanded',String(name === 'guide'));
    window.scrollTo({top:0,behavior:'auto'});
    if (focus) $(`tab-${name}`).focus();onTab(name);
  }
  $('tab-guide').onclick = () => showTab('guide',{focus:true});
  function renderStep() {
    $('walkthrough-step').textContent = `Step ${step + 1} of ${steps.length}`;
    $('walkthrough-title').textContent = steps[step][0];$('walkthrough-body').textContent = steps[step][1];
    $('walkthrough-back').disabled = step === 0;
    $('walkthrough-next').textContent = step === steps.length - 1 ? 'Start reading' : 'Next';
  }
  async function finish() {
    try {await chrome.storage.local.set({onboardingVersion:1});}
    catch(error) {onError(`Could not remember guide completion: ${error.message}`);}
    $('walkthrough').hidden = true;showTab('library',{focus:true});
  }
  for (const [index,tab] of tabs.entries()) {
    $(`tab-${tab}`).onclick = () => showTab(tab);
    $(`tab-${tab}`).onkeydown = event => {
      const offsets = {ArrowRight:1,ArrowLeft:-1};let next;
      if (Object.hasOwn(offsets,event.key)) next = (index + offsets[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();showTab(tabs[next],{focus:true});
    };
  }
  $('guide-restart').onclick = () => {step = 0;$('walkthrough').hidden = false;renderStep();showTab('guide');$('walkthrough-title').focus();};
  $('walkthrough-back').onclick = () => {step = Math.max(0,step - 1);renderStep();$('walkthrough-title').focus();};
  $('walkthrough-next').onclick = async () => {if (step === steps.length - 1) await finish();else {step++;renderStep();$('walkthrough-title').focus();}};
  $('walkthrough-skip').onclick = finish;
  return {showTab,restore(version) {step = 0;renderStep();$('walkthrough').hidden = version === 1;showTab(version === 1 ? 'library' : 'guide');}};
}
