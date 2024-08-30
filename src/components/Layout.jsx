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

        <main className="flex-grow container mx-auto py-8">
            {children}
        </main>

        <footer className="p-4 mt-8 border-t border-gray-600">
            <div className="container mx-auto text-center text-gray-600">
                © 2024 utils.foo. All rights reserved.
            </div>
        </footer>
    </div>
);
}