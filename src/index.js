import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const BASE_PATH = '/gsd/janitorial';
if (window.location.pathname === '/' || window.location.pathname === '') {
  const nextUrl = `${BASE_PATH}/${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
