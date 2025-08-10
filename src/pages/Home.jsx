import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, SquareSlash } from 'lucide-react';
import SEO from '../SEO';

const utilities = [
  { id: 'epoch', name: 'Epoch Converter', description: 'Convert between epoch time and human-readable date', path: '/epoch', icon: '⌛' },
  { id: 'base64', name: 'Base64 Text Encoder / Decoder', description: 'Encode and decode Base64 text data', path: '/base64', icon: '64' },
  { id: 'url', name: 'URL Encoder / Decoder', description: 'Encode and decode URLs', path: '/url', icon: '🔗' },
  { id: 'hash', name: 'Hash Generator', description: 'Generate hash values for various algorithms', path: '/hash', icon: '#️⃣' },
  { id: 'json', name: 'JSON Formatter', description: 'Prettify, minify, query, escape, unescape JSON', path: '/json-format', icon: '{}' },
  { id: 'pivot', name: 'Pivot', description: 'Create pivot tables from CSV data', path: '/pivot', icon: '🛋️' },
  { id: 'diff', name: 'Compute Diff', description: 'Compare two text or code snippets', path: '/diff', icon: '➕' },
  { id: 'diffjson', name: 'Compute JSON Diff', description: 'Compare two JSON snippets', path: '/diff?lang=json', icon: '{-}' },
  { id: 'qr', name: 'QR Code Generator', description: 'Generate QR codes as SVG/PNG', path: '/qr', icon: '📱' },
  { id: 'qrdecode', name: 'QR Code Decoder', description: 'Decode QR codes', path: '/qr-decode', icon: '📱' },
  { id: 'jwt', name: 'JWT Decoder', description: 'Decode JWT', path: '/jwt', icon: '🗝️' },
  { id: 'tree', name: 'Tree', description: 'tree.nathanfriend.io is an online tree-like utility for generating ASCII folder structure diagrams', path: 'https://tree.nathanfriend.io/', icon: '🌲', external: true },
  { id: 'regex', name: 'Regex Tester', description: 'Test regex expressions from different languages, links to regex101.com', path: 'https://regex101.com/', icon: '^$', external: true },
  { id: 'jtdump', name: 'Java Thread Dump Analyzer', description: 'Analyze java thread dumps with detailed stack trace viewing', path: '/jtdump', icon: '🧵' },
  { id: 'js2json', name: 'JS to JSON', description: 'Convert JavaScript objects to JSON format', path: '/js2json', icon: '🔄' },
  { id: 'anomaly', name: 'Anomaly Detection', description: 'Detect anomalies using statistical analysis', path: '/anomaly', icon: '⚠️' },
  // Add more utilities here as we implement them
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavorites(storedFavorites);
  }, []);

  const toggleFavorite = (utilityId) => {
    const newFavorites = favorites.includes(utilityId)
      ? favorites.filter(id => id !== utilityId)
      : [...favorites, utilityId];

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const filteredUtilities = utilities
    .filter(utility =>
      utility.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      return bFav - aFav;
    });

  return (
    <>
      <SEO
        title="utils.foo - online utility toolbox"
        description="Free, simple, fast, and client-side only utilities for developers"
        keywords="base64 encoder, hash generator, json formatter, pivot table"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search utilities..."
              className="w-full bg-white p-2 pl-10 border border-gray-300 rounded-md shadow-md focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              ref={searchInputRef}
              aria-label="Search utilities"
              role="searchbox"
            />
            <Search className="absolute left-3 top-2.5 text-gray-600" size={20} />
            <SquareSlash className="absolute right-3 top-2.5 text-gray-600" size={20} />
          </div>
        </div>

        <div className="mb-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredUtilities.map((utility) => (
              <UtilityCard
                key={utility.id}
                utility={utility}
                isFavorite={favorites.includes(utility.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function UtilityCard({ utility, isFavorite, onToggleFavorite }) {
  return (
    <div className="relative">
      <Link to={utility.path} className="block h-full" target={utility.external ? '_blank' : '_self'} rel={utility.external ? 'noopener noreferrer' : undefined}>
        <div className="flex flex-col h-full p-4 bg-white rounded-md border border-gray-100 shadow-md focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-200 hover:shadow-lg">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-mono">
              {utility.icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900">{utility.name}</h3>
          </div>
          <p className="text-sm text-gray-500 flex-grow">{utility.description}</p>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(utility.id);
        }}
        className="absolute bottom-2 right-2 text-yellow-500 hover:text-yellow-600 focus:outline-none"
        aria-label={isFavorite ? `Remove ${utility.name} from favorites` : `Add ${utility.name} to favorites`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star size={20} fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}