import { useCallback, useState } from "react";

export function useToggle(state = false) {
  const [on, setOn] = useState(state);

  const close = () => setOn(false);
  const toggle = useCallback(() => {
    setOn((o) => !o);
  }, [setOn]);

  return { on, toggle, close, setOn };
}
