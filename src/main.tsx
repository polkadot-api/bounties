import { Subscribe } from "@react-rxjs/core";
import { PolkaHubProvider } from "polkahub";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { routeChain } from "./chainRoute.ts";
import "./index.css";
import { polkaHub } from "./state/account.ts";
import { bountiesState$ } from "./state/bounties.ts";

createRoot(document.getElementById("root")!).render(
  <Subscribe source$={bountiesState$}>
    <StrictMode>
      <BrowserRouter basename={`/${routeChain ?? ""}`}>
        <PolkaHubProvider polkaHub={polkaHub}>
          <App />
        </PolkaHubProvider>
      </BrowserRouter>
    </StrictMode>
  </Subscribe>
);
