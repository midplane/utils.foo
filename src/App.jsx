import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { initGA, logPageView } from './analytics';

const Home = lazy(() => import('./pages/Home'));
const Base64EncodeDecode = lazy(() => import('./pages/Base64EncodeDecode'));
const URLEncodeDecode = lazy(() => import('./pages/URLEncodeDecode'));
const HashGenerator = lazy(() => import('./pages/HashGenerator'));
const JSONFormatter = lazy(() => import('./pages/JSONFormatter'));
const EpochConverter = lazy(() => import('./pages/EpochConverter'));
const PivotTable = lazy(() => import('./pages/PivotTable'));
const TextDiff = lazy(() => import('./pages/TextDiff'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Privacy = lazy(() => import('./pages/Privacy'));
const QRCodeGenerator = lazy(() => import('./pages/QRCodeGenerator'));
const QRCodeDecoder = lazy(() => import('./pages/QRCodeDecoder'));
const JWTDecoder = lazy(() => import('./pages/JWTDecoder'));
const JavaThreadDumpAnalyzer = lazy(() => import('./pages/JavaThreadDumpAnalyzer'));
const JsToJson = lazy(() => import('./pages/JsToJson'));
const AnomalyDetection = lazy(() => import('./pages/AnomalyDetection'));

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-3SJ4VQ0EMN';

function App() {
  useEffect(() => {
    initGA(GA_MEASUREMENT_ID);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <AppContent />
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    logPageView();
  }, [location]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
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
        <Route path="/anomaly" element={<AnomalyDetection />} />
        <Route path="/js2json" element={<JsToJson />} />
      </Routes>
    </Suspense>
  );
}

export default App;
