import React, { useState, useEffect } from 'react';
import { Copy, X, Clipboard } from 'lucide-react';
import { MD5, SHA1, SHA256, SHA384, SHA512, SHA3, RIPEMD160 } from 'crypto-js';
import { useSearchParams } from 'react-router-dom';
import SEO from '../SEO';
import { validateStringParam, validateAlgorithm } from '../utils/urlValidator';

const algorithms = [
  { name: 'MD5', value: 'MD5' },
  { name: 'SHA-1', value: 'SHA1' },
  { name: 'SHA-256', value: 'SHA256' },
  { name: 'SHA-384', value: 'SHA384' },
  { name: 'SHA-512', value: 'SHA512' },
  { name: 'SHA3-256', value: 'SHA3' },
  { name: 'RIPEMD160', value: 'RIPEMD160' },
];

export default function HashGenerator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(validateStringParam(searchParams.get('input')) || '');
  const [output, setOutput] = useState('');
  const [algorithm, setAlgorithm] = useState(validateAlgorithm(searchParams.get('algorithm')));

  useEffect(() => {
    handleHash();
    updateURL();
  }, [input, algorithm]);

  const handleHash = () => {
    if (input === '') {
      setOutput('');
      return;
    }

    try {
      let hashedOutput;

      switch (algorithm) {
        case 'MD5':
          hashedOutput = MD5(input);
          break;
        case 'SHA1':
          hashedOutput = SHA1(input);
          break;
        case 'SHA256':
          hashedOutput = SHA256(input);
          break;
        case 'SHA384':
          hashedOutput = SHA384(input);
          break;
        case 'SHA512':
          hashedOutput = SHA512(input);
          break;
        case 'SHA3':
          hashedOutput = SHA3(input);
          break;
        case 'RIPEMD160':
          hashedOutput = RIPEMD160(input);
          break;
        default:
          throw new Error('Unsupported algorithm');
      }

      setOutput(hashedOutput.toString());
    } catch (error) {
      setOutput('Error: Unable to generate hash');
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (input) params.set('input', input);
    params.set('algorithm', algorithm);
    setSearchParams(params, { replace: true });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleAlgorithmChange = (e) => {
    setAlgorithm(e.target.value);
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
    <>
      <SEO
        title="Hash Generator | utils.foo"
        description="generate hash via md5, sha-1, sha-256, sha-384, sha-512"
        keywords="hash generator, md5, sha-1, sha-256, sha-384, sha-512"
      />
    <div className="max-w-4xl mx-auto px-8 py-8 shadow-md bg-white rounded-lg">
        <div className="mb-6">
          <h1 className="text-3xl pb-2 border-b">Hash Generator</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span>Algorithm</span>
            <select
              className="border border-gray-300 rounded-md p-1"
              value={algorithm}
              onChange={handleAlgorithmChange}
            >
              {algorithms.map((algo) => (
                <option key={algo.value} value={algo.value}>{algo.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl">Input</h2>
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
              placeholder="Enter text to hash..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl">Output ({algorithms.find(a => a.value === algorithm).name})</h2>
              <button className="p-1 text-gray-500 hover:text-blue-500" onClick={() => navigator.clipboard.writeText(output)} title="Copy">
                <Copy size={20} />
              </button>
            </div>
            <textarea
              className="w-full h-64 p-2 border border-gray-300 rounded-md resize-none font-mono"
              value={output}
              readOnly
            />
          </div>
        </div>
      </div>
    </>
  );
}