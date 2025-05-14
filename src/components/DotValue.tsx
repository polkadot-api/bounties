import { cn } from "@/lib/utils";
import { FC } from "react";
import { SELECTED_TOKEN } from "./TokenInput";

const TOKEN_UNIT = 10n ** BigInt(SELECTED_TOKEN.decimals);
const decimalPoint = (0.1).toLocaleString().slice(1, 2);
export const DotValue: FC<{
  value: bigint;
  fixedDecimals?: number;
  className?: string;
}> = ({ value, fixedDecimals, className }) => {
  const integerPart = (value / TOKEN_UNIT).toLocaleString();
  const decimalValue = value % TOKEN_UNIT;
  const decimalPart =
    (fixedDecimals != null && fixedDecimals > 0) ||
    (fixedDecimals == null && decimalValue !== 0n)
      ? `${decimalPoint}${decimalValue
          .toString()
          .padStart(SELECTED_TOKEN.decimals, "0")
          .slice(0, fixedDecimals)
          .replace(/0+$/, "")
          .padEnd(fixedDecimals ?? 0, "0")}`
      : null;

  return (
    <span className={cn("text-foreground", className)}>
      <span>{integerPart}</span>
      {decimalPart && <span className="text-foreground/75">{decimalPart}</span>}
      <span className="ml-1">{SELECTED_TOKEN.symbol}</span>
    </span>
  );
};
