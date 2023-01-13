/*
 *  recursive fs.watch()
 */

const fs = require('fs/promises');
const path = require('path');
const EventEmitter = require('events');

const pLimit = require('p-limit');

module.exports = function watch(dirs, opts = {}, _emitter = new EventEmitter()) {
  if (typeof dirs === 'string') dirs = [dirs];

  const ds = [...dirs];
  const collecteds = [];
  let watchers = [];
  let synced;

  const filter = async (dirs, opts) => {
    const filtereds = [];

    const limit = pLimit(10);

    await Promise.all(
      dirs.map((d) =>
        limit(async () => {
          const stats = await fs.stat(d);
          const n = path.basename(d);
          if (stats.isDirectory() && !stats.isSymbolicLink() &&
            (!opts.ignoreHiddenDirs || n[0] !== '.')) {
            filtereds.push(d);
          }
        }),
      ),
    );

    return filtereds;
  };

  const scan = async (dirs) => {
    if (dirs.length === 0) return;

    const d = dirs.pop();
    collecteds.push(d);

    let files;
    try {
      files = await fs.readdir(d);
    } catch (err) {
      _emitter.emit('error', err);
      scan(dirs);
    }

    const filtereds = await filter(files.map((f) => path.join(d, f)), opts);
    await scan([...dirs, ...filtereds]);
  };

  _emitter.sync = async () => {
    if (synced || !watchers) return;

    watchers.forEach((abort) => abort());
    watchers = null;
    watch(dirs, opts, _emitter);
  };

  filter(ds, {...opts, ignoreHiddenDirs: false})
    .then(scan)
    .then(() => {
      if (!watchers) return;

      collecteds.forEach((d) => {
        const ac = new AbortController();
        const {signal} = ac;
        (async () => {
          try {
            const watcher = fs.watch(d, {signal});
            // eslint-disable-next-line no-empty-pattern
            for await (const {} of watcher) {
              synced = false;
              _emitter.emit('change');
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
            _emitter.emit('error', err);
          }
        })();
        watchers.push(() => ac.abort());
      });
      synced = true;
    });

  return _emitter;
};

// eslint-disable-next-line no-constant-condition
if (true) {
  const w = module.exports;
  const emitter = w('test', {ignoreHiddenDirs: true})
    .on('change', () => console.log('changed'))
    .on('error', (err) => console.log(err || 'error'));
  setInterval(() => {
    console.log('synced');
    emitter.sync();
  }, 15 * 1000);
}

// end of recursiveWatch.js
