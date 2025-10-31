// src/main.jsx
// ---------------------------------------------
// Entry point for the HeartLink Provider Platform frontend.
// This file mounts the React app and wraps it in React Router.
// ---------------------------------------------

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css"; // Global styles and layout

// Create root and render the application
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
