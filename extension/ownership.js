// A browser-wide lock prevents duplicated dashboards from saving stale snapshots.
export async function acquireOwnership(locks) {
  if (!locks?.request) throw new Error('This browser does not support the single-writer guard. Use a supported Chromium browser.');
  let release = () => {};
  const owned = await new Promise((resolve,reject) => {
    locks.request('linkvault-library',{ifAvailable:true},lock => {
      if (!lock) {resolve(false);return;}
      const held = new Promise(done => {release = done;});resolve(true);return held;
    }).catch(reject);
  });
  return {owned,release};
}
