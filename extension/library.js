import { mergeLinks, normalizeURL } from './core.js';
import { importJSON } from './import.js';

export const states = {unread:'To read',reading:'Reading',read:'Read',archived:'Archived'};
export function emptyLibrary() { return {version:2,chats:[],topics:[],items:[],deleted:[]}; }
const identities = item => [item.url,...(item.aliases || [])];
function mergeEntry(existing,item) {
  existing.chatIds = [...new Set([...existing.chatIds,...item.chatIds])];
  existing.aliases = [...new Set([...identities(existing),...identities(item)])].filter(url => url !== existing.url);
  existing.sources = mergeLinks([existing],[{...item,url:existing.url}])[0].sources;
}
function insertEntry(library,item) {
  const overlaps = (a,b) => identities(a).some(url => identities(b).includes(url));
  const existing = library.items.find(entry => entry.url === item.url) || library.items.find(entry => overlaps(entry,item));
  if (!existing) {library.items.push(item);return;}
  mergeEntry(existing,item);
  // Imported aliases may connect more than two previously separate URLs.
  let duplicate;
  while ((duplicate = library.items.find(entry => entry !== existing && overlaps(entry,existing)))) {
    mergeEntry(existing,duplicate);library.items = library.items.filter(entry => entry !== duplicate);
  }
}
export function category(url,topic) {
  const host = new URL(url).hostname.replace(/^www\./,'');
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  if (host === 'github.com') return 'github';
  return topic === 'os-linux' ? 'os' : topic || 'misc-useful';
}
export function ensureChat(library,source,name = 'Chat') {
  const existing = library.chats.find(chat => chat.source === source);
  if (existing) return existing;
  const chat = {id:`chat:${source}`,source,name:name.trim().slice(0,160) || 'Chat'};
  library.chats.push(chat);return chat;
}
export function ingest(library,chatId,incoming) {
  if (!library.chats.some(chat => chat.id === chatId)) throw new Error('Unknown chat.');
  const ignored = new Set(library.deleted);
  const clean = mergeLinks([],incoming).filter(item => !ignored.has(item.url));
  const existing = new Map(library.items.flatMap(item => identities(item).map(url => [url,item])));
  for (const item of clean) {
    const tagged = {...item,sources:item.sources.map(source => ({...source,chatId}))};
    const old = existing.get(item.url);
    if (old) {
      old.sources = mergeLinks([old],[{...tagged,url:old.url}])[0].sources;
      if (!old.chatIds.includes(chatId)) old.chatIds.push(chatId);
    } else {
      const entry = {...tagged,aliases:[],chatIds:[chatId],state:Object.hasOwn(states,item.state) ? item.state : 'unread',category:category(item.url,item.topic)};
      library.items.push(entry);existing.set(entry.url,entry);
    }
  }
}
export function site(url) {
  const host = new URL(url).hostname.replace(/^www\./,'');
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) return 'youtube';
  if (host === 'github.com') return 'github';
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'lnkd.in') return 'linkedin';
  return 'web';
}
export function entries(library,{chatId = '',state = '',category:group = '',topic = '',site:sourceSite = '',search = ''} = {}) {
  const query = search.toLowerCase().trim();
  return library.items.filter(item => (!chatId || item.chatIds.includes(chatId)) && (!state || (state === 'active' ? item.state !== 'archived' : item.state === state)) && (!group || item.category === group) && (!topic || item.topic === topic) && (!sourceSite || site(item.url) === sourceSite) && (!query || `${item.title} ${item.url} ${item.topic}`.toLowerCase().includes(query)));
}
export function replaceURL(library,original,replacement) {
  const item = library.items.find(item => item.url === original);
  const url = normalizeURL(replacement.url);
  if (!item || !url) throw new Error('Invalid replacement link.');
  if (library.deleted.includes(url)) {deleteEntry(library,original);return;}
  const existing = library.items.find(entry => identities(entry).includes(url) && entry !== item);
  if (existing) {
    mergeEntry(existing,item);
    library.items = library.items.filter(entry => entry !== item);
  } else {
    item.aliases = [...new Set(identities(item))].filter(alias => alias !== url);
    item.url = url;item.title = replacement.title || item.title;
    item.topic = replacement.topic || item.topic;item.category = category(url,item.topic);
  }
}
export function setState(library,url,state) {
  if (!Object.hasOwn(states,state)) throw new Error('Unknown reading state.');
  const item = library.items.find(item => item.url === url);if (!item) throw new Error('Link not found.');
  item.state = state;
}
function normalizedTopic(name) {return typeof name === 'string' ? name.trim().replace(/\s+/g,' ').slice(0,60) : '';}
export function addTopic(library,name) {
  const topic = normalizedTopic(name);if (!topic) throw new Error('Enter a topic name.');
  library.topics ||= [];
  const existing = library.topics.find(saved => saved.toLocaleLowerCase() === topic.toLocaleLowerCase());
  if (existing) return existing;
  library.topics.push(topic);return topic;
}
export function setTopic(library,url,topic) {
  const item = library.items.find(item => item.url === url);if (!item) throw new Error('Link not found.');
  const name = normalizedTopic(topic) || 'misc-useful';
  item.topic = name;item.topicEdited = true;item.category = category(item.url,name);
  return name;
}
export function deleteTopic(library,topic) {
  const name = normalizedTopic(topic);if (!name) throw new Error('Unknown topic.');
  let movedLinks = 0;
  for (const item of library.items) if (item.topic === name) {item.topic = 'misc-useful';item.topicEdited = true;item.category = category(item.url,item.topic);movedLinks++;}
  library.topics = (library.topics || []).filter(saved => saved !== name);
  return {name,movedLinks};
}
export function deleteChat(library,chatId) {
  const chat = library.chats.find(chat => chat.id === chatId);if (!chat) throw new Error('Unknown chat.');
  let removedLinks = 0, keptLinks = 0;
  library.items = library.items.filter(item => {
    if (!item.chatIds.includes(chatId)) return true;
    item.chatIds = item.chatIds.filter(id => id !== chatId);
    item.sources = (item.sources || []).filter(source => source.chatId !== chatId);
    if (item.chatIds.length) {keptLinks++;return true;}
    removedLinks++;return false;
  });
  library.chats = library.chats.filter(item => item.id !== chatId);
  return {name:chat.name,removedLinks,keptLinks};
}
export function deleteEntry(library,url) {
  const item = library.items.find(item => item.url === url);
  library.items = library.items.filter(item => item.url !== url);
  if (item) for (const identity of identities(item)) if (!library.deleted.includes(identity)) library.deleted.push(identity);
  return item;
}
export function undoDelete(library,item) {
  if (!item) return;
  library.deleted = library.deleted.filter(url => !identities(item).includes(url));
  if (!library.items.some(entry => entry.url === item.url)) library.items.push(item);
}
export function restoreLibrary(data) {
  if (!data) return emptyLibrary();
  if (data.version === 1) {
    const previous = importJSON(JSON.stringify(data));const library = emptyLibrary();
    const chat = ensureChat(library,`legacy:${crypto.randomUUID()}`,previous.name || 'Previous collection');ingest(library,chat.id,previous.links);return library;
  }
  if (data.version !== 2 || !Array.isArray(data.chats) || !Array.isArray(data.items) || !Array.isArray(data.deleted) || (data.topics !== undefined && !Array.isArray(data.topics))) throw new Error('Invalid LinkVault library backup.');
  const library = emptyLibrary();const ids = new Set();
  library.topics = [...new Set((data.topics || []).map(normalizedTopic).filter(Boolean))];
  for (const chat of data.chats) {
    if (!chat || typeof chat.id !== 'string' || !chat.id || chat.id.length > 4096 || ids.has(chat.id) || typeof chat.name !== 'string' || typeof chat.source !== 'string') throw new Error('Invalid chat in library backup.');
    ids.add(chat.id);library.chats.push({id:chat.id,name:chat.name.slice(0,160),source:chat.source.slice(0,4096)});
  }
  for (const raw of data.items) {
    if (!raw || !Array.isArray(raw.chatIds) || !raw.chatIds.length || raw.chatIds.some(id => !ids.has(id)) || !Object.hasOwn(states,raw.state || 'unread')) throw new Error('Invalid reading-list entry or chat membership.');
    const item = importJSON(JSON.stringify({version:1,links:[{...raw,sources:[]}]})).links[0];if (!item) continue;
    const chatIds = [...new Set(raw.chatIds)];
    // Keep the chat tag while sanitizing, before deduplication of context.
    item.sources = (Array.isArray(raw.sources) ? raw.sources : []).map(source => {
      if (!source || typeof source !== 'object') throw new Error('Invalid message context in library backup.');
      const fields = Object.fromEntries(['text','sender','date'].map(key => [key,typeof source[key] === 'string' ? source[key].slice(0,2000) : '']));
      return {...fields,chatId:chatIds.includes(source.chatId) ? source.chatId : chatIds[0]};
    });
    if (raw.aliases !== undefined && (!Array.isArray(raw.aliases) || raw.aliases.some(alias => typeof alias !== 'string'))) throw new Error('Invalid URL aliases in library backup.');
    const aliases = [...new Set((raw.aliases || []).map(normalizeURL).filter(url => url && url !== item.url))];
    const entry = {...item,aliases,chatIds,topicEdited:raw.topicEdited === true,state:raw.state || 'unread',category:typeof raw.category === 'string' && raw.category ? raw.category.slice(0,60) : category(item.url,item.topic)};
    insertEntry(library,entry);
  }
  library.deleted = [...new Set(data.deleted.map(raw => normalizeURL(raw)).filter(Boolean))];
  library.items = library.items.filter(item => !identities(item).some(url => library.deleted.includes(url)));
  return library;
}
export function mergeLibrary(library,data) {
  const other = restoreLibrary(data);
  library.topics ||= [];
  for (const topic of other.topics) addTopic(library,topic);
  for (const chat of other.chats) if (!library.chats.some(existing => existing.id === chat.id)) library.chats.push(chat);
  for (const item of other.items) {
    if (!identities(item).some(url => library.deleted.includes(url))) insertEntry(library,item);
  }
  // Imported exclusions apply only to links not already present locally.
  for (const url of other.deleted) if (!library.items.some(item => identities(item).includes(url)) && !library.deleted.includes(url)) library.deleted.push(url);
}
