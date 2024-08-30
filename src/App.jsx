import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Base64EncodeDecode from './pages/Base64EncodeDecode';
import Layout from './components/Layout';


function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/base64" element={<Base64EncodeDecode />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;