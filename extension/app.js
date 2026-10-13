import { markdown, classify, topicLabels, topicLabel } from './core.js';
import { importJSON, importHTML, importText, importMarkdown } from './import.js';
import { enrichLink } from './network.js';
import { emptyLibrary, ensureChat, ingest, entries, states, site, setState, setTopic, addTopic, deleteTopic, deleteChat, deleteEntry, undoDelete, restoreLibrary, mergeLibrary, replaceURL } from './library.js';
import { startCapture, getSourceTab, sourceTabError } from './capture-client.js';
import { readingReport } from './reports.js';
import { setupNavigation } from './navigation.js';
import { acquireOwnership } from './ownership.js';

const $ = id => document.getElementById(id);
const tabId = Number(new URL(location.href).searchParams.get('tab'));
let library = emptyLibrary(), activeChat = '', activeState = 'active', activeCategory = '', activeTopic = '';
let currentPage = 1, pageSize = 10;
let capturing = false, busy = true, ready = false, captureURL = '', captureChat = '', runId = 0, writeQueue = Promise.resolve();
let lastProgress, lastDeleted;
let ownership;
let hasLegacySnapshot = false;
let pendingTopic = '', pendingChat = '';
const chatName = id => library.chats.find(chat => chat.id === id)?.name || 'Chat';
const view = (overrides = {}) => entries(library,{chatId:activeChat,state:activeState,site:activeCategory,topic:activeTopic,search:$('search').value,...overrides});
const navigation = setupNavigation({onTab:name => {if (name === 'reports') renderReports();},onError:message => status(message,true)});
const colorPreference = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
let themePreference = 'light';
function darkTheme() {return themePreference === 'dark' || (themePreference === 'system' && colorPreference?.matches);}
function applyTheme(theme) {
  themePreference = ['light','dark','system'].includes(theme) ? theme : 'light';document.documentElement.setAttribute('data-theme',themePreference);
  const dark = Boolean(darkTheme()), label = `Switch to ${dark ? 'light' : 'dark'} theme`;
  $('theme').setAttribute('aria-label',label);$('theme').title = label;
  $('theme-moon').toggleAttribute('hidden',dark);$('theme-sun').toggleAttribute('hidden',!dark);
}
$('theme').onclick = async () => {applyTheme(darkTheme() ? 'light' : 'dark');try {await chrome.storage.local.set({theme:themePreference});} catch(error) {status(`Could not remember theme: ${error.message}`,true);}};
colorPreference?.addEventListener('change',() => {if (themePreference === 'system') applyTheme('system');});
$('open-collect').onclick = () => {navigation.showTab('collect');$('mode').focus();};
$('empty-collect').onclick = $('open-collect').onclick;
for (const id of ['empty-restore','open-restore']) $(id).onclick = () => {navigation.showTab('export');$('restore-file').focus();};
function topicChoices() {
  return [...new Set([...Object.keys(topicLabels),...(library.topics || []),...library.items.map(item => item.topic)])];
}
function renderTopicOptions() {
  $('topic-options').replaceChildren();
  for (const topic of topicChoices()) {const option = document.createElement('option');option.value = topic;option.label = topicLabel(topic);$('topic-options').append(option);}
}
function renderReports() {
  const report = readingReport(library);$('report-total').textContent = String(report.total);
  for (const state of Object.keys(states)) $(`report-${state}`).textContent = String(report.counts[state]);
  $('report-progress').textContent = `${report.readPercent}% of saved links are marked Read (${report.counts.read} of ${report.total}).`;
  $('report-bar').max = report.total || 1;$('report-bar').value = report.counts.read;
  for (const [id,rows] of [['report-chats',report.byChat],['report-topics',report.byTopic]]) {
    const body = $(id);body.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement('tr'), name = document.createElement('th');name.scope = 'row';name.textContent = row.name || topicLabel(row.topic);tr.append(name);
      for (const value of [row.total,row.counts.unread,row.counts.reading,row.counts.read,row.counts.archived]) {const td = document.createElement('td');td.textContent = String(value);tr.append(td);}
      body.append(tr);
    }
    if (!rows.length) {const tr = document.createElement('tr'), td = document.createElement('td');td.colSpan = 6;td.textContent = 'No links yet. Collect or import a chat to start.';tr.append(td);body.append(tr);}
  }
}
function status(text,error = false) { $('status').textContent = text; $('status').classList.toggle('error',error); }
function progress(stats) {
  if (!stats) return;
  lastProgress = stats; $('capture-progress').hidden = false;
  $('capture-phase').textContent = globalThis.LinkVaultProgress.phases[stats.phase] || 'Ready';
  $('capture-metrics').textContent = globalThis.LinkVaultProgress.summary(stats);
}
function controls() {
  const locked = !ready || busy || capturing;
  for (const id of ['start','file','restore-file','restore-name','enrich','mode','chat-name']) $(id).disabled = locked;
  $('speed').disabled = locked || $('mode').value !== 'auto';
  $('stop').disabled = !capturing;
  $('name').disabled = locked || !activeChat;
  $('delete-chat').disabled = locked || !activeChat;
  $('new-topic').disabled = locked;
  $('add-topic').disabled = locked;
  $('markdown').disabled = locked || !view().length;
  $('json').disabled = locked || !(library.chats.length || library.deleted.length);
  $('undo').disabled = locked || !lastDeleted;
  $('undo').hidden = !lastDeleted;
  $('clear-all').disabled = locked || !(library.items.length || library.deleted.length || hasLegacySnapshot);
  $('confirm-clear').disabled = locked || $('clear-confirm').value !== 'DELETE';
  $('clear-backup').disabled = $('json').disabled;
}
function save(next = library,extra = {}) {
  const snapshot = structuredClone(next);
  writeQueue = writeQueue.catch(() => {}).then(() => chrome.storage.local.set({library:snapshot,...extra}));
  writeQueue.catch(error => status(`Could not save locally: ${error.message}. Download a backup.`,true));
  return writeQueue;
}
function filterButton(container,text,selected,action,key = text.replace(/ \(\d+\)$/,'')) {
  const button = document.createElement('button');button.className = 'filter-button';button.textContent = text;
  button.setAttribute('data-focus-key',`${container.id}:${key}`);
  button.setAttribute('aria-pressed',String(selected));button.onclick = action;container.append(button);
}
function filterChanged(action) {action();currentPage = 1;render();}
function resetFilters() {activeChat = '';activeState = 'active';activeCategory = '';activeTopic = '';$('search').value = '';currentPage = 1;}
function renderActiveFilters() {
  const filters = $('active-filters');filters.replaceChildren();
  const add = (label,clear) => {
    const button = document.createElement('button');button.className = 'filter-chip';button.textContent = `${label} ×`;
    button.setAttribute('aria-label',`Remove ${label} filter`);button.onclick = () => filterChanged(clear);filters.append(button);
  };
  if (activeChat) add(`Chat: ${chatName(activeChat)}`,() => {activeChat = '';});
  if (activeTopic) add(`Topic: ${topicLabel(activeTopic)}`,() => {activeTopic = '';});
  if (activeCategory) add(`Site: ${activeCategory}`,() => {activeCategory = '';});
  if (activeState !== 'active') add(`State: ${states[activeState] || 'Everything'}`,() => {activeState = 'active';});
  if ($('search').value.trim()) add(`Search: ${$('search').value.trim()}`,() => {$('search').value = '';});
  filters.hidden = !filters.children.length;$('reset').hidden = filters.hidden;
}
function renderPagination(total) {
  const pages = Math.max(1,Math.ceil(total / pageSize));currentPage = Math.max(1,Math.min(currentPage,pages));
  const range = total ? `${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize,total)} of ${total} links` : 'No matching links';
  for (const suffix of ['','-top']) {
    $(`page-size${suffix}`).value = String(pageSize);
    $(`page-status${suffix}`).textContent = range;
    const nav = $(`pagination${suffix}`);nav.replaceChildren();nav.hidden = pages <= 1;
    const add = (text,page,disabled = false) => {
      const button = document.createElement('button');button.className = 'secondary page-button';button.textContent = text;button.disabled = disabled;
      if (text === String(currentPage)) button.setAttribute('aria-current','page');
      button.setAttribute('aria-label',/^\d+$/.test(text) ? `Page ${text}` : text);
      button.onclick = () => {currentPage = page;render();$('pagination-toolbar').scrollIntoView({block:'start'});$('links').focus({preventScroll:true});};nav.append(button);
    };
    add('Previous',currentPage - 1,currentPage === 1);
    const numbers = [...new Set([1,currentPage - 1,currentPage,currentPage + 1,pages].filter(page => page >= 1 && page <= pages))].sort((a,b) => a - b);
    for (const [index,page] of numbers.entries()) {
      if (index && page - numbers[index - 1] > 1) {const gap = document.createElement('span');gap.textContent = '…';gap.setAttribute('aria-hidden','true');nav.append(gap);}
      add(String(page),page);
    }
    add('Next',currentPage + 1,currentPage === pages);
    }
}
function render() {
  const focusKey = document.activeElement?.getAttribute?.('data-focus-key');
  const openEditors = new Set([...document.querySelectorAll('details[data-editor-url]')].filter(element => element.open).map(element => element.getAttribute('data-editor-url')));
  const chats = $('chats');chats.replaceChildren();
  filterButton(chats,`All chats (${library.items.length})`,!activeChat,() => filterChanged(() => {activeChat = '';}));
  for (const chat of library.chats) filterButton(chats,`${chat.name} (${entries(library,{chatId:chat.id}).length})`,activeChat === chat.id,() => filterChanged(() => {activeChat = chat.id;}),chat.id);
  const categories = $('categories');categories.replaceChildren();
  filterButton(categories,'All sites',!activeCategory,() => filterChanged(() => {activeCategory = '';}));
  const scoped = entries(library,{chatId:activeChat});
  const groups = [...new Set(scoped.map(item => site(item.url)))].sort();
  for (const group of groups) filterButton(categories,({youtube:'YouTube',github:'GitHub',linkedin:'LinkedIn',web:'Other websites'})[group],activeCategory === group,() => filterChanged(() => {activeCategory = group;}));
  const topics = $('topics');topics.replaceChildren();
  filterButton(topics,'All topics',!activeTopic,() => filterChanged(() => {activeTopic = '';}));
  const shownTopics = [...new Set([...scoped.map(item => item.topic),...(library.topics || [])])].sort((a,b) => topicLabel(a).localeCompare(topicLabel(b)));
  for (const topic of shownTopics) {
    filterButton(topics,topicLabel(topic),activeTopic === topic,() => filterChanged(() => {activeTopic = topic;}),topic);
    if ((library.topics || []).includes(topic)) {
      const remove = document.createElement('button');remove.type = 'button';remove.className = 'delete-topic';remove.textContent = 'Delete topic';remove.disabled = !ready || busy || capturing;
      remove.setAttribute('aria-label',`Delete topic ${topicLabel(topic)}`);
      remove.onclick = () => {pendingTopic = topic;const count = library.items.filter(item => item.topic === topic).length;$('delete-topic-count').textContent = `${count} ${count === 1 ? 'link is' : 'links are'} currently in ${topicLabel(topic)}.`;$('delete-topic-dialog').showModal();};
      topics.append(remove);
    }
  }
  const stateButtons = $('states');stateButtons.replaceChildren();
  for (const [key,label] of Object.entries({active:'Active',...states,'':'Everything'})) {
    filterButton(stateButtons,`${label} (${view({state:key,search:''}).length})`,activeState === key,() => filterChanged(() => {activeState = key;}));
  }
  $('name').value = activeChat ? chatName(activeChat) : 'All chats';
  $('chat-settings').hidden = !activeChat;
  $('selected-chat-actions').hidden = !activeChat;
  $('selected-chat-name').textContent = activeChat ? chatName(activeChat) : '';
  $('list-scope').textContent = `${activeChat ? chatName(activeChat) : 'All chats'} · ${states[activeState] || (activeState === 'active' ? 'All active links' : 'Everything')}`;
  $('list-scope').hidden = !activeChat && activeState === 'active';
  renderActiveFilters();
  $('library-summary').textContent = `${library.items.length} saved ${library.items.length === 1 ? 'link' : 'links'} · ${library.chats.length} ${library.chats.length === 1 ? 'chat' : 'chats'}. Stored locally in this browser profile.`;
  renderTopicOptions();
  $('empty-collect').hidden = library.items.length > 0;$('empty-restore').hidden = library.items.length > 0;
  const visible = view();$('count').textContent = `${visible.length} matching / ${library.items.length} in library`;
  $('export-summary').textContent = `Markdown: ${visible.length} links matching your reading-list filters, across all pages. JSON: all ${library.items.length} links from ${library.chats.length} ${library.chats.length === 1 ? 'chat' : 'chats'}.`;
  renderPagination(visible.length);
  const container = $('links');container.replaceChildren();
  for (const [index,item] of visible.slice((currentPage - 1) * pageSize,currentPage * pageSize).entries()) {
    const row = document.createElement('article');row.className = 'link-row';row.setAttribute('data-state',item.state);
    const check = document.createElement('input');check.type = 'checkbox';check.checked = item.state === 'read';
    check.disabled = !ready || busy || capturing;check.setAttribute('aria-label',`Mark ${item.title} as read`);
    check.setAttribute('data-focus-key',`read:${item.url}`);
    check.onchange = () => {setState(library,item.url,check.checked ? 'read' : 'unread');save();render();};
    const fields = document.createElement('div');fields.className = 'link-fields';
    const meta = document.createElement('div');meta.className = 'row-meta';
    const mark = document.createElement('span');mark.className = 'site-mark';mark.setAttribute('aria-hidden','true');
    const host = new URL(item.url).hostname.replace(/^www\./,'');
    mark.textContent = ({youtube:'YT',github:'GH',linkedin:'IN'})[site(item.url)] || host.slice(0,2).toUpperCase();
    const source = document.createElement('span');source.className = 'site-badge';source.textContent = host;
    const stateBadge = document.createElement('span');stateBadge.className = 'reading-badge';stateBadge.textContent = states[item.state];
    meta.append(mark,source,stateBadge);
    const titleLabel = document.createElement('label');titleLabel.textContent = 'Title';titleLabel.htmlFor = `title-${index}`;
    const title = document.createElement('input');title.id = titleLabel.htmlFor;title.value = item.title;title.maxLength = 500;title.disabled = check.disabled;
    title.setAttribute('data-focus-key',`title:${item.url}`);
    const anchor = document.createElement('a');anchor.className = 'article-title';anchor.href = item.url;anchor.textContent = item.title;anchor.title = item.title;anchor.target = '_blank';anchor.rel = 'noreferrer';
    const address = document.createElement('span');address.className = 'article-url';address.textContent = item.url;
    const provenance = document.createElement('small');provenance.textContent = `From ${item.chatIds.map(chatName).join(', ')} · ${topicLabel(item.topic)}`;
    const actions = document.createElement('div');actions.className = 'item-actions';
    const reading = document.createElement('select');reading.className = 'reading-state';reading.setAttribute('aria-label',`Reading state for ${item.title}`);reading.disabled = check.disabled;
    reading.setAttribute('data-focus-key',`state:${item.url}`);
    for (const [value,label] of Object.entries(states)) {const option = document.createElement('option');option.value = value;option.textContent = label;reading.append(option);}
    reading.value = item.state;reading.onchange = () => {setState(library,item.url,reading.value);save();render();};
    const remove = document.createElement('button');remove.className = 'secondary delete-link';remove.textContent = 'Delete';remove.disabled = check.disabled;
    remove.onclick = () => {lastDeleted = deleteEntry(library,item.url);save();render();status('Link deleted from all chats. Undo is available until you close this dashboard or delete another link.');};
    actions.append(reading,remove);
    const details = document.createElement('details');const summary = document.createElement('summary');summary.textContent = 'Edit title & topic';
    details.setAttribute('data-editor-url',item.url);details.open = openEditors.has(item.url);
    const topic = document.createElement('select');topic.className = 'topic';topic.disabled = check.disabled;topic.setAttribute('aria-label',`Topic for ${item.title}`);
    for (const value of topicChoices()) {const option = document.createElement('option');option.value = value;option.textContent = topicLabel(value);topic.append(option);}
    if (![...topic.children].some(option => option.value === item.topic)) {const option = document.createElement('option');option.value = item.topic;option.textContent = topicLabel(item.topic);topic.append(option);}
    topic.value = item.topic;
    topic.setAttribute('data-focus-key',`topic:${item.url}`);
    topic.onchange = () => {setTopic(library,item.url,topic.value);save();render();};
    title.onchange = () => {item.title = title.value;anchor.textContent = item.title;anchor.title = item.title;save();render();};
    details.append(summary,titleLabel,title,topic);fields.append(meta,anchor,address,provenance,actions,details);row.append(check,fields);container.append(row);
  }
  if (!visible.length) {const empty = document.createElement('p');empty.className = 'empty';empty.textContent = library.items.length ? 'No links match these filters.' : 'Collect or import a chat to start your reading list.';container.append(empty);}
  controls();
  renderReports();
  if (focusKey) {
    const replacement = [...document.querySelectorAll('[data-focus-key]')].find(element => element.getAttribute('data-focus-key') === focusKey);
    (replacement || $('links')).focus({preventScroll:true});
  }
}
async function run(action) {
  if (!ready || busy) return;
  busy = true;render();
  try {await action();} catch(error) {status(error.message,true);}
  finally {busy = false;render();}
}
function retireCaptureSession() {
  if (captureChat || captureURL) {captureChat = '';captureURL = '';runId++;}
}
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  if (!ready || message.type !== 'capture' || sender.tab?.id !== tabId || message.thread !== captureURL || message.runId !== runId || !captureChat) return;
  const changed = message.links.length > 0, stateChanged = capturing !== message.running;
  if (changed) ingest(library,captureChat,message.links);
  capturing = message.running;if (changed || stateChanged) render();
  status(message.status);progress({...message.progress,phase:message.running ? message.progress?.phase : 'saving'});
  (changed ? save() : writeQueue).then(() => {
    progress({...message.progress,totalLinks:library.items.length});respond({ok:true,totalLinks:library.items.length});
  },error => {progress({...message.progress,phase:'error'});respond({error:error.message});});
  return true;
});
$('start').onclick = () => run(async () => {
  if (!$('risk').checked) throw new Error('Read and acknowledge the LinkedIn account-risk notice before live collection.');
  const tab = await getSourceTab(chrome,tabId), url = new URL(tab.url);
  captureURL = tab.url;
  const name = $('chat-name').value.trim();
  const chat = ensureChat(library,url.origin + url.pathname,name || `LinkedIn chat ${library.chats.length + 1}`);
  if (name) chat.name = name;captureChat = chat.id;await save();capturing = true;
  try {await startCapture(chrome,tabId,{auto:$('mode').value === 'auto',intervalMs:Number($('speed').value),totalLinks:library.items.length,runId:++runId});}
  catch(error) {capturing = false;throw error;}
});
$('diagnose').onclick = () => run(async () => {
  await getSourceTab(chrome,tabId);
  let result;
  try {await chrome.scripting.executeScript({target:{tabId},files:['progress.js','capture.js']});result = await chrome.tabs.sendMessage(tabId,{type:'diagnostics'});}
  catch(error) {throw sourceTabError(error);}
  if (!result?.diagnostics) throw new Error('Could not read scrolling diagnostics. Refresh LinkedIn and reopen the extension.');
  $('diagnostics').value = JSON.stringify(result.diagnostics,null,2);$('diagnostics').hidden = false;$('diagnostics').focus();$('diagnostics').select();
});
$('source').onclick = () => run(async () => {
  await getSourceTab(chrome,tabId);
  try {await chrome.tabs.update(tabId,{active:true});} catch(error) {throw sourceTabError(error);}
});
function stopped(message) {capturing = false;if (lastProgress) progress({...lastProgress,running:false,phase:'stopped'});render();if (message) status(message);}
$('stop').onclick = async () => {try {await chrome.tabs.sendMessage(tabId,{type:'stop'});} catch {status('The source tab closed or navigated away. Your collected links are retained.');} finally {stopped();}};
chrome.tabs.onRemoved.addListener(id => {if (id === tabId && capturing) stopped('Source tab closed. Your collected links are retained.');});
chrome.tabs.onUpdated.addListener((id,change) => {if (id === tabId && change.url && change.url !== captureURL && capturing) {captureURL = '';stopped('Source conversation changed. Start again to collect it.');}});
async function importFile(input,restore = false) {
  if (capturing) throw new Error('Stop collection before importing files.');
  const file = input.files[0];if (!file) return;
  if (file.size > 25000000) throw new Error('Please import a file smaller than 25 MB.');
  // No live capture is running; reject late packets before any async import work.
  retireCaptureSession();
  const text = await file.text(), next = structuredClone(library);
  const before = next.items.length;
  let incoming, fallback = false, name = (restore ? $('restore-name') : $('chat-name')).value.trim() || file.name.replace(/\.[^.]+$/,'');
  if (/\.json$/i.test(file.name)) {
    const raw = JSON.parse(text);
    if (raw.version === 2) {
      mergeLibrary(next,raw);await save(next);library = next;input.value = '';resetFilters();navigation.showTab('library');
      status(`Full backup merged: ${next.items.length - before} new links. Existing reading states and deletion exclusions were preserved.`);return;
    }
    const data = importJSON(text);incoming = data.links;name = (restore ? $('restore-name') : $('chat-name')).value.trim() || data.name || name;
  } else if (/\.(md|markdown)$/i.test(file.name)) {
    const data = importMarkdown(text);incoming = data.links;name = $('restore-name').value.trim() || data.name || name;
  } else if (restore) {
    throw new Error('Choose a LinkVault JSON backup or a Markdown file.');
  } else if (/\.html?$/i.test(file.name)) {const data = importHTML(text);incoming = data.links;fallback = data.fallback;}
  else if (/\.txt$/i.test(file.name)) incoming = importText(text);
  else throw new Error('Choose HTML or TXT in Collect, or JSON/Markdown in Backup & restore.');
  if (!incoming.length) throw new Error('No usable HTTP or HTTPS links were found. Your library is unchanged.');
  const chat = ensureChat(next,`import:${crypto.randomUUID()}`,name);ingest(next,chat.id,incoming);await save(next);library = next;
  resetFilters();navigation.showTab('library');
  status(`Imported ${incoming.length} unique candidate links into ${chat.name}.${fallback ? ' Chat markup was unavailable: review the generic page links.' : ''}${/\.(md|markdown)$/i.test(file.name) ? ' New Markdown links start To read; existing progress is kept.' : ''}`);input.value = '';
}
$('file').onchange = () => run(() => importFile($('file'))).finally(() => {$('file').value = '';});
$('restore-file').onchange = () => run(() => importFile($('restore-file'),true)).finally(() => {$('restore-file').value = '';});
$('search').oninput = () => filterChanged(() => {});$('mode').onchange = controls;
for (const id of ['page-size','page-size-top']) $(id).onchange = () => filterChanged(() => {const size = Number($(id).value);pageSize = [10,25,50,100].includes(size) ? size : 10;});
$('name').onchange = () => {if (activeChat) {library.chats.find(chat => chat.id === activeChat).name = $('name').value.trim() || 'Chat';save();render();}};
$('add-topic-form').onsubmit = event => {
  event.preventDefault();
  return run(async () => {
    const topic = addTopic(library,$('new-topic').value);
    await save();$('new-topic').value = '';render();status(`Added topic: ${topicLabel(topic)}.`);
  });
};
$('delete-chat').onclick = () => {
  if (!activeChat || !ready || busy || capturing) return;
  const chat = library.chats.find(chat => chat.id === activeChat);if (!chat) return;
  pendingChat = chat.id;
  const unique = library.items.filter(item => item.chatIds.length === 1 && item.chatIds.includes(chat.id)).length;
  const shared = library.items.filter(item => item.chatIds.length > 1 && item.chatIds.includes(chat.id)).length;
  $('delete-chat-count').textContent = `${chat.name} has ${unique} ${unique === 1 ? 'unique link' : 'unique links'} and ${shared} shared ${shared === 1 ? 'link' : 'links'}.`;
  $('delete-chat-dialog').showModal();$('cancel-delete-chat').focus();
};
$('cancel-delete-chat').onclick = () => $('delete-chat-dialog').close();
$('delete-chat-dialog').onclose = () => {pendingChat = '';};
$('confirm-delete-chat').onclick = () => run(async () => {
  if (!$('delete-chat-dialog').open || !pendingChat) return;
  // A stopped collector can still deliver a final packet for this chat.
  retireCaptureSession();
  const result = deleteChat(library,pendingChat);await save();
  activeChat = '';currentPage = 1;lastDeleted = undefined;$('delete-chat-dialog').close();render();
  status(`Deleted ${result.name}. ${result.removedLinks} ${result.removedLinks === 1 ? 'private link was' : 'private links were'} removed; ${result.keptLinks} shared ${result.keptLinks === 1 ? 'link remains' : 'links remain'}.`);
});
$('cancel-delete-topic').onclick = () => $('delete-topic-dialog').close();
$('delete-topic-dialog').onclose = () => {pendingTopic = '';};
$('confirm-delete-topic').onclick = () => run(async () => {
  if (!$('delete-topic-dialog').open || !pendingTopic) return;
  const result = deleteTopic(library,pendingTopic);await save();
  if (activeTopic === result.name) activeTopic = '';
  currentPage = 1;$('delete-topic-dialog').close();render();
  status(`Deleted topic ${topicLabel(result.name)}. ${result.movedLinks} ${result.movedLinks === 1 ? 'link moved' : 'links moved'} to Unsorted.`);
});
$('reset').onclick = () => filterChanged(resetFilters);
$('undo').onclick = () => run(async () => {undoDelete(library,lastDeleted);lastDeleted = undefined;await save();status('Deleted link restored, including its reading state and chats.');});
$('enrich').onclick = () => run(async () => {
  const selected = view();if (!selected.length) throw new Error('There are no links in this filtered list.');
  if (!await chrome.permissions.request({origins:['https://*/*']})) throw new Error('Site access was declined. Your library is unchanged.');
  let failed = 0;
  for (const [index,item] of selected.entries()) {
    if (!library.items.includes(item)) continue;
    status(`Fetching link ${index + 1} of ${selected.length}...`);
    try {const result = await enrichLink(item);replaceURL(library,item.url,{...result,topic:item.topicEdited ? item.topic : classify(result.title,result.url)});} catch {failed++;}
  }
  await save();status(`Finished fetching titles. ${failed} links could not be fetched and were kept unchanged.`);
});
function download(text,type,extension) {
  const url = URL.createObjectURL(new Blob([text],{type})), a = document.createElement('a');a.href = url;
  a.download = ((activeChat ? chatName(activeChat) : 'LinkVault-library').replace(/[^a-z0-9_-]+/gi,'-').slice(0,80) || 'library') + extension;
  a.click();setTimeout(() => URL.revokeObjectURL(url),30000);
}
$('markdown').onclick = () => {
  const items = view().map(item => ({...item,selected:true,title:`${item.title} (${states[item.state]})`,topic:topicLabel(item.topic),sources:item.sources.filter(source => !activeChat || source.chatId === activeChat).map(source => ({...source,text:`[Chat: ${chatName(source.chatId)}] ${source.text || ''}`}))}));
  download(markdown(items,activeChat ? chatName(activeChat) : 'All chats',$('context').checked),'text/markdown;charset=utf-8','.md');
};
$('json').onclick = () => download(JSON.stringify(library,null,2),'application/json','.json');
$('clear-backup').onclick = $('json').onclick;
$('clear-all').onclick = () => {
  if (!ready || busy || capturing) return;
  $('clear-confirm').value = '';$('clear-error').textContent = '';
  $('clear-count').textContent = `This removes all ${library.items.length} links across ${library.chats.length} ${library.chats.length === 1 ? 'chat' : 'chats'}, not just the filtered list.`;
  $('clear-dialog').showModal();controls();$('cancel-clear').focus();
};
$('clear-confirm').oninput = controls;
$('cancel-clear').onclick = () => {$('clear-dialog').close();$('clear-all').focus();};
$('clear-dialog').onclose = () => {$('clear-confirm').value = '';controls();};
$('confirm-clear').onclick = () => run(async () => {
  if (capturing) throw new Error('Stop collection before deleting all links.');
  if (!$('clear-dialog').open || $('clear-confirm').value !== 'DELETE') {
    $('clear-error').textContent = 'Type DELETE to confirm. Nothing has been removed.';return;
  }
  const count = library.items.length, next = {...library,items:[],deleted:[]};
  // Finished collectors can still have delayed messages in flight. Retire their token.
  retireCaptureSession();
  try {await save(next,{collection:null});}
  catch(error) {$('clear-error').textContent = `Nothing was removed: ${error.message}`;throw error;}
  library = next;hasLegacySnapshot = false;lastDeleted = undefined;resetFilters();$('clear-dialog').close();
  status(`Deleted all ${count} links and their captured context. Chat names and preferences were kept. Import your saved backup to restore links.`);
});
try {
  ownership = await acquireOwnership(globalThis.navigator?.locks);
  const stored = await chrome.storage.local.get(['library','collection','theme','onboardingVersion']);hasLegacySnapshot = Boolean(stored.collection);applyTheme(stored.theme);library = restoreLibrary(stored.library || stored.collection);
  ready = ownership.owned;navigation.restore(stored.onboardingVersion);
  if (!ready) status('Another LinkVault dashboard owns this library. Close this duplicate and use the original dashboard to edit or collect.',true);
  if (ready && !stored.library && stored.collection) {
    try {await save();} catch(error) {status(`Could not save migration: ${error.message}. Download a JSON backup to protect your restored links.`,true);}
  }
} catch(error) {status(`Could not restore the library: ${error.message}. Stored data has not been overwritten.`,true);}
busy = false;render();
window.addEventListener('pagehide',() => {if (capturing) chrome.tabs.sendMessage(tabId,{type:'stop'}).catch(() => {});ownership?.release();});
