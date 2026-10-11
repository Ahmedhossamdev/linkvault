// Shared by the dashboard and the isolated collector. No page content is used.
(() => {
  if (globalThis.LinkVaultProgress) return;
  function clock(milliseconds) {
    const seconds = Math.floor(Math.max(0,milliseconds || 0) / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`;
  }
  const phases = {scrolling:'Scrolling',waiting:'Waiting for older messages',manual:'Watching your scrolling',saving:'Saving links',stopped:'Stopped',paused:'Paused',error:'Collection interrupted'};
  function summary(progress) {
    return `${clock(progress.elapsedMs)} elapsed · ${progress.totalLinks || 0} links saved · ${progress.scrollSteps || 0} scrolls`;
  }
  function createWidget(document, onStop) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed!important;bottom:20px!important;left:20px!important;width:310px!important;max-width:calc(100vw - 40px)!important;z-index:2147483647!important;';
    const shadow = host.attachShadow({mode:'closed'});
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial;font:14px/1.5 system-ui,sans-serif;color:#213b38}
      section{padding:16px;background:#f7faf5;border:1px solid #bdcec1;border-radius:12px;box-shadow:0 5px 26px #183a3026}
      header{display:flex;align-items:center;gap:9px;font-weight:650}
      .dot{width:9px;height:9px;border-radius:50%;background:#6d8074}
      .active .dot{background:#27634f;animation:pulse 1.6s ease-in-out infinite}
      .error .dot{background:#b44932}
      .phase{font-weight:600;margin:10px 0 4px}.metrics{font-size:12px;color:#53665b;font-variant-numeric:tabular-nums}
      .message{font-size:12px;overflow-wrap:anywhere;margin:8px 0}
      .actions{display:flex;gap:8px;margin-top:12px}
      button{font:inherit;border-radius:7px;padding:7px 12px;border:1px solid #27634f;background:#27634f;color:#fff;cursor:pointer}
      button.secondary{background:transparent;color:#27634f;border-color:#bdcec1}
      button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:3px solid #d39555;outline-offset:2px}
      @keyframes pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.active .dot{animation:none}}
    `;
    const section = document.createElement('section');section.setAttribute('aria-label','LinkVault collection progress');
    const header = document.createElement('header');
    const dot = document.createElement('span');dot.className = 'dot';dot.setAttribute('aria-hidden','true');
    const title = document.createElement('span');title.textContent = 'LinkVault';header.append(dot,title);
    const phase = document.createElement('div');phase.className = 'phase';phase.setAttribute('role','status');phase.setAttribute('aria-live','polite');
    const metrics = document.createElement('div');metrics.className = 'metrics';
    const message = document.createElement('p');message.className = 'message';
    const actions = document.createElement('div');actions.className = 'actions';
    const stop = document.createElement('button');stop.textContent = 'Stop collection';stop.onclick = onStop;
    const dismiss = document.createElement('button');dismiss.className = 'secondary';dismiss.textContent = 'Dismiss';dismiss.onclick = () => host.remove();
    actions.append(stop,dismiss);section.append(header,phase,metrics,message,actions);shadow.append(style,section);
    document.documentElement.append(host);
    return {
      update(progress) {
        section.className = progress.running ? 'active' : progress.phase === 'error' ? 'error' : '';
        const label = phases[progress.phase] || 'Ready';
        if (phase.textContent !== label) phase.textContent = label;
        metrics.textContent = summary(progress);message.textContent = progress.status || '';
        stop.disabled = !progress.running;dismiss.disabled = progress.running || progress.phase === 'saving';
      },
      remove() { host.remove(); },
    };
  }
  globalThis.LinkVaultProgress = {clock,summary,phases,createWidget};
})();
