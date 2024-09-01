import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex items-center">
          <Link to="/" className="text-2xl font-bold">utils.foo</Link>
        </div>
      </header>
      <main className="flex-grow container mx-auto py-8 px-4">
        {children}
      </main>
      <footer className="p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600">
          <Link to="/" className="ml-4 text-blue-500 hover:text-blue-600">home</Link>
          <Link to="/faq" className="ml-4 text-blue-500 hover:text-blue-600">faq</Link>
          <Link to="/privacy" className="ml-4 text-blue-500 hover:text-blue-600">privacy</Link>
          <Link target='_blank' to="https://github.com/midplane/forum.utils.foo/issues" className="ml-4 text-blue-500 hover:text-blue-600">contact</Link>
        </div>
      </footer>
    </div>
  );
}