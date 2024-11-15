import { FC, PropsWithChildren } from "react";

export const BountyDetail: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <div className="flex gap-1 items-center">
    <span className="text-card-foreground/80 font-bold">{title}:</span>
    <span>{children}</span>
  </div>
);
