import React from "react";
import ReactDOM from 'react-dom/client'
import App from './App'

const style = document.createElement('style')
style.textContent = `
 *,*::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
 }
    html {scroll-behaviour: smooth; }

    body {
        background: #030712;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

  :-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #374151; }

  input:focus {
    border-color: rgba(124,58,237,0.5) !important;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important;
    outline: none;
  }

   button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  button:active:not(:disabled) {
    transform: translateY(0);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

   @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }


   @media (max-width: 680px) {
    .panels { grid-template-columns: 1fr !important; }
  }

`

document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
    <App/>
</React.StrictMode>
)