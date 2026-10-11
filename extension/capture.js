// Runs in an isolated content-script world. Never evaluates message content.
(() => {
  if (globalThis.linkVaultCapture) return;
  let running = false, timer, observer, root, thread, lastSignature = '', idleSince = null;
  let pending = [], chain = Promise.resolve(), seen = new Set(), runId = 0;
  let automatic = false, lastAttempt = null;
  let intervalMs = 750, startedAt = 0;
  let stoppedAt = 0, scrollSteps = 0, totalLinks = 0, phase = 'stopped', currentStatus = '', widget;
  function progress() {
    return {running,phase,elapsedMs:Math.max(0,(running ? Date.now() : stoppedAt) - startedAt),scrollSteps,totalLinks,status:currentStatus};
  }
  function showProgress() { widget?.update(progress()); }
  function interrupted(reason) {
    running = false;stoppedAt = Date.now();phase = 'error';currentStatus = reason;
    clearInterval(timer);observer?.disconnect();showProgress();
  }
  const roots = '.msg-s-message-list, .msg-s-message-list-container, .msg-s-message-list-content, .msg-s-message-list__content, [data-view-name="message-list"], [role="log"]';
  const messages = '.msg-s-message-list__event, .msg-s-event-listitem, [data-event-urn]';
  const bodies = '.msg-s-event-listitem__body, .msg-s-event-listitem__message-bubble, [data-view-name="message-body"]';
  const overlay = '.msg-overlay-conversation-bubble, .msg-overlay-list-bubble, .msg-overlay-conversation-bubble--is-active';
  function visible(el) {
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }
  function preferred(candidates) {
    const page = candidates.filter(el => !el.closest(overlay));
    const main = page.filter(el => el.closest('main, [role="main"], .scaffold-layout__detail'));
    return main.length ? main : page.length ? page : candidates;
  }
  function locate() {
    const detected = [...document.querySelectorAll(roots)];
    let candidates = detected.filter(el => visible(el) && el.querySelectorAll(bodies).length);
    if (!candidates.length) {
      // Derive the nearest conversation scroller from message bodies when
      // LinkedIn changes its list-container classes. Never use the whole page.
      const inferred = new Set();
      for (const body of document.querySelectorAll(bodies)) {
        if (!visible(body)) continue;
        let parent = body.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          const style = getComputedStyle(parent);
          if (parent.scrollHeight > parent.clientHeight + 10 && /^(auto|scroll|hidden|overlay)$/.test(style.overflowY)) { inferred.add(parent); break; }
          parent = parent.parentElement;
        }
      }
      candidates = [...inferred];
    }
    candidates = preferred(candidates);
    const innermost = candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
    if (!innermost.length) throw new Error(`No conversation messages found (${detected.length} list containers, ${document.querySelectorAll(bodies).length} message bodies). Return to the LinkedIn tab, wait for messages to load, then try again. If this persists, share these counts so the page layout can be supported.`);
    if (innermost.length !== 1) throw new Error(`Multiple conversation lists found (${innermost.length}). Close floating chat windows and keep one conversation open in the full messaging page.`);
    return innermost[0];
  }
  function scrollContainers() {
    const candidates = [];
    for (let el = root; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.clientHeight > 0 && /^(auto|scroll|hidden|overlay)$/.test(getComputedStyle(el).overflowY)) candidates.push(el);
    }
    return candidates;
  }
  function describe(el) {
    const style = getComputedStyle(el);
    return {tag:el.tagName || '',classes:typeof el.className === 'string' ? el.className.slice(0,200) : '',scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,overflowY:style.overflowY,flexDirection:style.flexDirection || ''};
  }
  function diagnostics() {
    let detectionError = '';
    if (!running && !root?.isConnected) {
      try { root = locate(); } catch(error) { detectionError = error.message; }
    }
    return {version:'0.1.4',mode:automatic ? 'automatic' : 'manual',intervalMs,running,rootConnected:!!root?.isConnected,detectionError,listContainers:document.querySelectorAll(roots).length,messageBodies:document.querySelectorAll(bodies).length,scrollContainers:root ? scrollContainers().map(describe) : [],lastAttempt,progress:progress()};
  }
  function advance() {
    const containers = scrollContainers();
    if (!containers.length) throw new Error('No scrollable conversation container found. Use Show scrolling diagnostics in the dashboard.');
    let blocked = false;
    for (const el of containers) {
      const before = el.scrollTop;
      const range = Math.max(0,el.scrollHeight - el.clientHeight);
      const reversed = getComputedStyle(el).flexDirection === 'column-reverse' || before < 0;
      const oldest = reversed ? -range : 0;
      if (before <= oldest + 1) continue;
      const target = Math.max(oldest,before - Math.max(1,el.clientHeight * 0.8));
      if (el.scrollTo) el.scrollTo({top:target,behavior:'instant'});
      else el.scrollTop = target;
      lastAttempt = {...describe(el),before,target,after:el.scrollTop,reversed};
      if (Math.abs(el.scrollTop - before) > 0.5) {
        scrollSteps++;
        el.dispatchEvent(new Event('scroll'));
        return {moved:true,atTop:el.scrollTop <= oldest + 1};
      }
      blocked = true;
    }
    if (blocked) throw new Error('The conversation scroll container did not move. Collection paused. Use Show scrolling diagnostics in the dashboard.');
    // Already at the oldest currently loaded message. Emit a scroll event so
    // the page can request earlier history, and wait for its own loader.
    containers[0].dispatchEvent(new Event('scroll'));
    return {moved:false,atTop:true};
  }
  function collect() {
    if (location.href !== thread || !root.isConnected) { stop('Conversation changed. Capture stopped.'); return; }
    const items = [];
    const allBodies = [...root.querySelectorAll(bodies)];
    const loadedBodies = allBodies.filter(body => !allBodies.some(other => other !== body && body.contains?.(other)));
    for (const body of loadedBodies) {
      const message = body.closest(messages) || body.parentElement;
      const text = body.innerText || '';
      const source = {
        sender: message?.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.textContent?.trim() || '',
        date: message?.querySelector('time')?.getAttribute('datetime') || message?.querySelector('time')?.textContent?.trim() || '',
        text: text.slice(0,2000),
      };
      for (const anchor of body.querySelectorAll('a[href]')) items.push({url:anchor.href,title:anchor.textContent.trim(),sources:[source]});
      for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) items.push({url:match[0].replace(/[.,;!]+$/,''),title:'',sources:[source]});
    }
    for (const item of items) {
      const key = JSON.stringify([item.url,item.sources]);
      if (!seen.has(key)) { seen.add(key); pending.push(item); }
    }
    return loadedBodies.map(body => body.innerText || body.textContent).join('|');
  }
  function flush(status,finalPhase) {
    const links = pending.splice(0);
    currentStatus = finalPhase ? 'Saving collected links...' : status;
    showProgress();
    const payload = {type:'capture', thread, links, status, running, runId,progress:{...progress(),phase:finalPhase || phase,status}};
    chain = chain.then(async () => {
      const result = await chrome.runtime.sendMessage(payload);
      if (payload.runId !== runId) return;
      if (!result?.ok) {
        interrupted(result?.error || 'Dashboard unavailable. Collection stopped; the last batch may not be saved.');
        return;
      }
      if (Number.isFinite(result.totalLinks)) totalLinks = result.totalLinks;
      if (finalPhase) {phase = finalPhase;currentStatus = status;}
      showProgress();
    }).catch(() => { if (payload.runId === runId) interrupted('Connection to LinkVault was lost. Collection stopped; the last batch may not be saved.'); });
  }
  function stop(status = 'Stopped. Collected links are saved.',finalPhase = 'stopped') {
    running = false;stoppedAt = Date.now();phase = 'saving';
    clearInterval(timer);
    observer?.disconnect();
    flush(status,finalPhase);
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'diagnostics') { respond({diagnostics:diagnostics()}); return; }
    if (message.type === 'stop') {
      if (running) collect();
      stop();
      chain.then(() => respond({ok:true}));
      return true;
    }
    if (message.type !== 'start') return;
    try {
      if (running) stop();
      runId = message.runId; automatic = !!message.auto; lastAttempt = null;
      intervalMs = Number.isFinite(message.intervalMs) ? Math.max(250,Math.min(5000,message.intervalMs)) : 750;
      root = locate(); thread = location.href; running = true; idleSince = null; lastSignature = ''; seen = new Set(); startedAt = Date.now();
      stoppedAt = startedAt;scrollSteps = 0;totalLinks = Number.isFinite(message.totalLinks) ? Math.max(0,message.totalLinks) : 0;
      phase = automatic ? 'scrolling' : 'manual';currentStatus = '';
      widget?.remove();
      widget = globalThis.LinkVaultProgress?.createWidget(document,() => {if (running) collect();stop();});
      collect();
      if (automatic) {
        const first = advance();
        phase = first.moved ? 'scrolling' : 'waiting';
        flush(first.moved ? 'Automatic collection started: the conversation scrolled toward older messages.' : 'At the oldest loaded messages. Waiting for earlier history to load.');
      } else flush('Manual collection started. Scroll the conversation yourself to collect older messages.');
      observer = new MutationObserver(() => { if (running) collect(); });
      observer.observe(root,{childList:true,subtree:true});
      timer = setInterval(() => {
        if (!running) return;
        const signature = collect();
        if (!running) return;
        if (!automatic) { flush('Watching messages. Scroll to collect older links.'); return; }
        try {
          const movement = advance();
          phase = movement.moved ? 'scrolling' : 'waiting';
          if (signature === lastSignature && movement.atTop && !movement.moved) idleSince ??= Date.now();
          else idleSince = null;
          lastSignature = signature;
          flush(movement.moved ? 'Scrolled toward older messages. Keep the LinkedIn tab open.' : 'At the oldest loaded messages. Waiting for earlier history to load.');
        } catch(error) { stop(error.message,'error'); return; }
        if (Date.now() - startedAt >= 600000 || (idleSince !== null && Date.now() - idleSince >= 30000)) stop('Paused after no new messages or the 10-minute limit. This does not guarantee complete history. Restart to retry, or scroll manually.','paused');
      },automatic ? intervalMs : 2000);
      respond({ok:true});
    } catch (error) { stop(error.message,'error'); respond({error:error.message}); }
  });
  globalThis.linkVaultCapture = true;
})();
