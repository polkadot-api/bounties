import { KnownChains, matchedChain } from "@/chainRoute";
import { Icon } from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { ReactSVG } from "react-svg";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import kusama from "./kusama.svg";
import polkadot from "./polkadot.svg";

const logos: Record<KnownChains, string> = { polkadot, kusama };

export const ChainSelector = () => (
  <div>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ReactSVG
            src={logos[matchedChain]}
            beforeInjection={(svg) => {
              svg.setAttribute("width", String(24));
              svg.setAttribute("height", String(24));
            }}
          />
          <Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Icon>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-auto">
        <button
          className="block hover:bg-accent relative p-1 pr-2 w-full text-left rounded pl-7"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          {matchedChain === "polkadot" ? (
            <span className="absolute left-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
              <Check className="h-4 w-4" />
            </span>
          ) : null}
          Polkadot
        </button>
        <button
          className="block hover:bg-accent relative p-1 pr-2 w-full text-left rounded pl-7"
          onClick={() => {
            window.location.href = "/kusama";
          }}
        >
          {matchedChain === "kusama" ? (
            <span className="absolute left-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
              <Check className="h-4 w-4" />
            </span>
          ) : null}
          Kusama
        </button>
      </PopoverContent>
    </Popover>
  </div>
);
