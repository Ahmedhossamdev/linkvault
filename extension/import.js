import { mergeLinks } from './core.js';

export function importJSON(text) {
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.links)) throw new Error('Choose a LinkVault version 1 JSON backup.');
  const links = data.links.map(item => {
    if (!item || typeof item.url !== 'string' || (item.title !== undefined && typeof item.title !== 'string') || (item.topic !== undefined && typeof item.topic !== 'string')) throw new Error('Invalid link in JSON backup.');
    const sources = (Array.isArray(item.sources) ? item.sources : []).map(source => {
      if (!source || typeof source !== 'object') throw new Error('Invalid message context in JSON backup.');
      return Object.fromEntries(['text','sender','date'].map(key => [key,typeof source[key] === 'string' ? source[key].slice(0,2000) : '']));
    });
    return {url:item.url,title:item.title?.slice(0,500),topic:item.topic?.slice(0,60),selected:item.selected !== false,sources};
  });
  return {links:mergeLinks([],links),name:typeof data.name === 'string' ? data.name.slice(0,160) : ''};
}

export function importHTML(text) {
  // DOMParser creates an inert document. It is never attached to the visible page.
  const doc = new DOMParser().parseFromString(text,'text/html');
  doc.querySelectorAll('script,style,noscript').forEach(el => el.remove());
  const bodies = [...doc.querySelectorAll('.msg-s-event-listitem__body, [data-view-name="message-body"]')];
  const targets = bodies.length ? bodies : [doc.body];
  const links = [];
  for (const target of targets) {
    const message = target.closest('.msg-s-message-list__event, .msg-s-event-listitem, [data-event-urn]');
    const source = {text:target.textContent.trim().slice(0,2000),sender:message?.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.textContent?.trim() || '',date:message?.querySelector('time')?.getAttribute('datetime') || ''};
    // Generic HTML fallback has no reliable message provenance.
    const sources = bodies.length ? [source] : [];
    for (const a of target.querySelectorAll('a[href]')) links.push({url:a.getAttribute('href'),title:a.textContent.trim(),sources});
    for (const match of target.textContent.matchAll(/https?:\/\/[^\s<>"']+/g)) links.push({url:match[0].replace(/[.,;!]+$/,''),sources});
  }
  return {links:mergeLinks([],links),fallback:!bodies.length};
}
export function importText(text) {
  return mergeLinks([], [...text.matchAll(/https?:\/\/[^\s<>"']+/g)].map(match => ({url:match[0].replace(/[.,;!]+$/,''),sources:[]})));
}
