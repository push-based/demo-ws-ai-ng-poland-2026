import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const stepsDirectory = new URL('../steps/', import.meta.url);
const steps = (await readdir(stepsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^[0-5]-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

assert.equal(steps.length, 6, 'Expected all six workshop checkpoints.');

// Removing only comment switches must leave exactly the same scaffold.
function normalize(source) {
  return source.split('\n')
    .filter((line) => !['/*', '*/'].includes(line.trim()))
    .map((line) => line.replace(/^(\s*)\/\/ /, '$1'))
    .join('\n');
}

const sources = await Promise.all(steps.map(async (step) => ({
  step,
  code: await readFile(new URL(`${step}/main.ts`, stepsDirectory), 'utf8'),
  html: await readFile(new URL(`${step}/index.html`, stepsDirectory), 'utf8'),
})));

for (const source of sources.slice(1)) {
  assert.equal(normalize(source.code), normalize(sources[0].code),
    `${source.step}: changes must be comment switches only; update the shared scaffold in every checkpoint.`);
  assert.equal(source.html, sources[0].html,
    `${source.step}: checkpoint HTML must stay identical.`);
}

console.log('All six checkpoints share the same scaffold; only comment switches differ.');
