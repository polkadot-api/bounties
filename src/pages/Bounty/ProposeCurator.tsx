import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { CopyText } from "@/components/CopyText";
import { DOT_TOKEN, TokenInput } from "@/components/TokenInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { bounty$ } from "@/state/bounties";
import {
  MultiAddress,
  PreimagesBounded,
  TraitsScheduleDispatchTime,
} from "@polkadot-api/descriptors";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { SS58String } from "polkadot-api";
import { FC } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import {
  catchError,
  defer,
  exhaustMap,
  filter,
  from,
  map,
  of,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { ReferendumCreatedStep } from "../CreateBounty/AproveBounty";
import { SubmitTxState } from "../CreateBounty/TxProgress";
import {
  getEnactment,
  getOrigin,
  getSubmittedReferendum,
} from "../CreateBounty/approveBounty.state";

export const ProposeCurator: FC<{ id: number }> = ({ id }) => {
  const account = useStateObservable(selectedAccount$);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!account} className="self-start">
          Propose Curator
        </Button>
      </DialogTrigger>
      <ProposeCuratorDialog id={id} />
    </Dialog>
  );
};

const ProposeCuratorDialog: FC<{ id: number }> = ({ id }) => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Propose Curator</DialogTitle>
      <DialogDescription>
        You need to create a referenda to propose a curator. After creating it,
        you can add the description in Polkassembly or Subsquare.
      </DialogDescription>
    </DialogHeader>
    <Subscribe fallback="Loading…">
      <ProposeCuratorDialogContent id={id} />
    </Subscribe>
  </DialogContent>
);

export const [proposeCurator$, proposeCurator] = createSignal<{
  bountyId: number;
  curator: SS58String;
  fee: bigint;
}>();

export const proposeCuratorState$ = state(
  proposeCurator$.pipe(
    switchMap((proposal) =>
      bounty$(proposal.bountyId).pipe(
        filter((v) => !!v),
        take(1),
        map((bounty) => ({
          ...proposal,
          bounty,
        }))
      )
    ),
    withLatestFrom(
      selectedAccount$.pipe(filter((v) => !!v)),
      typedApi.compatibilityToken
    ),
    exhaustMap(([proposal, selectedAccount, token]) =>
      defer(() => {
        // TODO abstract this with `approveBounty.state`, or move into sdk
        const proposeCuratorTx = typedApi.tx.Bounties.propose_curator({
          bounty_id: proposal.bountyId,
          curator: MultiAddress.Id(proposal.curator),
          fee: proposal.fee,
        }).getEncodedData(token);

        const referendaTracks = typedApi.constants.Referenda.Tracks(token);

        return typedApi.tx.Referenda.submit({
          proposal_origin: getOrigin(proposal.bounty.value),
          enactment_moment: TraitsScheduleDispatchTime.After(
            getEnactment(proposal.bounty.value, referendaTracks)
          ),
          proposal: PreimagesBounded.Inline(proposeCuratorTx),
        })
          .signSubmitAndWatch(selectedAccount.polkadotSigner)
          .pipe(
            startWith({
              type: "signing",
            } satisfies SubmitTxState),
            map((v): SubmitTxState => {
              if (v.type === "finalized") {
                if (!v.ok) {
                  console.error(v.dispatchError);
                  return {
                    type: "idle",
                    error: v.dispatchError.type,
                  };
                }
                if (getSubmittedReferendum(v) === null) {
                  return {
                    type: "idle",
                    error: `Transaction succeeded, but bounty index could not be identified. Refresh the list of bounties and continue the flow from there`,
                  };
                }
              }

              return v;
            })
          );
      }).pipe(
        catchError((err) =>
          of({
            type: "idle",
            error: err.message,
          } satisfies SubmitTxState)
        )
      )
    )
  ),
  {
    type: "idle",
  } satisfies SubmitTxState
);

const ProposeCuratorDialogContent: FC<{ id: number }> = ({ id }) => {
  const proposeCuratorState = useStateObservable(proposeCuratorState$);

  if (proposeCuratorState.type !== "finalized") {
    return <ProposeBountyForm id={id} />;
  }

  return (
    <div className="overflow-hidden px-1">
      <ReferendumCreatedStep
        referendum={getSubmittedReferendum(proposeCuratorState)}
      />
    </div>
  );
};

const ProposeBountyForm: FC<{ id: number }> = ({ id }) => {
  const bounty = useStateObservable(bounty$(id));
  const form = useForm<{ curator: SS58String; fee: bigint }>();

  if (!bounty) return null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((res) =>
          proposeCurator({
            ...res,
            bountyId: id,
          })
        )}
        className="space-y-4 overflow-hidden"
      >
        <FormField
          control={form.control}
          name="curator"
          rules={{
            required: true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curator</FormLabel>
              <FormControl>
                <AccountInput className="w-full" {...field} />
              </FormControl>
              <FormDescription>Curator to propose</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fee"
          rules={{
            required: true,
            validate: (v) =>
              v > bounty.value
                ? [`Must be lower than the bounty value (${bounty.value})`]
                : undefined,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curator Fee</FormLabel>
              <FormControl>
                <TokenInput {...field} token={DOT_TOKEN} />
              </FormControl>
              <FormDescription>
                Amount of tokens awarded to the curator for this bounty
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <CallData id={id} />
        <ErrorBox />
        <SubmitButton />
      </form>
    </Form>
  );
};

// TODO many of this is common with ProposeBountyForm
const ErrorBox = () => {
  const proposeCuratorState = useStateObservable(proposeCuratorState$);
  if (proposeCuratorState.type !== "idle" || !proposeCuratorState.error)
    return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Submit failed</AlertTitle>
      <AlertDescription>{proposeCuratorState.error}</AlertDescription>
    </Alert>
  );
};

const SubmitButton = () => {
  const proposeCuratorState = useStateObservable(proposeCuratorState$);
  const isLoading = proposeCuratorState.type !== "idle";

  return (
    <Button type="submit" disabled={isLoading} forceSvgSize>
      Sign and Submit
      {isLoading && <Loader2 className="animate-spin" />}
    </Button>
  );
};

const compatibilityToken$ = state(from(typedApi.compatibilityToken));
const CallData: FC<{ id: number }> = ({ id }) => {
  const state = useFormState();
  const values = useWatch();
  const token = useStateObservable(compatibilityToken$);

  const callData = (() => {
    if (!state.isValid) return null;
    try {
      return typedApi.tx.Bounties.propose_curator({
        bounty_id: id,
        curator: MultiAddress.Id(values.curator),
        fee: values.fee,
      })
        .getEncodedData(token)
        .asHex();
    } catch (_) {
      console.error(_);
      return null;
    }
  })();

  return (
    <div className="text-sm flex flex-col overflow-hidden">
      <div>Call data</div>
      {state.isValid && callData ? (
        <div className="flex items-center gap-1">
          <CopyText text={callData} binary />
          <div className="overflow-hidden text-ellipsis text-foreground/80">
            {callData}
          </div>
        </div>
      ) : (
        <div className="text-foreground/50">N/A</div>
      )}
    </div>
  );
};
