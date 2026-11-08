"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 104;

/**
 * Pull-to-refresh for touch: only when the page is scrolled to the top.
 */
export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  enabled = true,
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (!enabled) return;

    const atTop = () =>
      (window.scrollY || document.documentElement.scrollTop || 0) <= 2;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || !atTop()) {
        tracking.current = false;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? 0;
      tracking.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || refreshingRef.current) return;
      if (!atTop()) {
        tracking.current = false;
        pullRef.current = 0;
        setPull(0);
        return;
      }

      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }

      const damped = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = damped;
      setPull(damped);
      if (damped > 10) e.preventDefault();
    };

    const onEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const distance = pullRef.current;
      pullRef.current = 0;
      setPull(0);

      if (distance < THRESHOLD || refreshingRef.current) return;

      setRefreshing(true);
      void Promise.resolve(onRefreshRef.current()).finally(() => {
        setRefreshing(false);
      });
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);

    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  return {
    pull,
    refreshing,
    ready: pull >= THRESHOLD,
    indicatorHeight: refreshing ? 52 : pull,
  };
}
