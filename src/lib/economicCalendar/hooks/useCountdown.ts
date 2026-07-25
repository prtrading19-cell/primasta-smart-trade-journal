"use client";

import { useState, useEffect, useCallback } from "react";

interface CountdownResult {
  timeLeft: number;
  formattedTime: string;
  isLive: boolean;
  isReleased: boolean;
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

function getTimeLeft(target: Date): number {
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
}

export function useCountdown(targetTime: string | null): CountdownResult {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!targetTime) return 0;
    return getTimeLeft(new Date(targetTime));
  });

  const computeState = useCallback(
    (seconds: number) => ({
      timeLeft: seconds,
      formattedTime: formatTime(seconds),
      isLive: false,
      isReleased: seconds <= 0,
    }),
    []
  );

  useEffect(() => {
    if (!targetTime) {
      setTimeLeft(0);
      return;
    }

    const target = new Date(targetTime);
    const initial = getTimeLeft(target);
    setTimeLeft(initial);

    if (initial <= 0) return;

    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);

    return () => clearInterval(id);
  }, [targetTime]);

  return computeState(timeLeft);
}
