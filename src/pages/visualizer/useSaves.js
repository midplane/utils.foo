import { useState } from 'react'

const STORAGE_KEY = 'visualizer_saves'

function loadFromStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}

function persist(saves) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves))
}

export function useSaves() {
  const [saves, setSaves] = useState(loadFromStorage)

  function addSave(item) {
    setSaves(prev => {
      const next = [
        { ...item, id: Date.now().toString(), savedAt: new Date().toISOString() },
        ...prev,
      ]
      persist(next)
      return next
    })
  }

  function deleteSave(id) {
    setSaves(prev => {
      const next = prev.filter(s => s.id !== id)
      persist(next)
      return next
    })
  }

  function renameSave(id, name) {
    setSaves(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name } : s)
      persist(next)
      return next
    })
  }

  return { saves, addSave, deleteSave, renameSave }
}
