import { createApp } from './App.jsx';

const apiUrl = window.__APP_CONFIG__?.apiUrl || `${window.location.protocol}//${window.location.hostname}:3333`;

createApp({
  root: document.getElementById('root'),
  apiUrl
});
