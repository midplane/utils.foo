import { LivePreview, LiveError } from 'react-live'

export default function PreviewPanel() {
  return (
    <div className="w-1/2 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-xs text-gray-500 font-mono">preview</span>
      </div>
      <div className="flex-1 overflow-auto relative">
        <LivePreview style={{ minHeight: '100%', padding: '1.5rem' }} />
      </div>
      <LiveError
        style={{
          background: '#fee2e2',
          color: '#991b1b',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          padding: '0.75rem 1rem',
          maxHeight: '140px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          borderTop: '1px solid #fca5a5',
        }}
      />
    </div>
  )
}
