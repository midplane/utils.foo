import React, { useState } from 'react';

export default function Base64EncodeDecode() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('encode');

  const handleConversion = () => {
    if (mode === 'encode') {
      setOutput(btoa(input));
    } else {
      try {
        setOutput(atob(input));
      } catch (error) {
        setOutput('Error: Invalid Base64 input');
      }
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-3xl font-bold mb-6">Base64 Encoder/Decoder</h1>
      <div className="max-w-xl mx-auto">
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="mode"
              value="encode"
              checked={mode === 'encode'}
              onChange={() => setMode('encode')}
            />
            <span className="ml-2">Encode</span>
          </label>
          <label className="inline-flex items-center ml-6">
            <input
              type="radio"
              className="form-radio"
              name="mode"
              value="decode"
              checked={mode === 'decode'}
              onChange={() => setMode('decode')}
            />
            <span className="ml-2">Decode</span>
          </label>
        </div>
        <textarea
          className="w-full p-2 mb-4 border border-gray-300 rounded-md"
          rows="4"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
        />
        <button
          className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors duration-300"
          onClick={handleConversion}
        >
          {mode === 'encode' ? 'Encode' : 'Decode'}
        </button>
        {output && (
          <div className="mt-4 p-2 bg-gray-100 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Result:</h2>
            <p className="font-mono break-all">{output}</p>
          </div>
        )}
      </div>
    </div>
  );
}