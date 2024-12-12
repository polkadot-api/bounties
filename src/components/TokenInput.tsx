import { forwardRef, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import {
  formatValue,
  fractionalSeparator,
  thousandsSeparator,
} from "./token-formatter";

export const DOT_TOKEN = {
  decimals: 10,
  symbol: "DOT",
};
export const TokenInput = forwardRef<
  HTMLDivElement,
  {
    value?: bigint | null;
    onChange?: (value: bigint | null) => void;
    token: {
      symbol: string;
      decimals: number;
    };
    className?: string;
  }
>(({ value: value, onChange, token, className }, outerRef) => {
  const ref = useRef<HTMLInputElement>(null as unknown as HTMLInputElement);

  useEffect(() => {
    if (value === undefined) return;

    const currentValue = parseValue(ref.current.value, token.decimals).value;
    if (value === currentValue) return;

    ref.current.value = value == null ? "" : formatValue(value, token.decimals);
  }, [value, token.decimals]);

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { value, cleaned, cursor } = parseValue(
      evt.target.value,
      token.decimals,
      evt.target.selectionStart ?? 0
    );
    // console.log({ original: evt.target.selectionStart, cursor });
    evt.target.value = cleaned;
    evt.target.setSelectionRange(cursor, cursor);
    onChange?.(value);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key.length > 1 || evt.ctrlKey || evt.metaKey) return;

    const singletonKeys = [fractionalSeparator, "-", "+"];
    if (
      singletonKeys.some((v) => v === evt.key) &&
      evt.currentTarget.value.includes(evt.key)
    ) {
      evt.preventDefault();
    }
    if (evt.key === fractionalSeparator) return;

    const cursor = evt.currentTarget.selectionStart ?? 0;
    if (cursor > 0 && (evt.key === "-" || evt.key === "+")) {
      evt.preventDefault();
      return;
    }

    if (!/[\d+-]/.test(evt.key)) {
      evt.preventDefault();
    }
  };

  return (
    <div
      ref={outerRef}
      className={twMerge(
        "flex gap-2 py-1 px-2 border rounded items-center",
        className
      )}
    >
      <input
        className="outline-none flex-1"
        ref={ref}
        type="text"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className="text-slate-600">{token.symbol}</div>
    </div>
  );
});

function parseValue(
  strValue: string,
  decimals: number,
  cursor: number = 0
): { value: bigint | null; cleaned: string; cursor: number } {
  const parts = strValue.split(fractionalSeparator);
  if (parts.length > 2 || strValue === "") {
    return {
      value: null,
      cleaned: strValue,
      cursor,
    };
  }

  const originalInteger = parts[0];
  parts[0] = parts[0].replaceAll(thousandsSeparator, "");
  parts[1] = parts[1]?.replaceAll(thousandsSeparator, "")?.slice(0, decimals);

  // eslint-disable-next-line prefer-const
  let [integer, fractional] = parts;

  if (
    !/^[+|-]?\d*$/.test(integer) ||
    (fractional && !/^\d*$/.test(fractional))
  ) {
    return {
      value: null,
      cleaned: strValue,
      cursor,
    };
  }
  const cleaned = rejoin(integer, fractional);
  cursor = getCursorPosition(cursor, originalInteger);

  const firstChar = integer[0];
  const sign = firstChar === "-" ? -1n : 1n;
  if (firstChar === "+" || firstChar === "-") {
    integer = integer.slice(1);
  }

  const mod = 10n ** BigInt(decimals);
  const integerPart = BigInt(integer) * mod;
  const fractionalPart = BigInt((fractional ?? "").padEnd(decimals, "0"));

  return {
    value: sign * (integerPart + fractionalPart),
    cleaned,
    cursor,
  };
}

function rejoin(integer: string, fractional: string | undefined) {
  const headLength = integer.length % 3;
  const head = integer.slice(0, headLength);
  const parts = head ? [head] : [];
  for (let i = headLength; i < integer.length; i += 3) {
    parts.push(integer.slice(i, i + 3));
  }
  return (
    parts.join(thousandsSeparator) +
    (fractional == null ? "" : fractionalSeparator + fractional)
  );
}

function getCursorPosition(cursor: number, integer: string): number {
  const originalOccurrences =
    integer.match(new RegExp(thousandsSeparator, "g"))?.length ?? 0;

  if (cursor > integer.length) {
    const newThousands = Math.floor((integer.length - originalOccurrences) / 3);

    return cursor - (originalOccurrences - newThousands);
  }

  const integerToCursor = integer.slice(0, cursor);
  const occurrences =
    integerToCursor.match(new RegExp(thousandsSeparator, "g"))?.length ?? 0;
  cursor = cursor - occurrences;
  const cursorMod = (integer.length - originalOccurrences - cursor) % 3;
  return cursor + Math.max(0, Math.ceil((cursor + cursorMod) / 3) - 1);
}
