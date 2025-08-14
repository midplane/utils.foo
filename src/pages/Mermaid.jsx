import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import OptimizedEditor from '../components/OptimizedEditor';
import SEO from '../SEO';
import mermaid from 'mermaid';
import './Mermaid.css';
import { Maximize2, Minimize2, Download } from 'lucide-react';

export default function Mermaid() {
  const location = useLocation();
  const [input, setInput] = useState('graph TD\n    A[Start] --> B{Is it working?}\n    B -->|Yes| C[Great!]\n    B -->|No| D[Debug]\n    D --> B');
  const [error, setError] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [notification, setNotification] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mermaidRef = useRef(null);

  const renderDiagram = useCallback(() => {
    if (!mermaidRef.current) return;

    try {
      // Clear previous content
      mermaidRef.current.innerHTML = '';
      setError('');
      setSvgContent('');

      // Create a unique ID for the diagram
      const id = `mermaid-diagram-${Date.now()}`;
      
      // Create a div for the diagram
      const container = document.createElement('div');
      container.id = id;
      container.className = 'mermaid';
      container.textContent = input;
      
      // Append the div to the container
      mermaidRef.current.appendChild(container);
      
      // Render the diagram
      mermaid.run({
        nodes: [container],
        suppressErrors: true,
      }).then(() => {
        // Store the SVG content for download
        const svgElement = mermaidRef.current.querySelector('svg');
        if (svgElement) {
          setSvgContent(svgElement.outerHTML);
        }
      }).catch(err => {
        setError(`Error rendering diagram: ${err.message}`);
      });
    } catch (err) {
      setError(`Error rendering diagram: ${err.message}`);
    }
  }, [input]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
    
    // Check if there's a diagram in the URL
    const params = new URLSearchParams(location.search);
    const diagramFromUrl = params.get('diagram');
    if (diagramFromUrl) {
      try {
        const decodedDiagram = decodeURIComponent(diagramFromUrl);
        setInput(decodedDiagram);
      } catch (err) {
        setError(`Error loading diagram from URL: ${err.message}`);
      }
    }
  }, [location.search]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Add event listener for Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  const handleEditorChange = (value) => {
    setInput(value);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  const copyAsUrl = () => {
    try {
      const encodedDiagram = encodeURIComponent(input);
      const url = `${window.location.origin}/mermaid?diagram=${encodedDiagram}`;
      
      navigator.clipboard.writeText(url)
        .then(() => {
          showNotification('Shareable URL copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy URL: ', err);
          // Fallback for browsers that don't support clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showNotification('Shareable URL copied to clipboard!');
        });
    } catch (err) {
      setError(`Error creating shareable URL: ${err.message}`);
    }
  };

  const downloadSvg = () => {
    if (!svgContent) {
      setError('No diagram to download');
      return;
    }

    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mermaid-diagram.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('SVG downloaded successfully!');
    } catch (err) {
      setError(`Error downloading SVG: ${err.message}`);
    }
  };


  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const examples = {
    flowchart: 'graph TD\n    A[Start] --> B{Is it working?}\n    B -->|Yes| C[Great!]\n    B -->|No| D[Debug]\n    D --> B',
    sequence: 'sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>John: Hello John, how are you?\n    loop Healthcheck\n        John->>John: Fight against hypochondria\n    end\n    Note right of John: Rational thoughts <br/>prevail!\n    John-->>Alice: Great!\n    John->>Bob: How about you?\n    Bob-->>John: Jolly good!',
    classDiagram: 'classDiagram\n    Animal <|-- Duck\n    Animal <|-- Fish\n    Animal <|-- Zebra\n    Animal : +int age\n    Animal : +String gender\n    Animal: +isMammal()\n    Animal: +mate()\n    class Duck{\n        +String beakColor\n        +swim()\n        +quack()\n    }\n    class Fish{\n        -int sizeInFeet\n        -canEat()\n    }\n    class Zebra{\n        +bool is_wild\n        +run()\n    }',
    stateDiagram: 'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]',
    pie: 'pie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15',
    er: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses'
  };

  const loadExample = (type) => {
    setInput(examples[type]);
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
        title="Mermaid Diagram Generator | utils.foo"
        description="Create and visualize diagrams using Mermaid syntax"
        keywords="mermaid, diagram, flowchart, sequence diagram, class diagram, state diagram, gantt chart, pie chart, er diagram"
      />
      <div className="max-w-full mx-auto px-8 py-8 shadow-md bg-white rounded-lg relative">
        {notification && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md transition-opacity duration-300">
            {notification}
          </div>
        )}
        <h1 className="text-3xl mb-6">Mermaid Diagram Generator</h1>
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('flowchart')}
            >
              Flowchart
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('sequence')}
            >
              Sequence
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('classDiagram')}
            >
              Class
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('stateDiagram')}
            >
              State
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('pie')}
            >
              Pie
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              onClick={() => loadExample('er')}
            >
              ER
            </button>
          </div>
        </div>
        {/* Mobile: Stack with diagram on top, Tablet/Desktop: Side-by-side with wider diagram */}
        <div className="flex flex-col-reverse md:flex-row space-y-4 space-y-reverse md:space-y-0 md:space-x-4">
          <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Mermaid Code</h3>
            <OptimizedEditor
              height="500px"
              language="text"
              value={input}
              onChange={handleEditorChange}
              className='mb-4 border pt-2'
              options={editorOptions}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                onClick={copyAsUrl}
              >
                Copy as URL
              </button>
              <button
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-sm flex items-center justify-center"
                onClick={downloadSvg}
              >
                <Download size={16} className="mr-2" />
                Download SVG
              </button>
            </div>
          </div>
          <div className="w-full md:w-3/5 lg:w-2/3">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Diagram Preview</h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <div className="relative">
              <button
                className="absolute top-2 right-2 z-10 p-1 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
                onClick={toggleFullScreen}
                aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
                title={isFullScreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <div 
                ref={mermaidRef} 
                className={`
                  w-full border-2 border-gray-200 rounded-md p-4 overflow-auto bg-white flex items-center justify-center mermaid-container shadow-sm
                  ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-0' : 'h-[400px] md:h-[500px] lg:h-[600px]'}
                  ${isFullScreen ? 'fixed' : ''}
                `}
              >
                <div className="text-gray-500">Diagram will render here</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
