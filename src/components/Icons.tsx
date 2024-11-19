import { Copy, LoaderCircle, LucideProps } from "lucide-react";
import { twMerge } from "tailwind-merge";

export const Spinner = (props: LucideProps) => (
  <LoaderCircle
    {...props}
    className={twMerge("animate-spin", props.className)}
  />
);

export const CopyBinaryIcon = ({ size = 16, ...props }: LucideProps) => (
  <svg
    width={size}
    height={size}
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Copy className="text-current" />
    <text
      x="15"
      y="14.5"
      fontSize="9"
      fill="currentColor"
      className="font-mono font-bold"
      textAnchor="middle"
      dominantBaseline="central"
    >
      0x
    </text>
  </svg>
);
