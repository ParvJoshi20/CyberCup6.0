"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getLocalDataSnapshot, parseLocalData, subscribeToLocalData } from "@/lib/data/local-data";

export function useLocalData() {
  const snapshot = useSyncExternalStore(subscribeToLocalData, getLocalDataSnapshot, () => null);
  return useMemo(() => snapshot === null
    ? { status: "loading" as const, chats: [] }
    : parseLocalData(snapshot), [snapshot]);
}
