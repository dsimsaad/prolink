"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevPathnameRef = useRef<string | null>(pathname);
  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearTimers() {
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    function startProgress() {
      clearTimers();
      setVisible(true);
      setProgress(20);

      trickleTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = prev < 50 ? 14 : prev < 75 ? 7 : 2.5;
          return Math.min(90, prev + increment);
        });
      }, 160);

      // Safety fallback in case a navigation is cancelled or stays on the same route
      hideTimerRef.current = setTimeout(() => {
        completeProgress();
      }, 8000);
    }

    function completeProgress() {
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
      setProgress(100);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 240);
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const nextUrl = new URL(anchor.href, window.location.href);
        if (nextUrl.origin !== window.location.origin) return;

        const isSamePathAndQuery =
          nextUrl.pathname === window.location.pathname &&
          nextUrl.search === window.location.search;
        if (isSamePathAndQuery) return;

        startProgress();
      } catch {
        // Ignore invalid URLs
      }
    }

    function handleCustomNavigationStart() {
      startProgress();
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener(
      "prolink:navigation-start",
      handleCustomNavigationStart,
    );
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener(
        "prolink:navigation-start",
        handleCustomNavigationStart,
      );
      clearTimers();
    };
  }, []);

  // Complete the progress bar only once the new route has finished loading and rendered
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }

    const startId = setTimeout(() => {
      setVisible(true);
      setProgress(100);
    }, 0);

    const finishId = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);

    return () => {
      clearTimeout(startId);
      clearTimeout(finishId);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="top-progress-container"
      role="progressbar"
      aria-label="Page navigation progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="top-progress-bar"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
