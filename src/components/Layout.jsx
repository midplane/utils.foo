import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%)'}}>
      <header className="bg-black text-white p-4 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between lg:px-8">
          <Link to="/" className="text-xl font-mono text-gray-100">~ utils.foo</Link>
          <div className="flex flex-1 justify-end text-sm text-gray-400">
            utils.foo is ad free & no data leaves the browser
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto py-8 px-4">
        {children}
      </main>
      <footer className="p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600">
          <Link to="/" className="text-sm leading-6 text-gray-600 hover:text-gray-900">home</Link>
          <Link to="/faq" className="ml-4 text-sm leading-6 text-gray-600 hover:text-gray-900">faq</Link>
          <Link to="/privacy" className="ml-4 text-sm leading-6 text-gray-600 hover:text-gray-900">privacy</Link>
          <Link target='_blank' rel="noopener noreferrer" to="https://github.com/midplane/utils.foo/discussions" className="ml-4 text-sm leading-6 text-gray-600 hover:text-gray-900">contact</Link>
          <Link target='_blank' rel="noopener noreferrer" to="https://github.com/midplane/utils.foo" className="ml-4 text-sm leading-6 text-gray-600 hover:text-gray-900">code</Link>
        </div>
      </footer>
    </div>
  );
}
