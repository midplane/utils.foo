import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import SEO from '../SEO';

const utilities = [
  { name: 'Epoch Converter', description: 'Convert between epoch time and human-readable date', path: '/epoch', icon: '⌛' },
  {
    name: 'Base64 Text Encoder / Decoder',
    description: 'Encode and decode Base64 text data',
    path: '/base64',
    icon: '64'
  },
  {
    name: 'URL Encoder / Decoder',
    description: 'Encode and decode URLs',
    path: '/url',
    icon: '🔗'
  },
  {
    name: 'Hash Generator',
    description: 'Generate hash values for various algorithms',
    path: '/hash',
    icon: '#️⃣'
  },
  { name: 'JSON Formatter', description: 'Format and prettify JSON data', path: '/json-format', icon: '{}' },
  { name: 'Pivot', description: 'Create pivot tables from CSV data', path: '/pivot', icon: '🛋️' },
  { name: 'Compute Diff', description: 'Compare two text or code snippets', path: '/diff', icon: '➕' },
  { name: 'Compute JSON Diff', description: 'Compare two JSON snippets', path: '/diff?lang=json', icon: '{-}' },
  // Add more utilities here as we implement them
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUtilities = utilities.filter(utility =>
    utility.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEO
        title="utils.foo - online utility toolbox"
        description="Free, simple, fast, and clint-side only utilities for developers"
        keywords="base64 encoder, hash generator, json formatter, pivot table"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search utilities..."
              className="w-full bg-white p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="mb-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredUtilities.map((utility) => (
              <UtilityCard key={utility.name} utility={utility} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function UtilityCard({ utility }) {
  return (
    <Link to={utility.path} className="flex h-full">
      <div className="flex flex-col w-full p-4 bg-white rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold font-mono">
            {utility.icon}
          </div>
          <h3 className="text-lg font-medium text-gray-900">{utility.name}</h3>
        </div>
        <p className="text-sm text-gray-500 flex-grow">{utility.description}</p>
      </div>
    </Link>
  );
}