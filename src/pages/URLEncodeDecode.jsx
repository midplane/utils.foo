import React, { useState, useEffect } from 'react';
import { Copy, X, Clipboard } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function URLEncodeDecode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('input') || '');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState(searchParams.get('mode') || 'encode');

  useEffect(() => {
    handleConversion();
    updateURL();
  }, [input, mode]);

  const handleConversion = () => {
    if (input === '') {
      setOutput('');
      return;
    }

    if (mode === 'encode') {
      setOutput(encodeURIComponent(input));
    } else {
      try {
        setOutput(decodeURIComponent(input));
      } catch (error) {
        setOutput('Error: Invalid URL encoding');
      }
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (input) params.set('input', input);
    params.set('mode', mode);
    setSearchParams(params, { replace: true });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleModeChange = (e) => {
    setMode(e.target.value);
  };

  const handleClearInput = () => {
    setInput('');
    setOutput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">URL Encoder / Decoder</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        <div className="flex items-center space-x-4">
          <span className="font-medium">Conversion</span>
          <select
            className="border border-gray-300 rounded-md p-2"
            value={mode}
            onChange={handleModeChange}
          >
            <option value="encode">Encode</option>
            <option value="decode">Decode</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Input</h2>
            <div className="flex space-x-2">
              <button className="p-1 text-gray-500 hover:text-blue-500" onClick={handlePaste} title="Paste">
                <Clipboard size={20} />
              </button>
              <button className="p-1 text-gray-500 hover:text-red-500" onClick={handleClearInput} title="Clear">
                <X size={20} />
              </button>
            </div>
          </div>
          <textarea
            className="w-full h-64 p-2 border border-gray-300 rounded-md resize-none"
            value={input}
            onChange={handleInputChange}
            placeholder={mode === 'encode' ? 'Enter URL to encode...' : 'Enter encoded URL to decode...'}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Output</h2>
            <button className="p-1 text-gray-500 hover:text-blue-500" onClick={() => navigator.clipboard.writeText(output)} title="Copy">
              <Copy size={20} />
            </button>
          </div>
          <textarea
            className="w-full h-64 p-2 border border-gray-300 rounded-md resize-none"
            value={output}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}