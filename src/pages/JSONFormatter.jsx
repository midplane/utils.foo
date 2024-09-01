import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

export default function JSONFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleEditorChange = (value) => {
    setInput(value);
  };

  const formatJSON = () => {
    try {
      const parsedJSON = JSON.parse(input);
      const formattedJSON = JSON.stringify(parsedJSON, null, 2);
      setOutput(formattedJSON);
      setError('');
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
      setOutput('');
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    wordWrap: "on",
    "renderLineHighlight": "none",
  };

  return (
    <div className="max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6">JSON Formatter</h1>
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="w-full md:w-1/2 flex flex-col">
          <Editor
            height="500px"
            defaultLanguage="json"
            value={input}
            onChange={handleEditorChange}
            options={editorOptions}
            className='mb-4 border pt-2'
          />
          <button
            className="mt-4 w-full bg-gray-800 text-white p-2 rounded-md hover:bg-blue-600 transition-colors duration-300"
            onClick={formatJSON}
          >
            Format JSON
          </button>
        </div>
        <div className="w-full md:w-1/2">
          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <Editor
            height="500px"
            defaultLanguage="json"
            value={output}
            options={{ ...editorOptions, readOnly: true }}
            className='mb-4 border pt-2'
          />
        </div>
      </div>
    </div>
  );
}