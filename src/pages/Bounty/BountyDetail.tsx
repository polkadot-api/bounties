import { FC, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

export const BountyDetail: FC<
  PropsWithChildren<{ title: string; className?: string }>
> = ({ title, children, className }) => (
  <div className={twMerge("flex gap-1 items-center", className)}>
    <span className="text-card-foreground/80 font-bold">{title}:</span>
    <span>{children}</span>
  </div>
);

export const BountyDetailGroup: FC<PropsWithChildren> = ({ children }) => (
  <div className="flex gap-2 border border-border rounded p-2 flex-col">
    {children}
  </div>
);
