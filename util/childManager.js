/*
 *  child process manager
 */

const childs = [];
const debug = false;

export function add(child) {
  const handler = () => remove(child);

  if (debug) console.log(`adding ${child.pid}`);
  childs.push({
    handle: child,
    handler,
  });
  child.once('exit', handler);

  return child;
}

export function remove(child) {
  const i = childs.findIndex((c) => c.handle === child);
  if (i < 0) return;
  if (debug) console.log(`removing ${child.pid}`);
  childs.splice(i, 1);

  return child;
}

export function clean() {
  childs.forEach((c) => {
    c.handle.removeListener('exit', c.handler);
    if (debug) console.log(`killing ${c.handle.pid}`);
    c.handle.kill(); // may be unsafe or not work
  });
}

// end of childManager.js
