"use client";

import { Check, Home, Wrench } from "lucide-react";

interface AuthVisualPanelProps {
  spinCount?: number;
  isLoading?: boolean;
}

export function AuthVisualPanel({
  spinCount = 0,
  isLoading = false,
}: AuthVisualPanelProps) {
  const isSpinning = spinCount > 0 || isLoading;

  return (
    <aside
      className="auth-visual-panel"
      aria-label="ProLink platform visual"
    >
      {/* Ambient background glows */}
      <div className="auth-visual-bg" aria-hidden="true" />
      <div className="auth-visual-grid-dots" aria-hidden="true" />

      <div className="auth-visual-content">
        {/* Center glowing geometric emblem */}
        <div className="auth-emblem-stage" aria-hidden="true">
          {/* Radial backdrop glow */}
          <div
            key={`glow-${spinCount}`}
            className={`auth-emblem-glow ${
              isLoading ? "is-loading" : isSpinning ? "is-pulsing" : ""
            }`}
          />

          {/* 360-degree orbital rotor container */}
          <div
            key={`rotor-${spinCount}`}
            className={`auth-orbit-rotor ${
              isLoading ? "is-loading" : isSpinning ? "is-spinning" : ""
            }`}
          >
            {/* Central SVG Loops */}
            <svg
              className="auth-emblem-svg"
              viewBox="0 0 320 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="proLoopGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#4ADE80" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#0F6B3E" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="proLoopGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.9" />
                  <stop offset="55%" stopColor="#4ADE80" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
                </linearGradient>
                <filter id="proNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 4 Intersecting elliptical loops forming flower / propeller star */}
              <g filter="url(#proNeonGlow)">
                <ellipse
                  cx="160"
                  cy="160"
                  rx="106"
                  ry="36"
                  transform="rotate(22 160 160)"
                  stroke="url(#proLoopGrad1)"
                  strokeWidth="2.2"
                  fill="none"
                />
                <ellipse
                  cx="160"
                  cy="160"
                  rx="106"
                  ry="36"
                  transform="rotate(67 160 160)"
                  stroke="url(#proLoopGrad2)"
                  strokeWidth="2.2"
                  fill="none"
                />
                <ellipse
                  cx="160"
                  cy="160"
                  rx="106"
                  ry="36"
                  transform="rotate(112 160 160)"
                  stroke="url(#proLoopGrad1)"
                  strokeWidth="2.2"
                  fill="none"
                />
                <ellipse
                  cx="160"
                  cy="160"
                  rx="106"
                  ry="36"
                  transform="rotate(157 160 160)"
                  stroke="url(#proLoopGrad2)"
                  strokeWidth="2.2"
                  fill="none"
                />
              </g>

              {/* Central glowing aperture / vortex core */}
              <circle
                cx="160"
                cy="160"
                r="22"
                stroke="#86EFAC"
                strokeWidth="2.6"
                fill="#062227"
                filter="url(#proNeonGlow)"
              />
              <circle
                cx="160"
                cy="160"
                r="13"
                stroke="#4ADE80"
                strokeWidth="1.4"
                fill="#04181C"
                opacity="0.8"
              />
            </svg>

            {/* Floating Frosted Glass Circular Badges */}
            {/* Top-Right Badge: Checkmark */}
            <div className="auth-badge-node node-top" title="Verified Quality">
              <span className="auth-badge-icon">
                <Check className="h-4 w-4 text-[#6EE7B7]" strokeWidth={2.6} />
              </span>
            </div>

            {/* Left Badge: Home */}
            <div className="auth-badge-node node-left" title="Household Services">
              <span className="auth-badge-icon">
                <Home className="h-4 w-4 text-[#A7F3D0]" strokeWidth={2} />
              </span>
            </div>

            {/* Right Badge: Wrench */}
            <div className="auth-badge-node node-right" title="Skilled Professionals">
              <span className="auth-badge-icon">
                <Wrench className="h-4 w-4 text-[#A7F3D0]" strokeWidth={2} />
              </span>
            </div>

            {/* Floating luminous particle dots */}
            <span className="auth-particle particle-1" />
            <span className="auth-particle particle-2" />
            <span className="auth-particle particle-3" />
            <span className="auth-particle particle-4" />
            <span className="auth-particle particle-5" />
          </div>
        </div>

        {/* Hero Copy */}
        <div className="auth-hero-copy">
          <h2 className="auth-hero-title">
            Connecting you with the<br />
            <span className="auth-hero-highlight">best local professionals.</span>
          </h2>
          <p className="auth-hero-subtitle">
            Simple, secure, and reliable. Empowering your household and pro services, every day.
          </p>
        </div>
      </div>
    </aside>
  );
}
