import React, { useState, useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useNavigate, useLocation } from 'react-router-dom';
import SEO from '../SEO';

const languages = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'yaml', label: 'YAML' },
];

export default function TextDiff() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [editorHeight, setEditorHeight] = useState('70vh');
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const title = `Compute ${language} diff | utils.foo`;

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const windowHeight = window.innerHeight;
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const newHeight = windowHeight - containerTop - 200;
        setEditorHeight(`${newHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    // Load language from URL query parameter
    const params = new URLSearchParams(location.search);
    const langParam = params.get('lang');
    if (langParam && languages.some(lang => lang.value === langParam)) {
      setLanguage(langParam);
    }

    return () => window.removeEventListener('resize', updateHeight);
  }, [location]);

  const handleEditorChange = (value, event) => {
    if (event.changes[0].origin === 'original') {
      setOriginal(value.original);
    } else {
      setModified(value.modified);
    }
  };

  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    setLanguage(newLang);

    // Update URL with new language
    const params = new URLSearchParams(location.search);
    params.set('lang', newLang);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  return (
    <>
      <SEO
        title={title}
        description="compute diff between two texts, code or json"
        keywords="json diff, code diff, text diff, json compare, code compare, text compare"
      />

      <div className="max-w-full mx-auto mx-auto px-8 py-8 shadow-md bg-white rounded-lg" ref={containerRef}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl">Compute Diff</h1>
          <div className="flex items-center">
            <label htmlFor="language-select" className="text-sm font-medium text-gray-700 mr-2">
              Language:
            </label>
            <select
              id="language-select"
              value={language}
              onChange={handleLanguageChange}
              className="block w-40 py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ height: editorHeight }}>
          <DiffEditor
            original={original}
            modified={modified}
            language={language}
            onChange={handleEditorChange}
            options={{
              renderSideBySide: true,
              minimap: { enabled: false },
              readOnly: false,
              originalEditable: true,
              scrollBeyondLastLine: false,
              folding: false,
            }}
            className='border'
          />
        </div>
      </div>
    </>
  );
}