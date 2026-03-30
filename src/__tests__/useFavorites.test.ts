import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '../hooks/useFavorites'

const STORAGE_KEY = 'utils-foo-favorites'

beforeEach(() => {
  localStorage.clear()
})

describe('useFavorites — initial state', () => {
  it('starts with an empty favorites set when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites.size).toBe(0)
  })

  it('loads pre-seeded favorites from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['jwt-decoder', 'base64']))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.isFavorite('jwt-decoder')).toBe(true)
    expect(result.current.isFavorite('base64')).toBe(true)
    expect(result.current.isFavorite('hash')).toBe(false)
  })

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{{')
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites.size).toBe(0)
  })

  it('handles non-array JSON in localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'jwt-decoder' }))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites.size).toBe(0)
  })
})

describe('addFavorite', () => {
  it('adds a tool id to favorites', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.addFavorite('hash'))
    expect(result.current.isFavorite('hash')).toBe(true)
  })

  it('persists the addition to localStorage', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.addFavorite('hash'))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    expect(stored).toContain('hash')
  })

  it('is idempotent — adding the same id twice keeps size at 1', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => { result.current.addFavorite('hash'); result.current.addFavorite('hash') })
    expect(result.current.favorites.size).toBe(1)
  })
})

describe('removeFavorite', () => {
  it('removes an existing favorite', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['hash']))
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.removeFavorite('hash'))
    expect(result.current.isFavorite('hash')).toBe(false)
  })

  it('removing a non-existent id is a no-op', () => {
    const { result } = renderHook(() => useFavorites())
    expect(() => act(() => result.current.removeFavorite('ghost'))).not.toThrow()
    expect(result.current.favorites.size).toBe(0)
  })

  it('persists the removal to localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['hash']))
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.removeFavorite('hash'))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    expect(stored).not.toContain('hash')
  })
})

describe('toggleFavorite', () => {
  it('adds when the id is not currently a favorite', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggleFavorite('hash'))
    expect(result.current.isFavorite('hash')).toBe(true)
  })

  it('removes when the id is already a favorite', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['hash']))
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggleFavorite('hash'))
    expect(result.current.isFavorite('hash')).toBe(false)
  })

  it('toggling twice restores the original state', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggleFavorite('hash'))
    act(() => result.current.toggleFavorite('hash'))
    expect(result.current.isFavorite('hash')).toBe(false)
  })
})

describe('isFavorite', () => {
  it('returns true only for ids that have been added', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.addFavorite('jwt-decoder'))
    expect(result.current.isFavorite('jwt-decoder')).toBe(true)
    expect(result.current.isFavorite('base64')).toBe(false)
  })
})
