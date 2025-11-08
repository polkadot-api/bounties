import { useLightClient } from "@/chain";
import { cn } from "@/lib/utils";
import { CloudAlert, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";

const config = {
  light: {
    tip: (
      <>
        <p>
          Connected via a light client (smoldot). All displayed data is verified
          to be on-chain.
        </p>
        <p>Click to switch to a centralized, non-verified server connection.</p>
      </>
    ),
    className:
      "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  rpc: {
    tip: (
      <>
        <p>
          Connected via centralized servers. Displayed data is "trusted" (not
          verified to be on-chain).
        </p>
        <p>
          Click to switch to the decentralized, trustless light-client
          connection.
        </p>
      </>
    ),
    className:
      "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400",
  },
};

export const LightClientRpcToggle = () => {
  const { tip, className } = config[useLightClient ? "light" : "rpc"];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label="Smoldot"
          onClick={() => {
            window.localStorage.setItem(
              "use-smoldot",
              (!useLightClient).toString()
            );
            window.location.reload();
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs dark:bg-input/30 dark:border-input size-9 relative transition-all duration-200",
            className
          )}
        >
          {useLightClient ? (
            <ShieldCheck className="w-5 h-5" />
          ) : (
            <CloudAlert className="w-5 h-5" />
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-[100vw]">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
