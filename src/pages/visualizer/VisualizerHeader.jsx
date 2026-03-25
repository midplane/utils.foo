import { Code2, RotateCcw, BookMarked } from 'lucide-react'

export default function VisualizerHeader({ onReset, mode, onModeChange, onToggleSaves, savesCount }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <Code2 size={20} className="text-indigo-400" />
        <span className="text-white font-semibold text-lg tracking-tight">JSX Visualizer</span>
        <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
          live
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
          <button
            onClick={() => onModeChange('jsx')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              mode === 'jsx'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Code2 size={13} />
            JSX
          </button>
          <button
            onClick={() => onModeChange('formula')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              mode === 'formula'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="text-base leading-none">ƒ</span>
            Formula
          </button>
        </div>

        {/* Saves */}
        <button
          onClick={onToggleSaves}
          className="relative flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors"
        >
          <BookMarked size={14} />
          Saves
          {savesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
              {savesCount > 9 ? '9+' : savesCount}
            </span>
          )}
        </button>

        {/* Reset (JSX only) */}
        {mode === 'jsx' && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>
    </header>
  )
}
