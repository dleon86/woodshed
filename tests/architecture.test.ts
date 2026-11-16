import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const theoryDir = join(root, 'src', 'theory');
const cardsDir = join(root, 'src', 'cards');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    // Tests sit next to the code and import vitest; only shipped code is checked.
    return /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  const pattern = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(pattern)].map((m) => (m[1] ?? m[2]) as string);
}

/** Imports from `file` that resolve outside every allowed directory (npm packages always count). */
function violations(dir: string, allowed: string[]): string[] {
  const found: string[] = [];
  for (const file of sourceFiles(dir)) {
    for (const spec of importsOf(readFileSync(file, 'utf8'))) {
      const target = resolve(dirname(file), spec);
      const ok = spec.startsWith('.') && allowed.some((a) => !relative(a, target).startsWith('..'));
      if (!ok) found.push(`${relative(root, file)} imports "${spec}"`);
    }
  }
  return found;
}

describe('layer boundaries', () => {
  it('theory imports only from inside src/theory (no UI, framework or browser code)', () => {
    expect(violations(theoryDir, [theoryDir])).toEqual([]);
  });

  it('cards import only from src/cards and the theory engine', () => {
    expect(violations(cardsDir, [cardsDir, theoryDir])).toEqual([]);
  });
});
