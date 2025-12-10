import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCircle, FaPaperclip, FaFileUpload } from 'react-icons/fa';
import SEO from '../SEO';

export default function JavaThreadDumpAnalyzer() {
  const [threadDump, setThreadDump] = useState('');
  const [fileName, setFileName] = useState('');
  const [threadCounts, setThreadCounts] = useState({});
  const [threads, setThreads] = useState({});
  const [selectedThread, setSelectedThread] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInTrace, setSearchInTrace] = useState(false);
  const [activeTab, setActiveTab] = useState('Thread Viewer'); // State for active tab
  const threadsPerPage = 15;
  const totalThreadLabel = 'TOTAL';
  const threadKnownStates = useMemo(() => ['NEW', 'RUNNABLE', 'TIMED_WAITING', 'WAITING', 'BLOCKED', 'TERMINATED'], []);

  const processAndParseThreadDump = useCallback((content) => {
    const threadCountsTemp = {};
    const threadsTemp = {};
    const threadBlocks = content.split('\n\n');

    threadKnownStates.forEach((state) => {
      threadCountsTemp[state] = 0;
    });

    if (!content.includes('java.lang.Thread.State') && !content.includes('state=')) {
      alert('The content does not appear to be a valid Java thread dump.');
      return;
    }

    threadBlocks.forEach((block, index) => {
      const lines = block.split('\n');
      const threadNameMatch = lines[0]?.match(/^"([^"]+)"/);
      if (!threadNameMatch) return;
      const threadName = threadNameMatch[1];
      const stateMatch = lines[0]?.match(/state=(\w+)/) || lines[1]?.match(/java\.lang\.Thread\.State: (\w+)/);
      const state = stateMatch ? stateMatch[1] : 'UNKNOWN';
      if (state === 'UNKNOWN') return;

      threadCountsTemp[totalThreadLabel] = (threadCountsTemp[totalThreadLabel] || 0) + 1;
      threadCountsTemp[state] = (threadCountsTemp[state] || 0) + 1;
      const threadNameWithState = `${threadName} [${state}]`;
      // Ensure unique thread name by appending an index if necessary
      const uniqueThreadName = threadsTemp[threadNameWithState]
        ? `${threadNameWithState} (${index})`
        : threadNameWithState;
      threadsTemp[uniqueThreadName] = { state, stackTrace: lines.join('\n') };
    });
    setThreadCounts(threadCountsTemp);
    setThreads(threadsTemp);
  }, [threadKnownStates]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 1) {
      alert('Please upload only one file.');
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name); // Set the file name in state
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target.result;
      setThreadDump(content);
      processAndParseThreadDump(content);
    };

    reader.readAsText(file);
  }, [processAndParseThreadDump]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });


  const getClassBasedOnThreadState = (state) => {
    switch (state) {
      case 'TOTAL':
        return 'text-blue-500';
      case 'NEW':
        return 'text-purple-500';
      case 'RUNNABLE':
        return 'text-green-500';
      case 'TIMED_WAITING':
        return 'text-orange-500';
      case 'WAITING':
        return 'text-yellow-500';
      case 'BLOCKED':
        return 'text-red-500';
      case 'TERMINATED':
        return 'text-black-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredThread = Object.keys(threads)
    .filter((threadName) => {
      const thread = threads[threadName];

      return (
        threadName.toLowerCase().includes(searchQuery.toLowerCase()) || // Check thread name
        (searchInTrace && thread.stackTrace.toLowerCase().includes(searchQuery.toLowerCase())) // Check stack trace if checkbox is checked
      );
    })
    .sort();

  const totalPages = Math.ceil(filteredThread.length / threadsPerPage);
  const currentThreads = filteredThread.slice(
    (currentPage - 1) * threadsPerPage,
    currentPage * threadsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  return (
    <>
      <SEO
        title="Java Thread Dump Analyzer | utils.foo"
        description="Analyze Java thread dumps"
        keywords="java thread dump, thread dump analyzer"
      />
      <div className="max-w-full mx-auto px-8 py-8 shadow-md bg-white rounded-lg">
        <h1 className="text-3xl mb-6">Java Thread Dump Analyzer</h1>

        {/* Upload Section */}
        <div className="mb-8 border-b pb-6">
          <div className="flex items-center mb-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed p-4 rounded-lg text-center cursor-pointer flex-1 ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
            >
              <input {...getInputProps()} />
              {fileName ? (
                <p className="text-gray-500 font-medium flex items-center justify-center">
                  <FaPaperclip className="mr-2 text-blue-500" />
                  {fileName}
                </p>
              ) : (
                <p className="text-gray-500 font-medium flex items-center justify-center">
                  <FaFileUpload className="mr-2 text-blue-500" /> Drag &apos;n&apos; drop file here or click to upload a file
                </p>
              )}
            </div>
          </div>

          <textarea
            placeholder="Paste your thread dump here..."
            value={threadDump}
            onChange={(e) => {
              const content = e.target.value;
              setThreadDump(content);
              processAndParseThreadDump(content);
              if (e.target.value.trim() !== '') {
                setFileName('Pasted');
              }
            }}
            className="w-full border border-gray-300 rounded-lg p-2 mt-4"
            rows="5"
          ></textarea>
        </div>

        {/* Overview Section */}
        {Object.keys(threadCounts).length > 0 && (
          <div className="mb-8 border-b pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-7">
              {[totalThreadLabel, ...Object.keys(threadCounts).filter((key) => key !== totalThreadLabel)].map(
                (state) => (
                  <div
                    key={state}
                    className={`p-4 border rounded-md shadow-md text-center ${getClassBasedOnThreadState(state)}`}
                  >
                    <h2 className="text-sm font-semibold">{state}</h2>
                    <p className="text-lg font-bold">{threadCounts[state]}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        {Object.keys(threadCounts).length > 0 && (
          <div>
            <div className="flex border-b border-gray-300 mb-4">
              {['Thread Viewer', 'Flame Graph', 'Lock Analysis'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500 hover:text-blue-500'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Thread Viewer Tab */}
            <div>
              {activeTab === 'Thread Viewer' && (
                <div className="flex h-full mt-1">
                  {/* Left Panel */}
                  <div className="border-r border-gray-300 overflow-y-auto h-[750px]" style={{ width: 'calc(33.33% + 70px)' }}>
                    {/* Search Bar */}
                    <div className="p-3">
                      <input
                        type="text"
                        placeholder="Search threads matching keyword ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-3 border border-gray-300 rounded-lg p-3"
                      />
                      <div className="flex items-center space-x-4 mb-3">
                        <label className="flex items-center text-sm">
                          <input
                            type="radio"
                            name="searchOption"
                            value="name"
                            checked={!searchInTrace}
                            onChange={() => setSearchInTrace(false)}
                            className="mr-2"
                          />
                          Search in thread name
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="radio"
                            name="searchOption"
                            value="content"
                            checked={searchInTrace}
                            onChange={() => setSearchInTrace(true)}
                            className="mr-2"
                          />
                          Search in stack trace
                        </label>
                      </div>
                    </div>
                    <ul className="divide-y divide-gray-200 text-sm">
                      {currentThreads.map((threadName) => {
                        const { state } = threads[threadName];
                        return (
                          <li
                            key={threadName}
                            className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedThread === threadName ? 'bg-blue-100' : ''
                              }`}
                            onClick={() => setSelectedThread(threadName)}
                          >
                            <div className="flex items-center">
                              <FaCircle className={`mr-2 ${getClassBasedOnThreadState(state)}`} />
                              <span className="truncate w-full" title={threadName}>
                                {threadName}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Pagination Controls */}
                    <div className="mt-4 flex justify-between items-center p-2 border-t border-gray-300">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`px-2 py-1 text-sm rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white'
                          }`}
                      >
                        Previous
                      </button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-2 py-1 text-sm rounded ${currentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white'
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {/* Right Panel */}
                  <div className="flex-1 bg-gray-100 h-[750px] overflow-y-auto p-4">
                    <pre className="bg-gray p-4 rounded-lg overflow-auto text-sm">
                      {selectedThread ? threads[selectedThread].stackTrace : 'No thread selected'}
                    </pre>
                  </div>
                </div>
              )}
              {activeTab === 'Flame Graph' && (
                <div className="text-center text-gray-500">
                  <p>Flame Graph is coming soon.</p>
                </div>
              )}
              {activeTab === 'Lock Analysis' && (
                <div className="text-center text-gray-500">
                  <p>Lock Analysis is coming soon.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
