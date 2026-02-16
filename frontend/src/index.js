import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialize i18next
import App from './App';
import reportWebVitals from './reportWebVitals';
import { SocketProvider } from './context/SocketContext';
import { PreferencesProvider } from './context/PreferencesContext'; // Assuming this exists or I should check App.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SocketProvider>
      <App />
    </SocketProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
