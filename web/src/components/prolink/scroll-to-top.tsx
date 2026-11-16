"use client";

import { useEffect, useState, useRef } from "react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button once user scrolls down at least 250px
      if (window.scrollY > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleUserInterrupt = () => {
      // Allow manual scroll to smoothly break the animation loop if user intervenes
      isAnimatingRef.current = false;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchstart", handleUserInterrupt, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchstart", handleUserInterrupt);
    };
  }, []);

  const scrollToTop = () => {
    if (typeof window === "undefined") return;

    const startPosition = window.scrollY || document.documentElement.scrollTop || 0;
    if (startPosition <= 0) return;

    // Temporarily set scrollBehavior to auto during custom animation to prevent conflict
    const docEl = document.documentElement;
    const prevBehavior = docEl.style.scrollBehavior;
    docEl.style.scrollBehavior = "auto";

    // Cinematic, very slow and gradual glide (~1.5s – 2.0s)
    const duration = Math.min(2000, Math.max(1500, Math.sqrt(startPosition) * 35));
    let startTime: number | null = null;
    isAnimatingRef.current = true;

    // Cubic ease-in-out curve for gentle acceleration and graceful deceleration
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const cleanup = () => {
      isAnimatingRef.current = false;
      docEl.style.scrollBehavior = prevBehavior;
    };

    const step = (currentTime: number) => {
      if (!isAnimatingRef.current) {
        cleanup();
        return;
      }
      if (!startTime) startTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      const nextY = Math.max(0, startPosition * (1 - eased));
      window.scrollTo(0, nextY);

      if (progress < 1 && isAnimatingRef.current) {
        requestAnimationFrame(step);
      } else {
        window.scrollTo(0, 0);
        cleanup();
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Back to top"
      className={`scroll-to-top ${isVisible ? "visible" : ""}`}
    >
      <svg
        className="scroll-to-top-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
      <span className="sr-only">Back to top</span>
    </button>
  );
}
