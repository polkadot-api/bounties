import { CheckCircle, Copy } from "lucide-react";
import { PropsWithChildren, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { CopyBinaryIcon } from "./Icons";

export const CopyText: React.FC<
  PropsWithChildren<{
    text: string;
    disabled?: boolean;
    className?: string;
    binary?: boolean;
  }>
> = ({ text, className, children, binary = false, disabled = false }) => {
  const [copied, setCopied] = useState(false);
  const copy = async (evt: React.MouseEvent) => {
    if (disabled) return;
    evt.stopPropagation();

    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 1000);
    }
  }, [copied]);

  return (
    <button
      aria-label={binary ? "copy binary" : "copy"}
      disabled={disabled || copied}
      className={twMerge(className, disabled ? "opacity-50" : "")}
      type="button"
      onClick={copy}
      tabIndex={-1}
    >
      {copied ? (
        <CheckCircle size={16} className="text-green-500 dark:text-green-300" />
      ) : (
        children ?? (binary ? <CopyBinaryIcon size={16} /> : <Copy size={16} />)
      )}
    </button>
  );
};
