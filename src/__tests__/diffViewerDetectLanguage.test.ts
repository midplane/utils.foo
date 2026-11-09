import { describe, it, expect } from 'vitest'
import { detectLanguage } from '../tools/diff-viewer/detectLanguage'

describe('detectLanguage — ES modules (regression)', () => {
  // `export` was a Shell keyword, so every ES module was detected as Shell.
  it('export const is not Shell', () =>
    expect(detectLanguage('export const add = (a, b) => a + b')).toBe('JavaScript'))

  it('export with a type annotation is TypeScript', () =>
    expect(detectLanguage('export function f(a: string) { return a }')).toBe('TypeScript'))

  // `^import\s+\w` matched `import x from 'y'`, so ES imports were detected as Python.
  it("import x from 'y' is not Python", () =>
    expect(detectLanguage("import fs from 'fs'\nconst x = fs.readFileSync('a')")).toBe('JavaScript'))

  it('import React is JSX', () =>
    expect(detectLanguage("import React from 'react'\nexport default function App() { return <div /> }")).toBe('JSX'))

  it('import java.* is Java', () =>
    expect(detectLanguage('import java.util.List;\npublic class A {}')).toBe('Java'))
})

describe('detectLanguage — brace languages (regression: detected as CSS)', () => {
  it('a Java class is Java', () =>
    expect(detectLanguage('public class Main {\n  int x = 1;\n}')).toBe('Java'))

  it('a Rust impl block is Rust', () =>
    expect(detectLanguage('impl Point {\n  fn new() -> Self { Point {} }\n}')).toBe('Rust'))

  it('a CSS rule is still CSS', () =>
    expect(detectLanguage('.card {\n  color: red;\n}')).toBe('CSS'))

  it('an @media block is still CSS', () =>
    expect(detectLanguage('@media (max-width: 600px) {\n  body { margin: 0; }\n}')).toBe('CSS'))
})

describe('detectLanguage — unchanged cases', () => {
  it('a Python import is Python', () =>
    expect(detectLanguage('import os\nprint(os.getcwd())')).toBe('Python'))

  it('import x as y is Python', () =>
    expect(detectLanguage('import numpy as np\nnp.zeros(3)')).toBe('Python'))

  it('a shell export is Shell', () =>
    expect(detectLanguage('export PATH=/usr/bin:$PATH\nls')).toBe('Shell'))

  it('echo is Shell', () =>
    expect(detectLanguage('echo hello')).toBe('Shell'))
})
