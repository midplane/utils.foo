import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Base64EncodeDecode from './pages/Base64EncodeDecode';
import URLEncodeDecode from './pages/URLEncodeDecode';
import HashGenerator from './pages/HashGenerator';
import Layout from './components/Layout';


function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/base64" element={<Base64EncodeDecode />} />
          <Route path="/url" element={<URLEncodeDecode />} />
          <Route path="/hash" element={<HashGenerator />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;