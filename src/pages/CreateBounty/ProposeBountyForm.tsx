import { typedApi } from "@/chain";
import { SELECTED_TOKEN, TokenInput } from "@/components/TokenInput";
import { format } from "@/components/token-formatter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { FC } from "react";
import { useForm, useWatch } from "react-hook-form";
import { combineLatest, map } from "rxjs";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { isTxInProgress, TxProgress } from "./TxProgress";
import { proposeBounty, proposeBountyState$ } from "./proposeBounty.state";

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
      .min(minValue, `Must be at least ${format(minValue, SELECTED_TOKEN)}`),
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
                <TokenInput {...field} token={SELECTED_TOKEN} />
              </FormControl>
              <FormDescription>
                Amount of tokens awarded by this bounty
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
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
    SELECTED_TOKEN
  );

  return (
    <div className="text-sm">
      You will need to bond {deposit} as a deposit to create this bounty. This
      will be returned when the bounty is approved and funded by the treasury.
    </div>
  );
};

export const ProposeBountyStep = () => {
  const proposeBountyState = useStateObservable(proposeBountyState$);

  return (
    <div className="overflow-hidden px-1 relative">
      <ProposeBountyForm
        className={twMerge(
          "transition-opacity",
          isTxInProgress(proposeBountyState) && "opacity-0"
        )}
      />
      <TxProgress state={proposeBountyState} />
    </div>
  );
};
