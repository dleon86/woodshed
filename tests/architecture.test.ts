import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const theoryDir = join(root, 'src', 'theory');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  const pattern = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(pattern)].map((m) => (m[1] ?? m[2]) as string);
}

describe('theory engine boundary', () => {
  it('imports only from inside src/theory (no UI, framework or browser code)', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(theoryDir)) {
      for (const spec of importsOf(readFileSync(file, 'utf8'))) {
        const insideTheory =
          spec.startsWith('.') && !relative(theoryDir, resolve(dirname(file), spec)).startsWith('..');
        if (!insideTheory) violations.push(`${relative(root, file)} imports "${spec}"`);
      }
    }
    expect(violations).toEqual([]);
  });
});
