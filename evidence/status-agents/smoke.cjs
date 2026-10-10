const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const pkg = process.cwd();
const ts = require(path.join(pkg, 'node_modules/typescript'));
// Runtime transpilation only. The complete workspace typecheck is separate.
for (const file of fs.readdirSync(path.join(pkg, 'src'), { recursive: true })) {
  if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
  const target = path.join(pkg, 'dist/src', file.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(pkg, 'src', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruflo-status-agents-cli-'));
try {
  const store = path.join(dir, '.claude-flow/agents');
  fs.mkdirSync(store, { recursive: true });
  fs.writeFileSync(path.join(store, 'store.json'), JSON.stringify({ version: '3.0.0', agents: {
    demo: { agentId: 'demo-coder', agentType: 'coder', status: 'idle', health: 0.85,
      taskCount: 3, config: {}, createdAt: '2026-01-01T00:00:00.000Z' },
  } }));
  const run = args => {
    const result = cp.spawnSync(process.execPath, [path.join(pkg, 'bin/cli.js'), 'status', 'agents', ...args, '--no-update'], {
    cwd: dir, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, CLAUDE_FLOW_CWD: dir, RUFLO_DAEMON_AUTOSTART: '0', NO_COLOR: '1' },
  });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    return args.includes('--format') ? result.stdout : result.stdout + result.stderr;
  };
  const text = run([]);
  assert.match(text, /demo-coder/);
  assert.match(text, /idle/);
  assert.doesNotMatch(text, /No agents|undefined|NaN|Unexpected error/);
  const data = JSON.parse(run(['--format', 'json']));
  assert.equal(data.total, 1);
  assert.equal(data.agents[0].agentId, 'demo-coder');
  assert.equal(data.agents[0].taskCount, 3);
  fs.rmSync(store, { recursive: true });
  assert.match(run([]), /No agents registered/);
  console.log('PASS: real CLI text, JSON and empty-registry checks on ' + process.platform);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
