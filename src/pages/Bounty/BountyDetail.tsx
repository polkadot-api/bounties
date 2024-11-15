import { FC, PropsWithChildren } from "react";

export const BountyDetail: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <p className="flex gap-1">
    <span className="text-card-foreground/80 font-bold">{title}:</span>
    <span>{children}</span>
  </p>
);
