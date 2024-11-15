import { Subscribe } from "@react-rxjs/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { homePage$ } from "./pages/Home/Home.tsx";

createRoot(document.getElementById("root")!).render(
  <Subscribe source$={homePage$}>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </Subscribe>
);
