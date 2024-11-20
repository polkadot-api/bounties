import { typedApi } from "@/chain";
import { CopyText } from "@/components/CopyText";
import { TokenInput } from "@/components/TokenInput";
import { format } from "@/components/token-formatter";
import { Button } from "@/components/ui/button";
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
import { state, useStateObservable } from "@react-rxjs/core";
import { Binary } from "polkadot-api";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { combineLatest, from, map } from "rxjs";
import { z } from "zod";
import { proposeBounty, proposeBountyState$ } from "./proposeBounty.state";
import { AlertCircle, Loader2 } from "lucide-react";
import { FC } from "react";
import { twMerge } from "tailwind-merge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export const ProposeBountyForm: FC<{ className?: string }> = ({
  className,
}) => {
  const schema = useStateObservable(proposeBountySchema$);
  const form = useForm<ProposeBountySchema>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: {
      description: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(proposeBounty)}
        className={twMerge("space-y-4", className)}
      >
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
        <ErrorBox />
        <SubmitButton />
      </form>
    </Form>
  );
};

const ErrorBox = () => {
  const proposeBountyState = useStateObservable(proposeBountyState$);
  if (proposeBountyState.type !== "idle" || !proposeBountyState.error)
    return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Submit failed</AlertTitle>
      <AlertDescription>{proposeBountyState.error}</AlertDescription>
    </Alert>
  );
};

const SubmitButton = () => {
  const proposeBountyState = useStateObservable(proposeBountyState$);
  const isLoading = proposeBountyState.type !== "idle";

  return (
    <Button type="submit" disabled={isLoading} forceSvgSize>
      Sign and Submit
      {isLoading && <Loader2 className="animate-spin" />}
    </Button>
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
