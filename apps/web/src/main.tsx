import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "govuk-frontend/dist/govuk/govuk-frontend.min.css";
import "./globals.css";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
