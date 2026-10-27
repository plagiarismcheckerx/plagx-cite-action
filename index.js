// Plagx Cite Reference Check: GitHub Action entry point.
// A free academic writing utility by Plagiarism Checker X (https://plagiarismcheckerx.com/).
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { checkReferences, formatBibliography, parseBibTeX, styles } from './lib/index.js';

const PCX = 'https://plagiarismcheckerx.com/?utm_source=github-action&utm_medium=job-summary&utm_campaign=plagx&utm_content=plagx-cite-action';

const input = (name, fallback = '') => (process.env[`INPUT_${name.toUpperCase()}`] ?? fallback).trim();
const bool = (value) => /^(true|yes|1|on)$/i.test(value);
// Workflow command escaping (https://docs.github.com/actions/reference/workflow-commands-for-github-actions)
const escData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = (s) => escData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
const mdCell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function annotate(level, file, line, message) {
  const props = [`file=${escProp(file)}`, line ? `line=${line}` : '', 'title=Plagx Cite'].filter(Boolean).join(',');
  console.log(`::${level} ${props}::${escData(message)}`);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

/** Converts a wildcard pattern (*, **, ?) to a regular expression on forward-slash paths. */
function globToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      re += pattern[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += pattern[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

let allFiles;
function listFiles() {
  allFiles ??= readdirSync('.', { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath ?? d.path, d.name).replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter((f) => !/(^|\/)(node_modules|\.git)\//.test(f));
  return allFiles;
}

export function expandFiles(spec) {
  const found = [];
  for (const raw of spec.split(/\s+/).filter(Boolean)) {
    const pattern = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    const matches = /[*?]/.test(pattern) ? listFiles().filter((f) => globToRegExp(pattern).test(f)).sort() : [pattern];
    for (const m of matches) if (!found.includes(m)) found.push(m);
  }
  return found;
}

function load(file) {
  const text = readFileSync(file, 'utf8');
  if (extname(file).toLowerCase() === '.json') {
    const data = JSON.parse(text);
    const refs = Array.isArray(data) ? data : data.items || data.references;
    if (!Array.isArray(refs)) throw new Error('must contain a CSL-JSON array of references');
    return { refs, lineOf: () => undefined };
  }
  const lines = text.split(/\r?\n/);
  const lineOf = (key) => {
    if (!key || key.startsWith('#')) return undefined;
    const re = new RegExp(`^\\s*@\\w+\\s*[{(]\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,`);
    const i = lines.findIndex((l) => re.test(l));
    return i >= 0 ? i + 1 : undefined;
  };
  return { refs: parseBibTeX(text), lineOf };
}

export async function run() {
  const files = expandFiles(input('files'));
  const style = input('style', 'apa').toLowerCase();
  const failOn = input('fail-on', 'error').toLowerCase();
  const checkDOIs = bool(input('check-dois', 'false'));
  const wantSummary = bool(input('summary', 'true'));

  if (!files.length) throw new Error('No files matched the "files" input.');
  if (!styles.includes(style)) throw new Error(`Unknown style "${style}". Use: ${styles.join(', ')}.`);
  if (!['error', 'warning', 'never'].includes(failOn)) throw new Error('fail-on must be "error", "warning" or "never".');

  const totals = { references: 0, errors: 0, warnings: 0 };
  const sections = [];

  for (const file of files) {
    if (!existsSync(file)) {
      annotate('error', file, undefined, 'File not found');
      totals.errors += 1;
      sections.push(`### ${file}\n\n❌ File not found.\n`);
      continue;
    }
    let loaded;
    try {
      loaded = load(file);
    } catch (err) {
      annotate('error', file, undefined, `Cannot read references: ${err.message}`);
      totals.errors += 1;
      sections.push(`### ${file}\n\n❌ Cannot read references: ${err.message}\n`);
      continue;
    }

    const { refs, lineOf } = loaded;
    const result = await checkReferences(refs, { checkDOIs });
    totals.references += result.references;
    totals.errors += result.errors;
    totals.warnings += result.warnings;
    for (const x of result.issues) annotate(x.level, file, lineOf(x.ref), `${x.ref}: ${x.message}`);
    console.log(`${file}: ${result.references} reference(s), ${result.errors} error(s), ${result.warnings} warning(s)`);

    let md = `### ${file}\n\n${result.references} reference(s) · ${result.errors} error(s) · ${result.warnings} warning(s)\n\n`;
    if (result.issues.length) {
      md += '| | Reference | Problem |\n|---|---|---|\n';
      md += result.issues.map((x) => `| ${x.level === 'error' ? '❌' : '⚠️'} | \`${mdCell(x.ref)}\` | ${mdCell(x.message)} |`).join('\n');
      md += '\n\n';
    } else {
      md += '✅ No problems found.\n\n';
    }
    if (refs.length) {
      md += `<details><summary>Formatted reference list (${style.toUpperCase()})</summary>\n\n`;
      md += formatBibliography(refs, { style, format: 'markdown' }).map((r) => `- ${r}`).join('\n');
      md += '\n\n</details>\n';
    }
    sections.push(md);
  }

  setOutput('references', totals.references);
  setOutput('errors', totals.errors);
  setOutput('warnings', totals.warnings);

  if (wantSummary && process.env.GITHUB_STEP_SUMMARY) {
    const footer = `\n---\n<sub>Checked by Plagx Cite, a free academic writing utility by Plagiarism Checker X. It checks references only. To check a full paper for plagiarism and AI-generated text, use [Text Similarity Detector](${PCX}).</sub>\n`;
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Plagx Cite reference check\n\n${sections.join('\n')}${footer}`);
  }

  const failed = failOn === 'error' ? totals.errors > 0 : failOn === 'warning' ? totals.errors + totals.warnings > 0 : false;
  if (failed) {
    console.log(`::error title=Plagx Cite::${totals.errors} error(s) and ${totals.warnings} warning(s) in ${totals.references} reference(s)`);
    return 1;
  }
  return 0;
}

if (process.env.GITHUB_ACTIONS || process.env.PLAGX_RUN) {
  run().then((code) => { process.exitCode = code; }).catch((err) => {
    console.log(`::error title=Plagx Cite::${escData(err.message)}`);
    process.exitCode = 1;
  });
}
