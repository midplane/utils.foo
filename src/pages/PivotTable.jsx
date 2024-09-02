import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import Papa from 'papaparse';

export default function PivotTable() {
  const [data, setData] = useState([]);
  const [pivotState, setPivotState] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    Papa.parse(file, {
      complete: (result) => {
        setData(result.data);
      },
      header: true
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handlePaste = (event) => {
    const pastedData = event.target.value;
    Papa.parse(pastedData, {
      complete: (result) => {
        setData(result.data);
      },
      header: true
    });
  };

  return (
    <div className="max-w-full mx-auto px-4">
      <h1 className="text-3xl mb-6">Pivot Table</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed p-4 rounded-lg text-center cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <p>Drop a CSV file here, or click to choose a file from your computer.</p>
          </div>
        </div>
        <div>
          <textarea
            onChange={handlePaste}
            placeholder="... or paste your CSV data here"
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows="2"
          ></textarea>
        </div>
      </div>
      
      {data.length > 0 && (
        <PivotTableUI
          data={data}
          onChange={s => setPivotState(s)}
          {...pivotState}
        />
      )}
    </div>
  );
}