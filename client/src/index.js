import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing'; // Corrected import

// Initialize Sentry
Sentry.init({
  dsn: "https://8d2f5507822baf48b3b6689465eba82c@o4508098312601600.ingest.de.sentry.io/4508098352382032",  
  integrations: [new BrowserTracing()], // No changes needed here
  tracesSampleRate: 1.0,  // Adjust this as necessary
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
