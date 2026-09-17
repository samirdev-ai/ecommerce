"use client";
import { useEffect, useState } from "react";

export function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetIso).getTime() - Date.now()),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: remaining <= 0 };
}
