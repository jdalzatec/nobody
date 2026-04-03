import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1a1a2e",
          borderRadius: 6,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
