import { cn } from "@/lib/utils";
import { FC } from "react";

const DOT_DECIMALS = 10;
const DOT_UNIT = 10_000_000_000n;
const decimalPoint = (0.1).toLocaleString().slice(1, 2);
export const DotValue: FC<{
  value: bigint;
  fixedDecimals?: number;
  className?: string;
}> = ({ value, fixedDecimals, className }) => {
  const integerPart = (value / DOT_UNIT).toLocaleString();
  const decimalValue = value % DOT_UNIT;
  const decimalPart =
    (fixedDecimals != null && fixedDecimals > 0) ||
    (fixedDecimals == null && decimalValue !== 0n)
      ? `${decimalPoint}${decimalValue
          .toString()
          .padStart(DOT_DECIMALS, "0")
          .slice(0, fixedDecimals)
          .replace(/0+$/, "")
          .padEnd(fixedDecimals ?? 0, "0")}`
      : null;

  return (
    <span className={cn("text-foreground", className)}>
      <span>{integerPart}</span>
      {decimalPart && <span className="text-foreground/75">{decimalPart}</span>}
      <span className="ml-1">DOT</span>
    </span>
  );
};
