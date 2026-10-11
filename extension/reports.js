import { states } from './library.js';

function summarize(items) {
  const counts = Object.fromEntries(Object.keys(states).map(state => [state,0]));
  for (const item of items) if (Object.hasOwn(counts,item.state)) counts[item.state]++;
  return {total:items.length,counts,readPercent:items.length ? Math.round(counts.read / items.length * 100) : 0};
}
export function readingReport(library) {
  return {
    ...summarize(library.items),
    byChat:library.chats.map(chat => ({id:chat.id,name:chat.name,...summarize(library.items.filter(item => item.chatIds.includes(chat.id)))})),
    byTopic:[...new Set(library.items.map(item => item.topic))].sort().map(topic => ({topic,...summarize(library.items.filter(item => item.topic === topic))})),
  };
}
