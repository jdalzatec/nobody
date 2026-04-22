import { App as AntdApp, ConfigProvider } from "antd";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing root element "#root"');
}

createRoot(rootEl).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1a1a2e",
          borderRadius: 6,
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
