// Most reliable method: save full page HTML so LinkVault can parse everything offline.
// Paste in DevTools Console. Downloads linkedin-chat.html.
(() => {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'linkedin-chat.html';
  a.click();
  console.log('saved', html.length, 'chars. Run: linkvault full linkedin-chat.html --out out --obsidian vault-notes');
})();
