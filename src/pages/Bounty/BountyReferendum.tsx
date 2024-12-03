import { usePromise } from "@/lib/usePromise";
import { OngoingReferendum } from "@/sdk/referenda-sdk";
import {
  bountyApprovingReferenda$,
  bountyProposingCuratorReferenda$,
} from "@/state/bounties";
import { useStateObservable } from "@react-rxjs/core";
import { FC, PropsWithChildren } from "react";

export const ApproveBountyReferendum: FC<{ id: number }> = ({ id }) => {
  const referenda = useStateObservable(bountyApprovingReferenda$(id));

  const getContent = () => {
    if (!referenda) return "Loading referenda…";
    if (referenda.length === 0) {
      return (
        <span>Can't find any ongoing referenda approving this bounty</span>
      );
    }
    return referenda.map((ref) => (
      <ReferendumInfo key={ref.id} referendum={ref} />
    ));
  };

  return (
    <div className="flex gap-2 border border-border rounded p-2 flex-col">
      {getContent()}
    </div>
  );
};

export const ProposeBountyReferendum: FC<{ id: number }> = ({ id }) => {
  const referenda = useStateObservable(bountyProposingCuratorReferenda$(id));

  const getContent = () => {
    if (!referenda) return "Loading referenda…";
    if (referenda.length === 0) {
      return (
        <span>
          Can't find any ongoing referenda proposing a curator for this bounty
        </span>
      );
    }
    return referenda.map(({ referendum }) => (
      <ReferendumInfo key={referendum.id} referendum={referendum} />
    ));
  };

  return (
    <div className="flex gap-2 border border-border rounded p-2 flex-col">
      {getContent()}
    </div>
  );
};

const ReferendumInfo: FC<
  PropsWithChildren<{ referendum: OngoingReferendum }>
> = ({ referendum, children }) => {
  const details = usePromise(
    () => referendum.getDetails(import.meta.env.VITE_SUBSCAN_API_KEY),
    null
  );

  return (
    <div>
      <div className="flex gap-2 overflow-hidden">
        <div className="font-bold">{referendum.id}</div>
        <div className="flex-1 whitespace-nowrap text-ellipsis overflow-hidden">
          {details === null ? "(Loading title…)" : details.title ?? "N/A"}
        </div>
        <div className="flex gap-1">
          <a
            className="underline"
            target="_blank"
            href={`https://polkadot.polkassembly.io/referenda/${referendum.id}`}
          >
            Polkassembly
          </a>
          <a
            className="underline"
            target="_blank"
            href={`https://polkadot.subsquare.io/referenda/${referendum.id}`}
          >
            Subsquare
          </a>
        </div>
      </div>
      {children}
    </div>
  );
};
