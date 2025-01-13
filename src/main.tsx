import { Subscribe } from "@react-rxjs/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { bountiesState$ } from "./state/bounties.ts";
import { merge } from "rxjs";
import { ongoingReferenda$ } from "./state/referenda.ts";

createRoot(document.getElementById("root")!).render(
  <Subscribe source$={merge(bountiesState$, ongoingReferenda$)}>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </Subscribe>
);
