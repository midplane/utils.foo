import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCircle } from 'react-icons/fa';
import SEO from '../SEO';

export default function JavaThreadDumpAnalyzer() {
  const [threadDump, setThreadDump] = useState('');
  const [threadCounts, setThreadCounts] = useState({});
  const [threads, setThreads] = useState({});
  const [selectedThread, setSelectedThread] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const threadsPerPage = 15;
  const totalThreadLabel = 'TOTAL';

  const onDrop = useCallback((acceptedFiles) => {
    // Allow only one file
    if (acceptedFiles.length > 1) {
      alert('Please upload only one file.');
      return;
    }

    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target.result;
      setThreadDump(content);
      processAndParseThreadDump(content);
    };

    reader.readAsText(file);
  }, []);

  const processAndParseThreadDump = (content) => {
    const threadCountsTemp = {};
    const threadsTemp = {};
    const threadBlocks = content.split('\n\n');

    threadBlocks.forEach((block) => {
      const lines = block.split('\n');
      const threadNameMatch = lines[0]?.match(/^"([^"]+)"/);
      if (threadNameMatch) {
        const threadName = threadNameMatch[1];
        const stateMatch = lines[0]?.match(/state=(\w+)/);
        const state = stateMatch ? stateMatch[1] : 'UNKNOWN';

        // Increment total number of threads
        threadCountsTemp[totalThreadLabel] = (threadCountsTemp[totalThreadLabel] || 0) + 1;
        // Increment the respective thread state counter
        threadCountsTemp[state] = (threadCountsTemp[state] || 0) + 1;

        threadsTemp[`${threadName} [${state}]`] = { state, stackTrace: lines.slice(1).join('\n') };
      }
    });

    setThreadCounts(threadCountsTemp);
    setThreads(threadsTemp);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleTextAreaChange = (e) => {
    const content = e.target.value;
    setThreadDump(content);

    // Reset counters when text area changes
    if (content.trim() === '') {
      setThreadCounts({});
      setThreads({});
    } else {
      processAndParseThreadDump(content);
    }
  };

  const getClassBasedOnThreadState = (state) => {
    switch (state) {
      case 'TOTAL':
        return 'text-blue-500';
      case 'RUNNABLE':
        return 'text-green-500';
      case 'TIMED_WAITING':
      case 'WAITING':
        return 'text-yellow-500';
      default:
        return 'text-white-500';
    }
  };

  // Pagination logic
  const threadNames = Object.keys(threads).sort();
  const totalPages = Math.ceil(threadNames.length / threadsPerPage);
  const currentThreads = threadNames.slice(
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

        <div
          {...getRootProps()}
          className={`border-2 border-dashed p-4 rounded-lg text-center cursor-pointer ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the thread dump here ...</p>
          ) : (
            <p>Drag 'n' drop file here, or click to select a file</p>
          )}
        </div>

        <textarea
          value={threadDump}
          onChange={handleTextAreaChange}
          className="w-full mt-4 p-2 border border-gray-300 rounded-lg"
          placeholder="Paste your thread dump here or upload a file"
          rows="10"
        />

        {Object.keys(threadCounts).length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Ensure TOTAL is displayed first */}
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
        )}

        {threadDump && (
          <div className="flex h-full mt-6">
            {/* Left Panel: Thread list */}
            <div className="border-r border-gray-300 overflow-y-auto h-[700px]" style={{ width: 'calc(33.33% + 100px)' }}>
              <h2 className="text-lg font-semibold p-4 border-b border-gray-300">Threads</h2>
              <ul className="divide-y divide-gray-200 text-sm">
                {currentThreads.map((threadName) => {
                  const { state } = threads[threadName];
                  return (
                    <li
                      key={threadName}
                      className={`p-2 cursor-pointer hover:bg-gray-100 ${
                        selectedThread === threadName ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedThread(threadName)}
                    >
                      <div className="flex items-center">
                        <FaCircle className={`mr-2 ${getClassBasedOnThreadState(state)}`} />
                        {threadName}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex justify-between items-center p-2 border-t border-gray-300">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 text-sm rounded ${
                    currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white'
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
                  className={`px-2 py-1 text-sm rounded ${
                    currentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Right Panel: Stack trace */}
            <div className="flex-1 p-4 overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {selectedThread ? `Stack Trace for ${selectedThread}` : 'Select a thread to view its stack trace'}
              </h2>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {selectedThread ? threads[selectedThread].stackTrace : 'No thread selected'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  );
}