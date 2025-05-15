import { KnownChains, matchedChain } from "@/chainRoute";
import { AccountSelector } from "@/components/AccountSelector";
import { ChainSelector } from "@/components/ChainSelector/ChainSelector";
import { Link } from "react-router-dom";

const chainNames: Record<KnownChains, string> = {
  kusama: "Kusama",
  polkadot: "Polkadot",
};

export const Header = () => (
  <div className="shrink-0 border-b">
    <div className="flex p-4 items-center gap-2 max-w-(--breakpoint-lg) m-auto">
      <div className="flex flex-1 items-center flex-row gap-2 relative">
        <Link to="/">{chainNames[matchedChain]} Bounties</Link>
      </div>
      <div className="flex items-center gap-2">
        <AccountSelector />
        <ChainSelector />
      </div>
    </div>
  </div>
);
