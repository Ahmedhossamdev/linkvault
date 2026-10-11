const rules = [
  ['dsa-interview', /leetcode|neetcode|data structure|dynamic programming/i],
  ['system-design', /system.?design|distributed system|microservice|kafka|sharding/i],
  ['db', /postgres|mysql|redis|mongo|database|sqlite/i],
  ['os-linux', /linux|kernel|ebpf/i],
  ['network', /tcp|dns|nginx|cloudflare|websocket|grpc/i],
  ['devops', /docker|kubernetes|terraform|ansible|devops/i],
  ['frontend', /javascript|typescript|react|frontend|svelte/i],
  ['backend', /backend|django|fastapi|spring boot/i],
  ['python', /python/i], ['ai-ml', /machine learning|llm|pytorch|huggingface|openai|anthropic/i],
  ['security', /owasp|tryhackme|security/i], ['courses', /course|udemy|coursera|tutorial/i],
  ['science', /\b(science|astronomy|physics|biology|chemistry|space exploration|neuroscience)\b/i],
  ['health', /\b(health|nutrition|wellbeing|wellness|medicine|medical|mental health)\b/i],
  ['finance', /\b(finance|investing|investment|budgeting|stocks|personal finance|economics)\b/i],
  ['business', /\b(business|entrepreneurship|startup|marketing|management|leadership)\b/i],
  ['design', /\b(design|typography|ux|ui|illustration|architecture)\b/i],
  ['books', /\b(books?|literature|novels?|fiction|poetry|book review)\b/i],
  ['history', /\b(history|historical|ancient|archaeology|civilization)\b/i],
  ['travel', /\b(travel|tourism|itinerary|destinations?|backpacking)\b/i],
  ['food', /\b(food|recipes?|cooking|baking|cuisine)\b/i],
  ['fitness', /\b(fitness|workout|exercise|running|strength training|yoga)\b/i],
  ['photography', /\b(photography|photographic|camera|cinematography)\b/i],
  ['music', /\b(music|musical|guitar|piano|songwriting|composers?)\b/i],
  ['philosophy', /\b(philosophy|philosophical|ethics|stoicism)\b/i],
  ['psychology', /\b(psychology|psychological|cognition|behavioral)\b/i],
  ['environment', /\b(climate|sustainability|environment|conservation|renewable energy)\b/i],
  ['art', /\b(art|painting|sculpture|museum|artwork)\b/i],
  ['career', /\b(career|resume|job search|hiring|productivity)\b/i],
  ['technology', /\b(technology|software|programming|computing|electronics)\b/i],
];
export const topicLabels = {'dsa-interview':'Algorithms & interviews','system-design':'System design',db:'Databases','os-linux':'OS & Linux',network:'Networking',devops:'DevOps',frontend:'Frontend',backend:'Backend',python:'Python','ai-ml':'AI & machine learning',security:'Security',courses:'Learning',science:'Science',health:'Health',finance:'Finance',business:'Business',design:'Design',books:'Books',history:'History',travel:'Travel',food:'Food',fitness:'Fitness',photography:'Photography',music:'Music',philosophy:'Philosophy',psychology:'Psychology',environment:'Environment',art:'Art',career:'Career & productivity',technology:'Technology','github-repos':'Repositories',videos:'Videos','linkedin-posts':'Posts','misc-useful':'Unsorted'};
export const topicLabel = topic => Object.hasOwn(topicLabels,topic) ? topicLabels[topic] : topic;
export function normalizeURL(raw) {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    if (u.hostname === 'linkedin.com' || u.hostname.endsWith('.linkedin.com')) {
      if (!/^\/(posts|pulse|advice|events|learning)\//.test(u.pathname) && !u.pathname.startsWith('/feed/update/')) return null;
    }
    if (u.hostname.endsWith('.licdn.com') || /\.(png|jpg|jpeg|svg|gif|css|js|woff2?|ico)$/i.test(u.pathname)) return null;
    for (const key of [...u.searchParams.keys()]) if (/^utm_/i.test(key) || ['fbclid','gclid'].includes(key)) u.searchParams.delete(key);
    return u.href;
  } catch { return null; }
}
export function classify(title, url) {
  const text = `${title} ${url}`;
  for (const [topic, pattern] of rules) if (pattern.test(text)) return topic;
  const host = new URL(url).hostname;
  if (host === 'github.com') return 'github-repos';
  if (['youtube.com','www.youtube.com','youtu.be'].includes(host)) return 'videos';
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'linkedin-posts';
  return 'misc-useful';
}
export function mergeLinks(existing, incoming) {
  const map = new Map(existing.map(item => [item.url, {...item, sources:[...(item.sources || [])]}]));
  for (const item of incoming) {
    const url = normalizeURL(item.url);
    if (!url) continue;
    if (!map.has(url)) map.set(url, {...item, url, title:item.title || url, topic:item.topic || classify(item.title || '',url), selected:item.selected !== false, sources:[]});
    const target = map.get(url);
    const seen = new Set(target.sources.map(source => JSON.stringify(source)));
    for (const source of item.sources || []) {
      const key = JSON.stringify(source);
      if (!seen.has(key)) { target.sources.push(source); seen.add(key); }
    }
  }
  return [...map.values()];
}
const escape = text => String(text || '').replace(/\s+/g,' ').replace(/[\\`*_[\]<>#]/g,'\\$&');
export function markdown(links, name = 'Link collection', context = false) {
  const selected = links.filter(item => item.selected !== false);
  const groups = Map.groupBy(selected, item => item.topic || 'misc-useful');
  let output = `# ${escape(name)}\n\n${selected.length} unique links\n`;
  for (const [topic, items] of groups) {
    output += `\n## ${escape(topic)}\n\n`;
    for (const item of items) {
      const url = item.url.replace(/[()<>\s]/g,c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0'));
      output += `- [${escape(item.title || item.url)}](${url})\n`;
      if (context) for (const source of item.sources || []) output += `  - ${escape([source.sender,source.date,source.text].filter(Boolean).join(' | '))}\n`;
    }
  }
  return output;
}
