import React, { useState } from 'react';
import OptimizedEditor from '../components/OptimizedEditor';
import SEO from '../SEO';

export default function JSONFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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

  const minifyJSON = () => {
    try {
      const parsedJSON = JSON.parse(input);
      const minifiedJSON = JSON.stringify(parsedJSON);
      setOutput(minifiedJSON);
      setError('');
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
      setOutput('');
    }
  };

  const escapeJSON = () => {
    try {
      const escapedJSON = input.replace(/[\\]/g, '\\\\')
                               .replace(/[\"]/g, '\\"')
                               .replace(/[\/]/g, '\\/')
                               .replace(/[\b]/g, '\\b')
                               .replace(/[\f]/g, '\\f')
                               .replace(/[\n]/g, '\\n')
                               .replace(/[\r]/g, '\\r')
                               .replace(/[\t]/g, '\\t');
      setOutput(escapedJSON);
      setError('');
    } catch (err) {
      setError('Error escaping JSON: ' + err.message);
      setOutput('');
    }
  };

  const unescapeJSON = () => {
    try {
      const unescapedJSON = input.replace(/\\\\/g, '\\')
                                 .replace(/\\"/g, '"')
                                 .replace(/\\\//g, '/')
                                 .replace(/\\b/g, '\b')
                                 .replace(/\\f/g, '\f')
                                 .replace(/\\n/g, '\n')
                                 .replace(/\\r/g, '\r')
                                 .replace(/\\t/g, '\t');
      setOutput(unescapedJSON);
      setError('');
    } catch (err) {
      setError('Error unescaping JSON: ' + err.message);
      setOutput('');
    }
  };

  const queryJSON = () => {
    try {
      setError('');
      if (query.length === 0) {
        setOutput(input)
        return
      }
      const obj = JSON.parse(input);
      const regex = /([^[.]+)|\[(\d+)\]/g;
      const tokens = [];
      let match;
      while ((match = regex.exec(query))) {
        if (match[1]) tokens.push(match[1]);
        if (match[2]) tokens.push(Number(match[2]));
      }

      let current = obj;
      let parent = null;
      let lastKey = null;

      for (let token of tokens) {
        parent = current;
        lastKey = token;
        current = current?.[token];
      }

      if (parent !== null && lastKey !== null && parent.hasOwnProperty(lastKey)) {
        const result = { [lastKey]: parent[lastKey] };
        setOutput(JSON.stringify(result, null, 2));
      } else {
        setOutput(JSON.stringify(current, null, 2));
      }
    } catch (err) {
      setError('Error querying JSON: ' + err.message);
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
    <>
      <SEO
        title="JSON formatter | utils.foo"
        description="format, query, prettify, minify, escape, and unescape json client side"
        keywords="json format, json beautify, json prettify, json minify, json escape, json unescape, json query"
      />
      <div className="max-w-full mx-auto px-8 py-8 shadow-md bg-white rounded-lg">
        <h1 className="text-3xl mb-6">JSON Formatter</h1>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/2 flex flex-col">
            <OptimizedEditor
              height="500px"
              language="json"
              value={input}
              onChange={handleEditorChange}
              className='mb-4 border pt-2'
            />
            <button
                className="mt-4 w-full bg-gray-800 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                onClick={formatJSON}
              >
                Format JSON
              </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="mt-4 w-full bg-gray-800 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                onClick={minifyJSON}
              >
                Minify JSON
              </button>
              <button
                className="mt-4 w-full bg-gray-800 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                onClick={escapeJSON}
              >
                Escape JSON
              </button>
              <button
                className="mt-4 w-full bg-gray-800 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                onClick={unescapeJSON}
              >
                Unescape JSON
              </button>
            </div>
            <div className="mt-4 flex gap-2 items-stretch">
              <input
                type="text"
                placeholder="Enter query path (e.g. customer.phoneNumber[0])"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    queryJSON();
                  }
                }}
                className="w-3/4 p-2 border rounded-md focus:outline-none"
              />
              <button
                className="w-1/4 bg-gray-800 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                onClick={queryJSON}
              >
                Query JSON
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <OptimizedEditor
              height="500px"
              language="json"
              value={output}
              options={{ ...editorOptions, readOnly: true }}
              className='mb-4 border pt-2'
            />
          </div>
        </div>
      </div>
    </>
  );
}