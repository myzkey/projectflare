import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerProjectFlareServiceWorker } from "./pwa";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ProjectFlare root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerProjectFlareServiceWorker();
