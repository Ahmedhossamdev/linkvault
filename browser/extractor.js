// Run after history is loaded. Downloads linkedin-links.txt with deduped URLs.
(() => {
  const all = [...document.querySelectorAll('a[href]')].map(a => a.href);
  const urls = [...new Set(all)].filter(h => {
    if (!h.startsWith('http')) return false;
    if (h.includes('linkedin.com/in/')) return false;
    if (h.includes('linkedin.com/company/')) return false;
    if (h.includes('linkedin.com/feed/')) return false;
    if (h.includes('linkedin.com/messaging/')) return false;
    if (h.includes('linkedin.com/search/')) return false;
    if (h.includes('.licdn.com/')) return false;
    return true;
  });
  console.log('found', urls.length);
  const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'linkedin-links.txt';
  a.click();
})();
