import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as Sentry from '@sentry/react';
import { useEffect } from "react";
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

// Initialize Sentry
Sentry.init({
  dsn: "https://8d2f5507822baf48b3b6689465eba82c@o4508098312601600.ingest.de.sentry.io/4508098352382032",  
  integrations: [    Sentry.reactRouterV6BrowserTracingIntegration({
    useEffect,
    useLocation,
    useNavigationType,
    createRoutesFromChildren,
    matchRoutes,
  }),
  Sentry.replayIntegration(),],
  tracesSampleRate: 1.0,  
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
