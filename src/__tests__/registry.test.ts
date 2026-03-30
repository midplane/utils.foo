import { describe, it, expect } from 'vitest'
import { tools, searchTools, getToolById, getToolByPath, getCategories } from '../tools/registry'

describe('tools registry — basic shape', () => {
  it('contains at least 20 tools', () => {
    expect(tools.length).toBeGreaterThanOrEqual(20)
  })

  it('every tool has id, name, path, category, description, keywords', () => {
    for (const tool of tools) {
      expect(typeof tool.id).toBe('string')
      expect(typeof tool.name).toBe('string')
      expect(typeof tool.path).toBe('string')
      expect(typeof tool.category).toBe('string')
      expect(typeof tool.description).toBe('string')
      expect(Array.isArray(tool.keywords)).toBe(true)
    }
  })

  it('all ids are unique', () => {
    const ids = tools.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all paths are unique', () => {
    const paths = tools.map(t => t.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('getToolById', () => {
  it('returns the correct tool for a known id', () => {
    const tool = getToolById('jwt-decoder')
    expect(tool).toBeDefined()
    expect(tool!.name.toLowerCase()).toContain('jwt')
  })

  it('returns undefined for an unknown id', () => {
    expect(getToolById('does-not-exist')).toBeUndefined()
  })
})

describe('getToolByPath', () => {
  it('returns a tool matching the given path', () => {
    // Use a known path from the registry (jwt-decoder registers at /jwt)
    const tool = getToolByPath('/jwt')
    expect(tool).toBeDefined()
    expect(tool!.id).toBe('jwt-decoder')
  })

  it('returns undefined for an unknown path', () => {
    expect(getToolByPath('/no-such-tool')).toBeUndefined()
  })
})

describe('getCategories', () => {
  it('returns an array of strings', () => {
    const cats = getCategories()
    expect(Array.isArray(cats)).toBe(true)
    cats.forEach(c => expect(typeof c).toBe('string'))
  })

  it('contains no duplicates', () => {
    const cats = getCategories()
    expect(new Set(cats).size).toBe(cats.length)
  })

  it('returns at least 3 distinct categories', () => {
    expect(getCategories().length).toBeGreaterThanOrEqual(3)
  })
})

describe('searchTools', () => {
  it('empty query returns all tools', () => {
    expect(searchTools('').length).toBe(tools.length)
  })

  it('whitespace-only query returns all tools', () => {
    expect(searchTools('   ').length).toBe(tools.length)
  })

  it('searching "jwt" finds the JWT decoder', () => {
    const results = searchTools('jwt')
    expect(results.some(t => t.id === 'jwt-decoder')).toBe(true)
  })

  it('searching "base64" finds the base64 tool', () => {
    const results = searchTools('base64')
    expect(results.some(t => t.id === 'base64')).toBe(true)
  })

  it('search is case-insensitive', () => {
    const lower = searchTools('jwt')
    const upper = searchTools('JWT')
    expect(lower.map(t => t.id).sort()).toEqual(upper.map(t => t.id).sort())
  })

  it('searching a nonsense string returns empty array', () => {
    expect(searchTools('xyzzy_no_tool_has_this_name_42')).toHaveLength(0)
  })

  it('searching by category name returns multiple tools', () => {
    const cats = getCategories()
    const firstCat = cats[0]!
    const results = searchTools(firstCat)
    expect(results.length).toBeGreaterThan(0)
  })

  it('every result matches the query in name, description, category, or keywords', () => {
    const q = 'hash'
    const results = searchTools(q)
    const ql = q.toLowerCase()
    for (const tool of results) {
      const matchesAny =
        tool.name.toLowerCase().includes(ql) ||
        tool.description.toLowerCase().includes(ql) ||
        tool.category.toLowerCase().includes(ql) ||
        tool.keywords.some(k => k.toLowerCase().includes(ql))
      expect(matchesAny).toBe(true)
    }
  })
})
