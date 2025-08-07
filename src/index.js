import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // 確保這行存在
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);