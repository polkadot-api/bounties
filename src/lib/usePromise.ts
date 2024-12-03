import { useEffect, useState } from "react";

export const usePromise = <T>(initFn: () => Promise<T>, defaultValue: T): T => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    initFn().then(setValue);
  }, []);

  return value;
};
