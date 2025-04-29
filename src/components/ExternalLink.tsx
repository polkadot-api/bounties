import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { FC, PropsWithChildren } from "react";

export const ExternalLink: FC<
  PropsWithChildren<{
    href: string;
  }>
> = ({ href, children }) => (
  <a
    className="underline inline-flex gap-1 items-center"
    href={href}
    target="_blank"
  >
    <span>{children}</span>
    <ExternalLinkIcon className="inline-block" size={16} />
  </a>
);
