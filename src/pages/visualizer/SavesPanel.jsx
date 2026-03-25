import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Download, Code2, FunctionSquare, Clock, Edit3, Check } from 'lucide-react'

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function SaveRow({ save, onLoad, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(save.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== save.name) onRename(save.id, trimmed)
    else setDraft(save.name)
    setEditing(false)
  }

  const preview = save.mode === 'formula'
    ? save.formula
    : save.code?.split('\n')[0]?.trim()

  return (
    <div className="group flex flex-col gap-1 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-2">
        {/* Mode badge */}
        <span className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
          save.mode === 'formula'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-indigo-500/15 text-indigo-400'
        }`}>
          {save.mode === 'formula'
            ? <><FunctionSquare size={10} />ƒ</>
            : <><Code2 size={10} />JSX</>}
        </span>

        {/* Name */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(save.name); setEditing(false) } }}
            className="flex-1 text-sm bg-gray-700 text-white border border-indigo-500 rounded px-2 py-0.5 focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm text-gray-200 truncate">{save.name}</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {editing ? (
            <button onClick={commitRename} className="p-1 text-emerald-400 hover:text-emerald-300" title="Save name">
              <Check size={13} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1 text-gray-500 hover:text-gray-300" title="Rename">
              <Edit3 size={13} />
            </button>
          )}
          <button onClick={() => onLoad(save)} className="p-1 text-indigo-400 hover:text-indigo-300" title="Load">
            <Download size={13} />
          </button>
          <button onClick={() => onDelete(save.id)} className="p-1 text-gray-500 hover:text-red-400" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {preview && (
        <p className="text-xs font-mono text-gray-500 truncate pl-0.5">{preview}</p>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Clock size={10} />
        {relativeTime(save.savedAt)}
      </div>
    </div>
  )
}

export default function SavesPanel({ isOpen, onClose, saves, onSave, onLoad, onDelete, onRename, currentMode }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [isOpen])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-80 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-sm font-semibold text-white">Saved</span>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Save current */}
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-2">
            Save current {currentMode === 'formula' ? 'formula' : 'JSX'}
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Name this save…"
              className="flex-1 text-sm bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {saves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
              <FunctionSquare size={28} />
              <p className="text-sm">No saves yet</p>
            </div>
          ) : (
            saves.map(save => (
              <SaveRow
                key={save.id}
                save={save}
                onLoad={s => { onLoad(s); onClose() }}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
