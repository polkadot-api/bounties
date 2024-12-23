import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getSs58AddressInfo,
  SS58String,
} from "@polkadot-api/substrate-bindings";
import { toHex } from "@polkadot-api/utils";
import { useStateObservable } from "@react-rxjs/core";
import { Check, ChevronsUpDown } from "lucide-react";
import { FC, useState } from "react";
import { map } from "rxjs";
import { twMerge } from "tailwind-merge";
import { OnChainIdentity } from "../OnChainIdentity";
import { accountsByExtension$ } from "./accounts.state";

const hintedAccounts$ = accountsByExtension$.pipeState(
  map(
    (accountsByExtension) =>
      new Set(
        Array.from(accountsByExtension.values()).flatMap((accounts) =>
          accounts
            .map((acc) => acc.address)
            .filter((acc) => !acc.startsWith("0x"))
        )
      )
  ),
  map((set) => [...set])
);

const SS58Eq = (a: SS58String, b: SS58String) => {
  if (a === b) return true;
  const aInfo = getSs58AddressInfo(a);
  const bInfo = getSs58AddressInfo(b);
  return (
    aInfo.isValid &&
    bInfo.isValid &&
    toHex(aInfo.publicKey) === toHex(bInfo.publicKey)
  );
};

export const AccountInput: FC<{
  value: SS58String | null;
  onChange: (value: SS58String) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const accounts = useStateObservable(hintedAccounts$);

  const [query, setQuery] = useState("");
  const queryInfo = getSs58AddressInfo(query);

  const [open, _setOpen] = useState(false);
  const setOpen = (value: boolean) => {
    _setOpen(value);
    setQuery("");
  };

  const valueIsNew = value && !accounts.find((acc) => SS58Eq(acc, value));
  if (value !== null) {
    accounts.sort(([, a], [, b]) =>
      SS58Eq(a, value) ? -1 : SS58Eq(b, value) ? 1 : 0
    );
  }

  const onTriggerKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key.length === 1) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onKeyDown={onTriggerKeyDown}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={twMerge(
            "flex w-64 justify-between overflow-hidden px-2 border border-border bg-input",
            className
          )}
          forceSvgSize={false}
        >
          {value != null ? (
            <OnChainIdentity value={value} className="overflow-hidden" />
          ) : (
            <span className="opacity-80">Select…</span>
          )}
          <ChevronsUpDown size={14} className="opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <Command>
          <CommandInput
            placeholder="Filter…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="text-foreground/50">
                The value is not a valid Account ID
              </div>
            </CommandEmpty>
            <CommandGroup>
              {valueIsNew && (
                <AccountOption
                  account={value}
                  selected={true}
                  onSelect={() => setOpen(false)}
                />
              )}
              {accounts.map((account) => (
                <AccountOption
                  key={account}
                  account={account}
                  selected={value ? SS58Eq(value, account) : false}
                  onSelect={() => {
                    onChange(account);
                    setOpen(false);
                  }}
                />
              ))}
              {queryInfo.isValid && (
                <AccountOption
                  account={query}
                  selected={value === query}
                  onSelect={() => {
                    onChange(query);
                    setOpen(false);
                  }}
                />
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const AccountOption: FC<{
  account: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ account, selected, onSelect }) => (
  <CommandItem
    value={account}
    onSelect={onSelect}
    className="flex flex-row items-center gap-2 p-1"
    forceSvgSize={false}
  >
    <OnChainIdentity value={account} className="overflow-hidden" />
    <Check
      size={12}
      className={twMerge(
        "ml-auto flex-shrink-0",
        selected ? "opacity-100" : "opacity-0"
      )}
    />
  </CommandItem>
);
