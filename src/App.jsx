import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Base64EncodeDecode from './pages/Base64EncodeDecode';
import URLEncodeDecode from './pages/URLEncodeDecode';
import HashGenerator from './pages/HashGenerator';
import JSONFormatter from './pages/JSONFormatter';
import EpochConverter from './pages/EpochConverter';
import PivotTable from './pages/PivotTable';
import FAQ from './pages/FAQ';
import Layout from './components/Layout';
import Privacy from './pages/Privacy';


function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/base64" element={<Base64EncodeDecode />} />
          <Route path="/url" element={<URLEncodeDecode />} />
          <Route path="/hash" element={<HashGenerator />} />
          <Route path="/json-format" element={<JSONFormatter />} />
          <Route path="/epoch" element={<EpochConverter />} />
          <Route path="/pivot" element={<PivotTable />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;