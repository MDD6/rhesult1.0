"use client";

import { useMemo, useState } from "react";

export function useTabs<T>(items: T[], initialIndex = 0) {
  const safeInitial = Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0));
  const [index, setIndex] = useState(safeInitial);

  const current = useMemo(() => items[index], [items, index]);

  const next = () => setIndex((prev) => (prev + 1) % items.length);
  const prev = () => setIndex((prev) => (prev - 1 + items.length) % items.length);

  return {
    items,
    index,
    current,
    setIndex,
    next,
    prev,
  };
}
