import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import OptimizedEditor from '../components/OptimizedEditor';
import SEO from '../SEO';
import './D2.css';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import { encodeDiagram, decodeDiagram } from '../utils/diagramEncoding';

let d2Instance = null;

// Lazy load D2 module only when needed
const initD2 = async () => {
  if (d2Instance) return d2Instance;
  try {
    const { D2 } = await import('@terrastruct/d2');
    d2Instance = new D2();
    return d2Instance;
  } catch (err) {
    throw new Error(`Failed to initialize D2: ${err.message}`);
  }
};

export default function D2Diagram() {
  const location = useLocation();
  const [input, setInput] = useState(`vars: {
  d2-config: {
    theme-id: 3
    sketch: true
    layout-engine: elk
  }
  colors: {
    c2: "#C7F1FF"
    c3: "#B5AFF6"
    c4: "#DEE1EB"
    c5: "#88DCF7"
    c6: "#E4DBFE"
  }
}

LangUnits: {
  style.fill: \${colors.c6}
  RegexVal: {
    ds
  }
  SQLSelect: {
    ds
  }
  PythonTr: {
    ds
  }
  langunit ₙ: {
    style.multiple: true
    style.stroke-dash: 10
    style.stroke: black
    style.animated: 1
    "... ds"
  }
}

LangUnits <- ExperimentHost.Dataset: "load dataset"
Dataset UI -> LangUnits: "manage datasets"

Dataset UI: {
  style.fill: \${colors.c4}
}

ExperimentHost: {
  style.fill: \${colors.c4}
  Experiment: {
    style.multiple: true
  }
  Dataset
}
ExperimentHost.Experiment -> Experiment

Experiment.ModelConfigurations: {
  style.multiple: true
}
Experiment.LangUnit

Experiment.ModelConfigurations -> ModelConfiguration

ModelConfiguration.Prompting
ModelConfiguration.Model
ModelConfiguration.LangUnit`);
  const [error, setError] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [notification, setNotification] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const d2Ref = useRef(null);

  const renderDiagram = useCallback(async () => {
    setIsRendering(true);

    try {
      setError('');
      setSvgContent('');

      // Initialize and get D2 instance
      const d2 = await initD2();

      // Compile the D2 code
      const result = await d2.compile(input);

      // Render to SVG
      const svg = await d2.render(result.diagram, result.renderOptions);

      // Store the SVG content
      setSvgContent(svg);
    } catch (err) {
      console.error('D2 Error:', err);
      setError(`Error: ${err.message || 'Failed to render diagram'}`);
      setSvgContent('');
    } finally {
      setIsRendering(false);
    }
  }, [input]);

  useEffect(() => {
    // Check if there's a diagram in the URL
    const params = new URLSearchParams(location.search);
    const diagramFromUrl = params.get('diagram');
    if (diagramFromUrl) {
      try {
        const decodedDiagram = decodeDiagram(diagramFromUrl);
        if (decodedDiagram) {
          setInput(decodedDiagram);
        }
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
      const encodedDiagram = encodeDiagram(input);
      const url = `${window.location.origin}/d2?diagram=${encodedDiagram}`;

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
      a.download = 'd2-diagram.svg';
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
        title="D2 Diagram Generator | utils.foo"
        description="Create and visualize diagrams using D2 syntax"
        keywords="d2, diagram, flowchart, visualization, text-to-diagram, d2lang"
      />
      <div className="mx-auto py-8 bg-white relative" style={{ width: 'calc(100vw - 32px)', marginLeft: 'calc(-50vw + 50% + 16px)' }}>
        {notification && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md transition-opacity duration-300">
            {notification}
          </div>
        )}
        <div className="px-8">
        {/* Mobile: Stack with diagram on top, Tablet/Desktop: Side-by-side with wider diagram */}
        <div className="flex flex-col-reverse md:flex-row space-y-4 space-y-reverse md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/2 lg:w-1/2 flex flex-col">
            <h3 className="text-lg font-medium text-gray-700 mb-2">D2 Code</h3>
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
          <div className="w-full md:w-2/3 lg:w-3/4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Diagram Preview</h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            {isRendering && (
              <div className="mb-4 p-2 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
                Rendering diagram...
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
                ref={d2Ref}
                className={`
                  w-full border-2 border-gray-200 rounded-md p-4 overflow-auto bg-white flex items-center justify-center d2-container shadow-sm
                  ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-0 p-0' : 'h-[400px] md:h-[500px] lg:h-[600px]'}
                `}
              >
                {svgContent ? (
                  <div dangerouslySetInnerHTML={{ __html: svgContent }} className="w-full h-full flex items-center justify-center" />
                ) : (
                  <div className="text-gray-500">Diagram will render here</div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
