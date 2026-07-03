import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
}

function readText(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('web ESLint ignores only the generated Next env declaration file', () => {
  const config = readJson('apps/web/.eslintrc.json');

  assert.deepEqual(config.ignorePatterns, ['next-env.d.ts']);
  assert.deepEqual(config.extends, ['next/core-web-vitals', 'next/typescript']);
});

test('Turbo uses the tasks schema and root dependencies pin safe tooling', () => {
  const turbo = readJson('turbo.json');
  const rootPackage = readJson('package.json');

  assert.equal('pipeline' in turbo, false);
  assert.ok(turbo.tasks.build.outputs.includes('.next/**'));
  assert.equal(rootPackage.devDependencies.turbo, '^2.5.4');
  assert.equal(rootPackage.pnpm.overrides.postcss, '^8.4.47');
});

test('security workflow uses event-specific TruffleHog scan ranges', () => {
  const workflow = readText('.github/workflows/security.yml');

  assert.match(workflow, /if: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow, /base: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow, /head: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /if: \$\{\{ github\.event_name == 'push' && github\.event\.before != '0000000000000000000000000000000000000000' \}\}/);
  assert.match(workflow, /base: \$\{\{ github\.event\.before \}\}/);
  assert.match(workflow, /head: \$\{\{ github\.sha \}\}/);
});
