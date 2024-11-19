import { AccountSelector } from "@/components/AccountSelector";

export const Header = () => (
  <div className="flex p-4 pb-2 items-center flex-shrink-0 gap-2 border-b">
    <div className="flex flex-1 items-center flex-row gap-2 relative">
      Bounty Manager
    </div>
    <AccountSelector />
  </div>
);
