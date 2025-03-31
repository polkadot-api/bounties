import { FC, PropsWithChildren } from "react";
import { Spinner } from "./Icons";
import { useStateObservable } from "@react-rxjs/core";
import { hasConnected$ } from "@/chain";
import { twMerge } from "tailwind-merge";

export const Loading: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  const hasConnected = useStateObservable(hasConnected$);

  return (
    <div
      className={twMerge(
        "flex items-center justify-center gap-2 text-muted-foreground",
        className
      )}
    >
      <Spinner />
      {hasConnected ? children : "Connecting"}
    </div>
  );
};
