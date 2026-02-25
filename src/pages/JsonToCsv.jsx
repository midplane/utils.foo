import { useState, useCallback, useEffect } from 'react';
import { Copy, X, Clipboard, Download } from 'lucide-react';
import SEO from '../SEO';

const JsonToCsv = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [tableData, setTableData] = useState({ headers: [], rows: [] });
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Improved flatten function that handles arrays by creating numbered indices
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? `${prefix}.` : '';
      const value = obj[key];

      if (value === null || value === undefined) {
        acc[pre + key] = '';
      } else if (Array.isArray(value)) {
        // Flatten array elements with index notation
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(acc, flattenObject(item, `${pre}${key}.${index}`));
          } else {
            acc[`${pre}${key}.${index}`] = item;
          }
        });
        // If empty array, still add the key
        if (value.length === 0) {
          acc[pre + key] = '[]';
        }
      } else if (typeof value === 'object') {
        Object.assign(acc, flattenObject(value, pre + key));
      } else {
        acc[pre + key] = value;
      }
      return acc;
    }, {});
  };

  // Extract rows from nested data structures
  const extractRows = (data) => {
    // If data is already an array, process each item
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object' && item !== null) {
          return flattenObject(item);
        }
        return { value: item };
      });
    }

    // If data is an object, check if it contains arrays that should become rows
    if (typeof data === 'object' && data !== null) {
      // Find all array properties
      const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));

      if (arrayKeys.length > 0) {
        // Use the first (or largest) array as the row source
        const primaryArrayKey = arrayKeys.reduce((largest, key) =>
          data[key].length > (data[largest]?.length || 0) ? key : largest
          , arrayKeys[0]);

        const primaryArray = data[primaryArrayKey];
        const otherProps = {};

        // Collect non-array properties to be repeated in each row
        Object.keys(data).forEach(key => {
          if (key !== primaryArrayKey) {
            Object.assign(otherProps, flattenObject({ [key]: data[key] }));
          }
        });

        // Create a row for each array item, combining with other props
        return primaryArray.map(item => (
          typeof item === 'object' && item !== null
            ? {
              ...otherProps,
              ...flattenObject(item)
            }
            : {
              ...otherProps,
              value: item ?? ''
            }
        ));
      }

      // No arrays found, treat as single row
      return [flattenObject(data)];
    }

    throw new Error('Data must be an object or array');
  };

  // Convert JSON to CSV
  const jsonToCsv = (jsonData) => {
    // Parse JSON if string
    let data;
    try {
      data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      throw new Error('Invalid JSON format - ' + e.message);
    }

    if (!data) {
      throw new Error('No data to convert');
    }

    // Extract rows from data
    const flattenedData = extractRows(data);

    if (flattenedData.length === 0) {
      throw new Error('No data rows to convert');
    }

    // Get all unique headers
    const headers = [...new Set(flattenedData.flatMap(obj => Object.keys(obj)))];

    // Create CSV header row
    const csvHeaders = headers.map(header => `"${header}"`).join(',');

    // Create CSV data rows
    const csvRows = flattenedData.map(obj => {
      return headers.map(header => {
        const value = obj[header] !== undefined && obj[header] !== null ? obj[header] : '';
        // Escape double quotes and wrap in quotes if contains comma, newline, or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };
  // Parse full CSV text safely (handles quoted commas, escaped quotes, and newlines in fields)
  const parseCsvText = (csvText) => {
    const rows = [];
    let currentRow = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }

        currentRow.push(currentValue);
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    if (currentValue !== '' || currentRow.length > 0) {
      currentRow.push(currentValue);
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  };
  // Handle conversion
  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      setError('');
      setTableData({ headers: [], rows: [] });
      return;
    }

    // Validate JSON first - just try to parse it
    // try {
    //   JSON.parse(input);
    // } catch (e) {
    //   setError('Invalid JSON format. please check your input');
    //   setOutput('');
    //   setTableData({ headers: [], rows: [] });
    //   return;
    // }
    
    try {
      const csv = jsonToCsv(input);
      setOutput(csv);
      setError('');

      // Parse CSV for table display
      const parsedRows = parseCsvText(csv);
      if (parsedRows.length > 0) {
        const headers = parsedRows[0];
        const rows = parsedRows.slice(1);

        setTableData({ headers, rows });
      }
    } catch (err) {
      setError(err.message || 'Failed to convert JSON to CSV');
      setOutput('');
      setTableData({ headers: [], rows: [] });
    }
  }, [input]);

  // Auto-convert when input changes with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      handleConvert();
    }, 300);

    return () => clearTimeout(timer);
  }, [input, handleConvert]);

  // Convert CSV to TSV (Tab-Separated Values) for clipboard
  const csvToTsv = (csvText) => {
    const rows = parseCsvText(csvText);
    return rows.map(row => row.join('\t')).join('\n');
  };

  // Copy to clipboard as TSV for proper paste in spreadsheets
  const copyToClipboard = async () => {
    try {
      // Convert CSV to TSV for better spreadsheet compatibility
      const tsvData = csvToTsv(output);
      await navigator.clipboard.writeText(tsvData);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (err) {
      setError('Failed to read clipboard contents');
    }
  };

  // Clear input
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
    setCopySuccess(false);
    setTableData({ headers: [], rows: [] });
  };

  // Download CSV file
  const downloadCSV = () => {
    if (!output) {
      setError('No CSV data to download');
      return;
    }

    try {
      const blob = new Blob([output], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'output.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download CSV file');
    }
  };

  return (
    <>
      <SEO 
        title="JSON to CSV Converter | utils.foo"
        description="Convert JSON data to CSV format with automatic flattening and download capability. Free online JSON to CSV converter tool."
        keywords="json to csv, json converter, csv export, json parser, data conversion, json formatter"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-2 pb-2 border-b border-gray-200">
            JSON to CSV Converter
          </h1>
          <p className="text-gray-600 mb-6">
            Convert JSON arrays to CSV format. Supports nested objects (flattened with dot notation) and automatic type handling. TABULAR VIEW BELOW
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">JSON Input</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePaste}
                    className="text-gray-600 hover:text-blue-500 transition-colors"
                    title="Paste from clipboard"
                  >
                    <Clipboard size={20} />
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                    title="Clear input"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded-md resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Paste your JSON here, e.g.:

[
  {
    "name": "John",
    "age": 30,
    "address": {
      "city": "New York",
      "zip": "10001"
    }
  },
  {
    "name": "Jane",
    "age": 25,
    "address": {
      "city": "Boston",
      "zip": "02101"
    }
  }
]`}
              />
            </div>

            {/* Output Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">CSV Output</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    disabled={!output}
                    className={`transition-colors ${
                      output 
                        ? 'text-gray-600 hover:text-blue-500' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Copy to clipboard"
                  >
                    <Copy size={20} />
                  </button>
                  <button
                    onClick={downloadCSV}
                    disabled={!output}
                    className={`transition-colors ${
                      output 
                        ? 'text-gray-600 hover:text-green-500' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Download CSV file"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
              <textarea
                value={output}
                readOnly
                className="w-full h-96 p-3 border border-gray-300 rounded-md resize-none font-mono text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="CSV output will appear here..."
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 text-red-500 text-sm" role="alert">
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {copySuccess && (
            <div className="mt-4 text-green-500 text-sm">
              ✓ Copied to clipboard!
            </div>
          )}

          {/* Information Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <button
              type="button"
              onClick={() => setIsHowItWorksOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left font-semibold text-gray-800"
              aria-expanded={isHowItWorksOpen}
            >
              <span>How it works:</span>
              <span>{isHowItWorksOpen ? '[-]' : '[+]'}</span>
            </button>
            {isHowItWorksOpen && (
              <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Paste a JSON array of objects (or a single object)</li>
                <li>Nested objects are flattened with dot notation (e.g., address.city)</li>
                <li>Arrays are flattened with index notation (e.g., items.0, items.1)</li>
                <li>The CSV output includes headers automatically</li>
                <li>Download the result as a .csv file or copy to clipboard</li>
              </ul>
            )}
          </div>

          {/* Tabular Preview Section */}
          {tableData.headers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">Tabular Preview</h3>
              <div className="overflow-auto border border-gray-300 rounded-md" style={{ maxHeight: '120vh' }}>
                <table className="min-w-full divide-y divide-gray-300 bg-white">
                  <colgroup>
                    {tableData.headers.map((_, index) => (
                      <col key={index} style={{ width: '250px', minWidth: '150px' }} />
                    ))}
                  </colgroup>
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      {tableData.headers.map((header, index) => (
                        <th 
                          key={index}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 last:border-r-0"
                          title={header}
                        >
                          <div className="truncate">{header}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tableData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <td 
                            key={cellIndex}
                            className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 overflow-hidden"
                            style={{ maxHeight: '3rem' }}
                            title={cell}
                          >
                            <div className="truncate">{cell}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Showing {tableData.rows.length} row{tableData.rows.length !== 1 ? 's' : ''} & {tableData.headers.length} column{tableData.headers.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JsonToCsv;
