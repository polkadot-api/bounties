import { KnownChains, matchedChain } from "@/chainRoute";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ReactSVG } from "react-svg";
import kusama from "./kusama.svg";
import polkadot from "./polkadot.svg";

const logos: Record<KnownChains, string> = { polkadot, kusama };

export const ChainSelector = () => (
  <Select
    value={matchedChain}
    onValueChange={(v) => {
      window.location.href = v === "polkadot" ? "/" : "/" + v;
    }}
  >
    <SelectTrigger className="w-auto">
      <SelectValue aria-label={matchedChain}>
        <ReactSVG
          src={logos[matchedChain]}
          beforeInjection={(svg) => {
            svg.setAttribute("width", String(24));
            svg.setAttribute("height", String(24));
          }}
        />
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="polkadot">Polkadot</SelectItem>
      <SelectItem value="kusama">Kusama</SelectItem>
    </SelectContent>
  </Select>
);
