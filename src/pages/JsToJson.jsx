import { useState, useEffect, useCallback } from 'react';
import { Copy, X, Clipboard, Code, Link } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../SEO';
import JSON5 from 'json5';

const VALID_JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const MAX_PRETTIFY_DEPTH = 10;

export default function JsToJson() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [input, setInput] = useState(searchParams.get('input') || '');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [conversionSuccess, setConversionSuccess] = useState(false);

    const handleConversion = useCallback(() => {
        if (input === '') {
            setOutput('');
            setError('');
            setConversionSuccess(false);
            return;
        }

        try {
            const jsObject = JSON5.parse(input);
            const jsonOutput = JSON.stringify(jsObject, null, 2);
            setOutput(jsonOutput);
            setError('');
            setConversionSuccess(true);            
            setTimeout(() => setConversionSuccess(false), 2000);
            
            if (input.trim() && jsonOutput.trim() !== '{}' && jsonOutput.trim() !== '[]') {
                setSearchParams({ input });
            }
        } catch (err) {
            setError('Invalid JavaScript syntax. Please check your code.');
            setOutput('');
            setConversionSuccess(false);
        }
    }, [input, setSearchParams, setOutput, setError, setConversionSuccess]);

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
        setConversionSuccess(false);
        setSearchParams(new URLSearchParams());
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInput(text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setError('Clipboard access denied. Try pasting manually.');
        }
    };

    const handlePrettify = () => {
        if (!input.trim()) return;

        try {
            const parsed = JSON5.parse(input);
            
            const prettifyObject = (obj, indent = 0, depth = 0) => {                
                if (depth >= MAX_PRETTIFY_DEPTH) {
                    return JSON.stringify(obj);
                }
                
                const spaces = ' '.repeat(indent * 2);
                
                if (obj === null) return 'null';
                if (typeof obj !== 'object') {
                    return typeof obj === 'string' ? `"${obj}"` : String(obj);
                }
                
                const isArray = Array.isArray(obj);
                const brackets = isArray ? ['[', ']'] : ['{', '}'];
                
                if (Object.keys(obj).length === 0) return brackets.join('');
                
                const entries = Object.entries(obj).map(([key, value]) => {
                    if (isArray) return `${spaces}  ${prettifyObject(value, indent + 1, depth + 1)}`;
                    
                    const formattedKey = VALID_JS_IDENTIFIER.test(key) ? key : `"${key}"`;
                    return `${spaces}  ${formattedKey}: ${prettifyObject(value, indent + 1, depth + 1)}`;
                });
                
                return `${brackets[0]}\n${entries.join(',\n')}\n${spaces}${brackets[1]}`;
            };
            
            let prettifiedJs = prettifyObject(parsed);
            
            setInput(prettifiedJs);
        } catch (err) {
            setError('Cannot format code. Please check your syntax.');
        }
    };

    const copyToClipboard = useCallback(async (text, errorPrefix = 'Failed to copy') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
            return true;
        } catch (err) {
            setError(`${errorPrefix}. Please try again.`);
            return false;
        }
    }, [setError, setCopySuccess]);

    const copyShareableLink = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('input', input);
        copyToClipboard(url.toString(), 'Failed to copy link');
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
                                    <Link size={20} />
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
                                onClick={() => copyToClipboard(output)}
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
                        {conversionSuccess && !copySuccess && (
                            <div className="mt-2 text-green-500 text-sm">
                                Conversion successful!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}