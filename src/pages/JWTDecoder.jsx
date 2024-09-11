import React, { useState, useEffect } from 'react';
import SEO from '../SEO';

export default function JWTDecoder() {
  const [jwtInput, setJwtInput] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const [decodedJWT, setDecodedJWT] = useState(null);

  const decodeJWT = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const decoded = {
        header: JSON.parse(atob(parts[0])),
        payload: JSON.parse(atob(parts[1])),
        signature: parts[2]
      };

      setDecodedJWT(decoded);
    } catch (error) {
      setDecodedJWT({ error: error.message });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setJwtInput(value);
    if (value) {
      decodeJWT(value);
    } else {
      setDecodedJWT(null);
    }
  };

  useEffect(() => {
    decodeJWT(jwtInput);
  }, []);

  return (
    <>
      <SEO 
        title="JWT Decoder | utils.foo"
        description="Decode JWT (JSON Web Tokens) and view header and payload"
        keywords="JWT decoder, JSON Web Token, token decoder"
      />
      <div className="max-w-full mx-auto px-8 py-8 shadow-md bg-white rounded-lg">
        <h1 className="text-3xl border-b pb-2 mb-6">JWT Decoder</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            <label className="block mb-2 text-sm font-medium leading-6 text-gray-900">Paste your JWT here</label>
            <textarea
              value={jwtInput}
              onChange={handleInputChange}
              placeholder="Paste your JWT here"
              className="w-full p-2 border border-gray-300 rounded h-64 md:h-96"
            />
          </div>
          
          <div className="w-full md:w-1/2">
            <h2 className="text-xl mb-4">Decoded JWT</h2>
            {decodedJWT ? (
              decodedJWT.error ? (
                <p className="text-red-500">{decodedJWT.error}</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3>Header</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                      {JSON.stringify(decodedJWT.header, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3>Payload</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                      {JSON.stringify(decodedJWT.payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3>Signature</h3>
                    <p className="break-all bg-gray-100 p-4 rounded-lg text-sm">{decodedJWT.signature}</p>
                  </div>
                </div>
              )
            ) : (
              <p className="text-gray-500">Enter a JWT to see the decoded result</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}