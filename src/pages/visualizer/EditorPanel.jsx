import { LiveEditor } from 'react-live'

export default function EditorPanel({ onChange }) {
  return (
    <div className="w-1/2 flex flex-col bg-gray-950 border-r border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-gray-500 font-mono">editor.jsx</span>
      </div>
      <div className="flex-1 overflow-auto text-sm">
        <LiveEditor
          onChange={onChange}
          style={{
            fontFamily: 'ui-monospace, Menlo, Monaco, "Cascadia Code", "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            background: 'transparent',
            minHeight: '100%',
          }}
        />
      </div>
    </div>
  )
}
