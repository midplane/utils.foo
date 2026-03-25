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
    const next = [
      { ...item, id: Date.now().toString(), savedAt: new Date().toISOString() },
      ...saves,
    ]
    setSaves(next)
    persist(next)
  }

  function deleteSave(id) {
    const next = saves.filter(s => s.id !== id)
    setSaves(next)
    persist(next)
  }

  function renameSave(id, name) {
    const next = saves.map(s => s.id === id ? { ...s, name } : s)
    setSaves(next)
    persist(next)
  }

  return { saves, addSave, deleteSave, renameSave }
}
