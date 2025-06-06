import { lazy, Suspense } from 'react';

const Editor = lazy(() => import('@monaco-editor/react'));

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  theme: 'vs-dark'
};

export default function OptimizedEditor({ value, onChange, language = 'json', ...props }) {
  return (
    <Suspense fallback={
      <div className="h-64 bg-gray-100 border rounded-md flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    }>
      <Editor
        value={value}
        onChange={onChange}
        language={language}
        options={{ ...editorOptions, ...props.options }}
        {...props}
      />
    </Suspense>
  );
}