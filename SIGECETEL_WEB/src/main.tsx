import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import 'leaflet/dist/leaflet.css';

import { setupInterceptor } from "./services/InterceptorService";
import { LayoutProvider } from "./context/LayoutContext";

// interceptor global
setupInterceptor();


// 🔥 TEMA INICIAL (AQUÍ ES DONDE VA)
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  // fallback: sistema operativo
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  if (prefersDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}


// RENDER
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LayoutProvider>
      <App />
    </LayoutProvider>
  </React.StrictMode>
);