import { state, useStateObservable } from "@react-rxjs/core";
import { InjectedExtension } from "polkadot-api/pjs-signer";
import { OnChainIdentity } from "../OnChainIdentity";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import {
  allAccounts$,
  availableExtensions$,
  extensionAccounts$,
  onToggleExtension,
  selectedAccount$,
  selectedExtensions$,
  selectedValue$,
  selectValue,
} from "./accounts.state";
import { twMerge } from "tailwind-merge";
import { map, timer } from "rxjs";

export const AccountSelector = () => {
  return (
    <Dialog>
      <SelectAccountButton />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Account</DialogTitle>
        </DialogHeader>
        <SelectAccountDialog />
      </DialogContent>
    </Dialog>
  );
};

const delayed$ = state(timer(200).pipe(map(() => false)), true);
const SelectAccountButton = () => {
  const selectedAccount = useStateObservable(selectedAccount$);
  const delayed = useStateObservable(delayed$);

  return (
    <DialogTrigger asChild>
      <Button
        variant={selectedAccount ? "polkadotOutline" : "polkadot"}
        className={twMerge(
          "py-1 h-auto transition-opacity",
          selectedAccount
            ? "px-2 max-w-56 overflow-hidden"
            : "px-4 my-2 rounded-full",
          delayed && "opacity-0"
        )}
      >
        {selectedAccount ? (
          <OnChainIdentity
            value={selectedAccount.address}
            name={selectedAccount.name}
          />
        ) : (
          "Select account"
        )}
      </Button>
    </DialogTrigger>
  );
};

const SelectAccountDialog = () => {
  return (
    <div className="overflow-hidden space-y-4 p-1">
      <ExtensionPicker />
      <AccountPicker />
    </div>
  );
};

const ExtensionPicker = () => {
  const availableExtensions = useStateObservable(availableExtensions$);
  const selectedExtensions = useStateObservable(selectedExtensions$);

  const extensions = Array.from(selectedExtensions.keys());
  return (
    <div className="space-y-2">
      <Label>Click on the provider name to toggle it:</Label>
      <ToggleGroup
        type="multiple"
        value={extensions}
        onValueChange={(newExtensions: string[]) => {
          newExtensions.forEach((ext) => {
            if (!selectedExtensions.has(ext)) {
              onToggleExtension(ext);
            }
          });
          const extensionSet = new Set(newExtensions);
          extensions.forEach((ext) => {
            if (!extensionSet.has(ext)) {
              onToggleExtension(ext);
            }
          });
        }}
      >
        {availableExtensions.map((extensionName) => (
          <ToggleGroupItem key={extensionName} value={extensionName}>
            {extensionName}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

const AccountPicker: React.FC = () => {
  const value = useStateObservable(selectedValue$);
  const extensions = useStateObservable(selectedExtensions$);
  const allAccounts = useStateObservable(allAccounts$);

  const activeExtensions = [...extensions.values()].filter((v) => !!v);
  const valueExists = value && allAccounts.includes(value);

  if (!activeExtensions.length) return null;

  return (
    <div className="space-y-2">
      <Label>Select the account you want to connect with:</Label>
      <Select
        value={valueExists ? value ?? "" : ""}
        onValueChange={selectValue}
      >
        <SelectTrigger className="h-auto border-foreground/30">
          <SelectValue placeholder="Select an account" />
        </SelectTrigger>
        <SelectContent>
          {activeExtensions.map((extension) => (
            <Accounts key={extension.name} extension={extension} />
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const Accounts: React.FC<{ extension: InjectedExtension }> = ({
  extension,
}) => {
  const accounts = useStateObservable(extensionAccounts$(extension.name));

  return (
    <SelectGroup>
      <SelectLabel>{extension.name}</SelectLabel>
      {accounts.map((account) => (
        <SelectItem
          key={account.address}
          value={account.address + "-" + extension.name}
        >
          <OnChainIdentity value={account.address} name={account.name} />
        </SelectItem>
      ))}
    </SelectGroup>
  );
};
