import { mimirProvider } from "@/state/account";
import { useStateObservable } from "@react-rxjs/core";
import {
  ManageLedger,
  ManagePjsWallets,
  ManageReadOnly,
  ManageVault,
  MimirButton,
  PolkaHubModal,
  SelectAccountField,
} from "polkahub";

export const AccountSelector = () => {
  const isMimir = useStateObservable(mimirProvider.isReady$);

  if (isMimir) {
    return (
      <PolkaHubModal>
        <SelectAccountField />
        <div>
          <h3>Manage Connections</h3>
          <div className="flex gap-2 flex-wrap items-center justify-center">
            <MimirButton />
            <ManageReadOnly />
          </div>
        </div>
      </PolkaHubModal>
    );
  }

  return (
    <PolkaHubModal>
      <SelectAccountField />
      <ManagePjsWallets />
      <div>
        <h3>Manage Connections</h3>
        <div className="flex gap-2 flex-wrap items-center justify-center">
          <ManageReadOnly />
          <ManageLedger />
          <ManageVault />
        </div>
      </div>
    </PolkaHubModal>
  );
};
