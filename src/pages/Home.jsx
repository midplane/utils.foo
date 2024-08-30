import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const utilities = [
  { name: 'Base64 convertor', description: 'Decode text between base64 representation', path: '/base64' },
  // Add more utilities here as we implement them
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUtilities = utilities.filter(utility =>
    utility.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div >

      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search utilities..."
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 text-gray-400"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUtilities.map((utility) => (
          <Link to={utility.path} key={utility.name}>
            <div class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400">
              <div class="min-w-0 flex-1">
                <a href="#" class="focus:outline-none">
                  <span class="absolute inset-0" aria-hidden="true"></span>
                  <p class="text-sm font-medium text-gray-900">{utility.name}</p>
                  <p class="truncate text-sm text-gray-500">{utility.description}</p>
                </a>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}