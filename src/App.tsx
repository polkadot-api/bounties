import { Route, Routes } from "react-router-dom";
import { Bounty } from "./pages/Bounty";
import { Header } from "./pages/Header";
import { HomePage } from "./pages/Home";
import { Transactions } from "./Transactions";

export default function App() {
  return (
    <div className="w-full h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-(--breakpoint-lg) m-auto">
          <Routes>
            <Route path="bounty/:id/*" element={<Bounty />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </div>
      </div>
      <Transactions />
    </div>
  );
}
