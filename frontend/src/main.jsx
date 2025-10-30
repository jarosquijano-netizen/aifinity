import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AdminApp from './AdminApp';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={<AdminApp />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

// Register Service Worker for PWA - DISABLED FOR NOW
// Uncomment when service-worker.js is properly configured
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}
*/
