import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { Bounty } from "./pages/Bounty";
import { Header } from "./pages/Header";

export default function App() {
  return (
    <div className="w-full max-w-screen-lg h-screen bg-background flex flex-col m-auto">
      <Header />
      <Routes>
        <Route path="bounty/:id/*" element={<Bounty />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}
