import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { I18nProvider } from "./i18n";
import { InterfaceStyleProvider } from "./interface-style";
import "./styles.css";
import { ThemeProvider } from "./themes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <InterfaceStyleProvider>
          <App />
        </InterfaceStyleProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
