import { AccountSelector } from "@/components/AccountSelector";
import { Link } from "react-router-dom";

export const Header = () => (
  <div className="flex-shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 max-w-screen-lg m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">Polkadot Bounties</Link>
      </div>
      <AccountSelector />
    </div>
  </div>
);
