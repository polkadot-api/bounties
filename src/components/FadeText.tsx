import {
  FC,
  PropsWithChildren,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { twMerge } from "tailwind-merge";

export const FadeText: FC<PropsWithChildren<{ className?: string }>> = ({
  className,
  children: value,
}) => {
  const [display, setDisplay] = useState<{
    value: ReactNode;
    state: "in" | "out";
  }>({
    value,
    state: "in",
  });
  const waitingTransition = useRef<number | null>(null);

  const beginTransition = () => {
    if (waitingTransition.current) return;
    const now = Date.now();
    waitingTransition.current = now;
    // Depending on react rendering sheningans, it might happen that `onTransitionEnd` event is never triggered
    // set up a timeout to kickstart the transition
    setTimeout(() => {
      if (waitingTransition.current === now) {
        setDisplay((d) => ({
          value: d.value,
          state: d.state === "in" ? "out" : "in",
        }));
      }
    }, 600);
  };

  const onTransitionEnd = () => {
    waitingTransition.current = null;

    if (display.state === "out") {
      beginTransition();
      setDisplay({
        value,
        state: "in",
      });
    } else if (display.value !== value) {
      beginTransition();
      setDisplay((d) => ({
        value: d.value,
        state: "out",
      }));
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      if (waitingTransition.current || display.state === "out") return;
      beginTransition();
      setDisplay(({ value }) => ({
        value,
        state: "out",
      }));
    });
  }, [value]);

  return (
    <span
      className={twMerge(
        "transition-opacity duration-500",
        display.state === "out" && "opacity-0",
        className
      )}
      onTransitionEnd={onTransitionEnd}
    >
      {display.value}
    </span>
  );
};
