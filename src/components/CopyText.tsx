import { CopyText as OGCopyText } from "@polkadot-api/react-components";
import { CheckCircle, Copy } from "lucide-react";
import { PropsWithChildren } from "react";
import { CopyBinaryIcon } from "./Icons";

export const CopyText: React.FC<
  PropsWithChildren<{
    text: string;
    disabled?: boolean;
    className?: string;
    binary?: boolean;
  }>
> = ({ children, binary = false, ...rest }) => {
  return (
    <OGCopyText
      copiedIndicator={
        <CheckCircle size={16} className="text-green-500 dark:text-green-300" />
      }
      {...rest}
    >
      {children ?? (binary ? <CopyBinaryIcon size={16} /> : <Copy size={16} />)}
    </OGCopyText>
  );
};
