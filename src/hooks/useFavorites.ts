import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'utils-foo-favorites'

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return new Set(parsed)
      }
    }
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]))
  } catch {
    // Ignore storage errors
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites())

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const addFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  }
}
