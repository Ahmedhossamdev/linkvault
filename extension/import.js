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

const markdownUnescape = text => text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g,'$1');
const referenceKey = text => markdownUnescape(text).trim().replace(/\s+/g,' ').toLowerCase();
// This is a link importer, not a Markdown renderer. Bound token work and nesting,
// and never decode percent escapes or trim punctuation from destinations.
const markdownTokenLimit = 8192;
// Dependency-free in browsers and Node: semicolon-terminated common named
// references below, decimal references (1-7 digits), and hex (1-6 digits).
// Unknown names stay literal. Decode once, without HTML parsing or percent
// decoding; escaped ampersands remain literal Markdown punctuation.
const markdownEntities = {amp:'&',AMP:'&',lt:'<',LT:'<',gt:'>',GT:'>',quot:'"',QUOT:'"',apos:"'",nbsp:'\u00a0',copy:'\u00a9',reg:'\u00ae'};
function markdownURL(text) {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])|&(#(?:[xX][0-9a-fA-F]{1,6}|[0-9]{1,7})|[A-Za-z][A-Za-z0-9]{1,31});/g,(match,escaped,entity) => {
    if (escaped !== undefined) return escaped;
    if (entity[0] !== '#') return Object.hasOwn(markdownEntities,entity) ? markdownEntities[entity] : match;
    const hex = entity[1].toLowerCase() === 'x';
    const value = Number.parseInt(entity.slice(hex ? 2 : 1),hex ? 16 : 10);
    return String.fromCodePoint(value === 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) ? 0xfffd : value);
  });
}
function markdownBracket(text,start) {
  let depth = 1, end = start + 1;
  for (; end < text.length && end - start <= markdownTokenLimit; end++) {
    if (text[end] === '\\') { end++; continue; }
    if (text[end] === '[') depth++;
    if (text[end] === ']' && --depth === 0) return {text:text.slice(start + 1,end),end:end + 1,closed:true};
    if (depth > 32) break;
  }
  return {end:Math.min(end + 1,text.length),closed:false};
}
function markdownDestination(text,start) {
  const limit = Math.min(text.length,start + markdownTokenLimit);
  let i = start;
  while (i < limit && /\s/.test(text[i])) i++;
  const angle = text[i] === '<', begin = angle ? ++i : i;
  let depth = 0;
  for (; i < limit; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (angle) {
      if (c === '>') break;
      if (c === '<' || /\s/.test(c)) return null;
    } else {
      if (/\s/.test(c) || (c === ')' && depth === 0)) break;
      if (c === '(' && ++depth > 32) return null;
      if (c === ')') depth--;
      if (c === '<' || c === '>') return null;
    }
  }
  if (i === begin || i >= limit || depth !== 0 || (angle && text[i] !== '>')) return null;
  const url = markdownURL(text.slice(begin,i));
  if (angle) i++;
  const whitespace = i;
  while (i < limit && /\s/.test(text[i])) i++;
  if (i > whitespace && ['"',"'",'('].includes(text[i])) {
    const close = text[i] === '(' ? ')' : text[i];
    i++;
    while (i < limit && text[i] !== close) { if (text[i] === '\\') i++; i++; }
    if (i >= limit) return null;
    i++;
    while (i < limit && /\s/.test(text[i])) i++;
  }
  return text[i] === ')' ? {url,end:i + 1} : null;
}
function markdownCodeMask(text) {
  // Pair exact backtick runs in linear time, including spans crossing lines.
  const runs = [], next = new Map();
  for (const match of text.matchAll(/`+/g)) {
    const start = match.index;
    let backslashes = 0;
    for (let i = start - 1; i >= 0 && text[i] === '\\'; i--) backslashes++;
    runs.push({start,end:start + match[0].length,length:match[0].length,escaped:backslashes % 2 === 1});
  }
  for (let i = runs.length - 1; i >= 0; i--) {
    runs[i].close = next.get(runs[i].length);
    next.set(runs[i].length,i);
  }
  const parts = [];
  let cursor = 0;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.escaped || run.close === undefined) continue;
    const end = runs[run.close].end;
    parts.push(text.slice(cursor,run.start),text.slice(run.start,end).replace(/[^\n]/g,' '));
    cursor = end;
    i = run.close;
  }
  parts.push(text.slice(cursor));
  return parts.join('');
}
export function importMarkdown(text) {
  let fence = null, listIndent = null;
  const lines = text.replace(/\r\n?/g,'\n').split('\n').map(line => {
    if (fence) {
      const close = line.match(/^ {0,3}(`+|~+)\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      return '';
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
      fence = {char:opening[1][0],length:opening[1].length};
      return '';
    }
    const indent = line.match(/^\s*/)[0].replace(/\t/g,'    ').length;
    // Exported message context is nested under its saved link, not provenance
    // we can safely reconstruct. Skip nested list and continuation content.
    if (listIndent !== null && indent > listIndent && line.trim()) return '';
    if (/^(?: {4}|\t)/.test(line)) return '';
    const list = line.match(/^ {0,3}(?:[-+*]|\d+[.)])\s+/);
    if (list) listIndent = indent;
    else if (line.trim()) listIndent = null;
    return line;
  });
  const content = markdownCodeMask(lines.join('\n')).split('\n');
  const references = new Map(), body = [];
  for (const line of content) {
    const start = line.search(/\S/);
    const label = start >= 0 && line[start] === '[' ? markdownBracket(line,start) : null;
    if (label?.closed && line[label.end] === ':') {
      const destination = markdownDestination(line + ')',label.end + 1);
      const key = referenceKey(label.text);
      if (key && destination && destination.end === line.length + 1 && !references.has(key)) references.set(key,destination.url);
    } else body.push(line);
  }
  let name = '', topic = '';
  const links = [];
  const add = (url,title) => links.push({url,title:markdownUnescape(title).trim().replace(/\s+\((?:To read|Reading|Read|Archived)\)$/,'').slice(0,500),topic,state:'unread',sources:[]});
  for (const line of body) {
    const heading = line.match(/^ {0,3}(#{1,2})\s+(.+?)\s*$/);
    if (heading) {
      const value = markdownUnescape(heading[2].replace(/\s+#+\s*$/,'')).trim();
      if (heading[1] === '#' && !name) name = value.slice(0,160);
      if (heading[1] === '##') topic = value.slice(0,60);
      continue;
    }
    let angleEnd;
    for (let i = 0; i < line.length;) {
      if (line[i] === '\\') { i += 2; continue; }
      if (line[i] === '<') {
        // Reuse a missing closer instead of repeatedly searching a long line.
        if (angleEnd === undefined || (angleEnd !== -1 && angleEnd <= i)) angleEnd = line.indexOf('>',i + 1);
        const end = angleEnd;
        if (end > i && end - i <= markdownTokenLimit) {
          const url = line.slice(i + 1,end);
          if (/^https?:\/\/[^\s<>]+$/i.test(url)) add(url,url);
          i = end + 1;
        } else i++;
        continue;
      }
      const image = line[i] === '!' && line[i + 1] === '[';
      if (image) i++;
      if (line[i] !== '[') { i++; continue; }
      const label = markdownBracket(line,i);
      i = label.end;
      if (!label.closed) continue;
      if (line[i] === '(') {
        const destination = markdownDestination(line,i + 1);
        if (destination) { if (!image) add(destination.url,label.text); i = destination.end; }
        continue;
      }
      let key = label.text;
      if (line[i] === '[') {
        const reference = markdownBracket(line,i);
        i = reference.end;
        if (!reference.closed) continue;
        key = reference.text || key;
      }
      const url = references.get(referenceKey(key));
      if (!image && url) add(url,label.text);
    }
  }
  return {name,links:mergeLinks([],links)};
}
