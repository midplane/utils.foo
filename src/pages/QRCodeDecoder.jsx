import React, { useState, useRef } from 'react';
import jsQR from 'jsqr';
import SEO from '../SEO';

const QRCodeDecoder = () => {
  const [decodedText, setDecodedText] = useState('');
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const decodeQRCode = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          setDecodedText(code.data);
          setError('');
        } else {
          setError('No QR code found in the image.');
          setDecodedText('');
        }
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      setError('Error reading the file.');
      setDecodedText('');
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      decodeQRCode(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      decodeQRCode(file);
    }
  };

  return (
    <>
      <SEO
        title="QR Code Decoder | utils.foo"
        description="Decode QR codes from images easily with our free online tool"
        keywords="QR code decoder, QR code reader, free QR code scanner"
      />
      <div className="max-w-2xl mx-auto px-8 py-8 shadow-md bg-white rounded-lg bg-opacity-75">
        <h1 className="text-3xl border-b pb-2 mb-6">QR Code Decoder</h1>
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Uploaded QR Code" className="max-w-full h-auto mx-auto mb-4" />
          ) : (
            <p>Click to upload or drag and drop a QR code image here</p>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {decodedText && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Decoded Content</h2>
            <p className="p-4 bg-gray-100 rounded break-all">{decodedText}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default QRCodeDecoder;