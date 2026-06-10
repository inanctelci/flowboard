import React from "react";
import ReactDOM from "react-dom/client";
// i18n side-effect import MUST precede App. Module load order in ES modules
// is top-to-bottom within the same file; this guarantees i18n.init() runs
// synchronously before <App /> renders, eliminating first-paint flicker.
import "./i18n/i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import { App } from "./App";
import "@xyflow/react/dist/style.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
