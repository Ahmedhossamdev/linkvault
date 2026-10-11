// 1. Open your LinkedIn/WhatsApp/Telegram chat thread in the browser (logged in).
// 2. Click inside the message list, then paste this in DevTools Console.
// 3. It finds the real scroll container and scrolls up until history is loaded.
(() => {
  const els = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100;
  });
  els.sort((a, b) => b.scrollHeight - a.scrollHeight);
  console.log(els.slice(0, 3).map(e => ({ cls: String(e.className).slice(0, 120), h: e.scrollHeight, ch: e.clientHeight })));
  const box = els[0];
  if (!box) { console.log('No scroll box found. Scroll manually with PageUp.'); return; }
  console.log('using box:', box);
  let lastH = 0, stable = 0;
  const timer = setInterval(() => {
    box.scrollTop = 0;
    const h = box.scrollHeight;
    console.log('loaded height:', h);
    if (h === lastH) stable++; else stable = 0;
    lastH = h;
    if (stable > 12) { clearInterval(timer); console.log('DONE, now run extractor.js'); }
  }, 900);
})();
