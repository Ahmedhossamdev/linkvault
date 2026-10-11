import { normalizeURL } from './core.js';

export async function fetchText(url, options = {}, limit = 250000) {
  const response = await fetch(url,{...options,credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '', bytes = 0;
  try {
    while (bytes < limit) {
      const {value,done} = await reader.read();
      if (done) break;
      const available = Math.min(value.length,limit - bytes);
      text += decoder.decode(value.subarray(0,available),{stream:true});
      bytes += available;
    }
    text += decoder.decode();
  } finally { await reader.cancel(); }
  return {text,url:response.url,type:response.headers.get('content-type') || ''};
}
export async function enrichLink(item) {
  let result = await fetchText(item.url);
  let doc = new DOMParser().parseFromString(result.text,'text/html');
  if (new URL(item.url).hostname === 'lnkd.in') {
    const raw = doc.querySelector('a[data-tracking-control-name="external_url_click"]')?.getAttribute('href');
    const url = raw && normalizeURL(raw);
    if (url) { result = await fetchText(url); doc = new DOMParser().parseFromString(result.text,'text/html'); }
  }
  const url = normalizeURL(result.url);
  if (!url) throw new Error('The link redirected to an unsupported page.');
  const title = /html/i.test(result.type) ? doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title : '';
  return {...item,url,title:title?.trim().slice(0,500) || item.title};
}
