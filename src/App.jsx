import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Base64EncodeDecode from './pages/Base64EncodeDecode';
import URLEncodeDecode from './pages/URLEncodeDecode';
import HashGenerator from './pages/HashGenerator';
import JSONFormatter from './pages/JSONFormatter';
import EpochConverter from './pages/EpochConverter';
import PivotTable from './pages/PivotTable';
import TextDiff from './pages/TextDiff';
import FAQ from './pages/FAQ';
import Layout from './components/Layout';
import Privacy from './pages/Privacy';
import QRCodeGenerator from './pages/QRCodeGenerator';
import QRCodeDecoder from './pages/QRCodeDecoder';
import JWTDecoder from './pages/JWTDecoder';
import { initGA, logPageView } from './analytics';
import JavaThreadDumpAnalyzer from './pages/JavaThreadDumpAnalyzer';
import JsToJson from './pages/JsToJson';

const GA_MEASUREMENT_ID = 'G-3SJ4VQ0EMN';

function App() {
  useEffect(() => {
    initGA(GA_MEASUREMENT_ID);
  }, []);

  return (
    <Router>
      <Layout>
        <AppContent />
      </Layout>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    logPageView();
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
          <Route path="/base64" element={<Base64EncodeDecode />} />
          <Route path="/url" element={<URLEncodeDecode />} />
          <Route path="/hash" element={<HashGenerator />} />
          <Route path="/json-format" element={<JSONFormatter />} />
          <Route path="/epoch" element={<EpochConverter />} />
          <Route path="/pivot" element={<PivotTable />} />
          <Route path="/diff" element={<TextDiff />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/qr" element={<QRCodeGenerator />} />
          <Route path="/qr-decode" element={<QRCodeDecoder />} />
          <Route path="/jwt" element={<JWTDecoder />} />
          <Route path="/jtdump" element={<JavaThreadDumpAnalyzer />} />
          <Route path="/jstojson" element={<JsToJson />} />
    </Routes>
  );
}

export default App;
