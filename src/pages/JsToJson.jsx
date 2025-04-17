import { useState, useEffect, useCallback } from 'react';
import { Copy, X, Clipboard, Code } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../SEO';
import JSON5 from 'json5';

export default function JsToJson() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [input, setInput] = useState(searchParams.get('input') || '');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const handleConversion = useCallback(() => {
        if (input === '') {
            setOutput('');
            setError('');
            return;
        }

        try {
            const jsObject = JSON5.parse(input);
            const jsonOutput = JSON.stringify(jsObject, null, 2);
            setOutput(jsonOutput);
            setError('');
            if (input.trim() && jsonOutput.trim() !== '{}' && jsonOutput.trim() !== '[]') {
                setSearchParams({ input });
            }
        } catch (err) {
            setError(`Error: ${err.message}`);
            setOutput('');
        }
    }, [input, setSearchParams]);

    useEffect(() => {
        handleConversion();
    }, [handleConversion]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleClearInput = () => {
        setInput('');
        setOutput('');
        setError('');
        setSearchParams(new URLSearchParams());
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInput(text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setError(`Clipboard access denied: ${err.message}. Try pasting manually.`);
        }
    };

    const handlePrettify = () => {
        if (!input.trim()) return;

        try {
            const parsed = JSON5.parse(input);
            const jsonStr = JSON.stringify(parsed, null, 2);
            
            let prettifiedJs = jsonStr
                .replace(/"([^"]+)":/g, (match, key) => {                    
                    return /[^a-zA-Z0-9_$]/.test(key) ? match : `${key}:`;
                })                
                .replace(/: "([^"]*)"/g, ': "$1"');

            setInput(prettifiedJs);
        } catch (err) {
            setError(`Cannot prettify: ${err.message}`);
        }
    };

    const copyShareableLink = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('input', input);
        navigator.clipboard.writeText(url.toString())
            .then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            })
            .catch(err => {
                setError(`Failed to copy link: ${err.message}`);
            });
    };

    return (
        <>
            <SEO
                title="Js to Json | utils.foo"
                description="Convert JavaScript objects to JSON"
                keywords="JavaScript, JSON, converter, encode, decode"
            />
            <div className="max-w-4xl mx-auto px-8 py-8 shadow-md bg-white rounded-lg">
                <div className="mb-6">
                    <h1 className="text-3xl pb-2 border-b">Js to JSON</h1>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl">Input</h2>
                            <div className="flex space-x-2">
                                <button className="p-1 text-gray-500 hover:text-green-500" onClick={handlePrettify} title="Prettify JS">
                                    <Code size={20} />
                                </button>
                                <button className="p-1 text-gray-500 hover:text-blue-500" onClick={handlePaste} title="Paste">
                                    <Clipboard size={20} />
                                </button>
                                <button className="p-1 text-gray-500 hover:text-purple-500" onClick={copyShareableLink} title="Copy Shareable Link">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                    </svg>
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
                            placeholder="Enter JavaScript object like {key: 'value'}"
                            aria-label="JavaScript input"
                            aria-describedby={error ? "error-message" : undefined}
                        />
                        {error && (
                            <div id="error-message" className="mt-2 text-red-500 text-sm" role="alert">
                                {error}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl">Output</h2>
                            <button
                                className="p-1 text-gray-500 hover:text-blue-500"
                                onClick={() => {
                                    navigator.clipboard.writeText(output)
                                        .then(() => {
                                            setCopySuccess(true);
                                            setTimeout(() => setCopySuccess(false), 2000);
                                        })
                                        .catch(err => {
                                            setError(`Failed to copy: ${err.message}`);
                                        });
                                }}
                                title="Copy">
                                <Copy size={20} />
                            </button>
                        </div>
                        <textarea
                            className="w-full h-64 p-2 border border-gray-300 rounded-md resize-none"
                            value={output}
                            readOnly
                            aria-label="JSON output"
                        />
                        {copySuccess && (
                            <div className="mt-2 text-green-500 text-sm">
                                Copied to clipboard!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}