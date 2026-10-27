import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandFiles, run } from '../index.js';

const tmp = mkdtempSync(join(tmpdir(), 'plagx-action-'));

async function runWith(inputs) {
  const out = join(tmp, `out-${Math.random()}`);
  const summary = join(tmp, `sum-${Math.random()}`);
  writeFileSync(out, '');
  writeFileSync(summary, '');
  const env = { GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: summary };
  for (const [k, v] of Object.entries(inputs)) env[`INPUT_${k.toUpperCase()}`] = v;
  const saved = { ...process.env };
  const logs = [];
  const log = console.log;
  Object.assign(process.env, env);
  console.log = (s) => logs.push(String(s));
  try {
    const code = await run();
    return { code, logs, outputs: readFileSync(out, 'utf8'), summary: readFileSync(summary, 'utf8') };
  } finally {
    console.log = log;
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

test('wildcards find fixture files', () => {
  assert.deepEqual(expandFiles('test/fixtures/*.bib'), ['test/fixtures/refs.bib']);
  assert.deepEqual(expandFiles('**/clean.json'), ['test/fixtures/clean.json']);
  assert.deepEqual(expandFiles('a.bib  a.bib\nb.json'), ['a.bib', 'b.json']);
});

test('problems produce annotations with line numbers, outputs and a failing exit code', async () => {
  const r = await runWith({ files: 'test/fixtures/refs.bib' });
  assert.equal(r.code, 1);
  assert.ok(r.logs.includes('::error file=test/fixtures/refs.bib,line=3,title=Plagx Cite::smithdup: Possible duplicate (title match) of smith2020: smith2020, smithdup'));
  assert.ok(r.logs.some((l) => l.startsWith('::warning file=test/fixtures/refs.bib,line=4,')));
  assert.equal(r.outputs, 'references=4\nerrors=2\nwarnings=2\n');
  assert.match(r.summary, /\| ❌ \| `bad` \| Invalid DOI "not-a-doi" \|/);
  assert.match(r.summary, /utm_source=plagx-cite-action/);
});

test('fail-on never and clean files pass', async () => {
  assert.equal((await runWith({ files: 'test/fixtures/refs.bib', 'fail-on': 'never' })).code, 0);
  const clean = await runWith({ files: 'test/fixtures/clean.json', style: 'mla' });
  assert.equal(clean.code, 0);
  assert.match(clean.summary, /✅ No problems found/);
  assert.match(clean.summary, /A, B\. \*Clean book\*\. P, 2001\./);
});

test('missing files and bad inputs are reported', async () => {
  const missing = await runWith({ files: 'nope.bib' });
  assert.equal(missing.code, 1);
  assert.ok(missing.logs.some((l) => l.startsWith('::error file=nope.bib,title=Plagx Cite::File not found')));
  await assert.rejects(runWith({ files: 'test/fixtures/refs.bib', style: 'chicago' }), /Unknown style/);
  await assert.rejects(runWith({ files: 'none/*.bib' }), /No files matched/);
});
