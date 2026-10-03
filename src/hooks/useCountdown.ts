import { useEffect, useState } from "react";

export function useCountdown(deadlineAt: string) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadlineAt).getTime() - Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs(new Date(deadlineAt).getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  return Math.max(0, remainingMs);
}
