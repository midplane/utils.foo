import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import SEO from '../SEO';

const QRCodeGenerator = () => {
  const [text, setText] = useState('Answer to life the universe and everything? 42!');
  const [size, setSize] = useState(256);
  const [downloadFormat, setDownloadFormat] = useState('svg');
  const qrRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSizeChange = (e) => {
    setSize(Number(e.target.value));
  };

  const handleFormatChange = (e) => {
    setDownloadFormat(e.target.value);
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    if (downloadFormat === 'svg') {
      downloadBlob(svgBlob, 'qrcode.svg');
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          downloadBlob(blob, 'qrcode.png');
        });
      };
      const imgUrl = URL.createObjectURL(svgBlob);
      img.src = imgUrl;
      img.onload = () => URL.revokeObjectURL(imgUrl);
    }
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEO
        title="QR Code Generator | utils.foo"
        description="Generate and download QR codes in SVG or PNG format"
        keywords="QR code generator, QR code creator, free QR code, download QR code, SVG, PNG"
      />
      <div className="max-w-2xl mx-auto px-8 py-8 shadow-md bg-white rounded-lg bg-opacity-75">
        <h1 className="text-3xl border-b pb-2 mb-6">QR Code Generator</h1>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium leading-6 text-gray-900">
            Enter text or URL
          </label>
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Enter text or URL for QR code"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium leading-6 text-gray-900">
            QR Code Size (px)
          </label>
          <input
            type="number"
            value={size}
            onChange={handleSizeChange}
            min="128"
            max="512"
            step="32"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mt-6 flex flex-col items-center">
          <div ref={qrRef}>
            <QRCodeSVG value={text || ' '} size={size} />
          </div>
          <div className="mt-4 flex items-center">
            <select
              value={downloadFormat}
              onChange={handleFormatChange}
              className="mr-2 p-2 border border-gray-300 rounded"
            >
              <option value="svg">SVG</option>
              <option value="png">PNG</option>
            </select>
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-green-600 transition-colors duration-200"
            >
              Download QR Code
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QRCodeGenerator;