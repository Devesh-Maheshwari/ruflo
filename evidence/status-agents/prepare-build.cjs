const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pkg = process.cwd();
const extra = process.env.STATUS_BUILD_DEPS;
assert.ok(extra && path.isAbsolute(extra), 'STATUS_BUILD_DEPS must name the temporary dependency directory');
// The focused install omits heavyweight optional runtime dependencies. Nostr
// types are still needed by the CLI compiler; use the workspace lock's version.
const type = process.platform === 'win32' ? 'junction' : 'dir';
for (const [target, link] of [
  [path.join(extra, 'node_modules/nostr-tools'), path.join(pkg, 'node_modules/nostr-tools')],
  [path.join(pkg, 'node_modules'), path.resolve(pkg, '../swarm/node_modules')],
]) {
  assert.ok(fs.existsSync(target), `Missing build dependency: ${target}`);
  if (!fs.existsSync(link)) fs.symlinkSync(target, link, type);
}
