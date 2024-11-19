import { typedApi } from "@/chain";
import { CopyText } from "@/components/CopyText";
import { TokenInput } from "@/components/TokenInput";
import { format } from "@/components/token-formatter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { Binary } from "polkadot-api";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { combineLatest, from, map } from "rxjs";
import { z } from "zod";

export const CreateBountyButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>Create bounty</Button>
    </DialogTrigger>
    <CreateBountyDialog />
  </Dialog>
);

const CreateBountyDialog = () => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create bounty</DialogTitle>
      <DialogDescription>
        You will need to perform two steps: creating the bounty and setting up
        the referendum
      </DialogDescription>
    </DialogHeader>
    <Subscribe fallback="Loading…">
      <CreateBountyDialogContent />
    </Subscribe>
  </DialogContent>
);

const CreateBountyDialogContent = () => {
  return (
    <div className="overflow-hidden px-1">
      <ProposeBountyForm />
    </div>
  );
};

const DOT_TOKEN = {
  decimals: 10,
  symbol: "DOT",
};

const getProposeBountySchema = ({
  maxLength,
  minValue,
}: {
  maxLength: number;
  minValue: bigint;
}) => {
  return z.object({
    value: z
      .bigint({
        invalid_type_error: "Value is required",
      })
      .min(minValue, `Must be at least ${format(minValue, DOT_TOKEN)}`),
    description: z.string().max(maxLength),
  });
};
type ProposeBountySchema = z.infer<ReturnType<typeof getProposeBountySchema>>;
const proposeBountySchema$ = state(
  combineLatest({
    maxLength: typedApi.constants.Bounties.MaximumReasonLength(),
    minValue: typedApi.constants.Bounties.BountyValueMinimum(),
  }).pipe(map(getProposeBountySchema))
);

const ProposeBountyForm = () => {
  const schema = useStateObservable(proposeBountySchema$);
  const form = useForm<ProposeBountySchema>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: {
      description: "",
    },
  });

  const onSubmit = (v: any) => console.log("submit", v);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Title of the bounty</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <TokenInput {...field} token={DOT_TOKEN} />
              </FormControl>
              <FormDescription>
                Amount of tokens awarded by this bounty
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <CallData />
          <BondCost />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

const bondConstants$ = state(
  combineLatest({
    base: typedApi.constants.Bounties.BountyDepositBase(),
    perByte: typedApi.constants.Bounties.DataDepositPerByte(),
  })
);

const BondCost = () => {
  const bondConstants = useStateObservable(bondConstants$);
  const values = useWatch();

  const deposit = format(
    bondConstants.base +
      BigInt(values.description.length) * bondConstants.perByte,
    DOT_TOKEN
  );

  return (
    <div className="text-sm">
      You will need to bond {deposit} as a deposit to create this bounty. This
      will be returned when the bounty is approved and funded by the treasury.
    </div>
  );
};

const compatibilityToken$ = state(from(typedApi.compatibilityToken));
const CallData = () => {
  const state = useFormState();
  const values = useWatch();
  const token = useStateObservable(compatibilityToken$);

  const callData = (() => {
    if (!state.isValid) return null;
    try {
      return typedApi.tx.Bounties.propose_bounty({
        description: Binary.fromText(values.description),
        value: values.value,
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
