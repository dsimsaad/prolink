"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ApiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: unknown }
  | { kind: "auth_error" }
  | { kind: "network_error"; detail: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TIMEOUT_MS = 60_000;

export default function StatusPage() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });

  const executeCheck = useCallback(async () => {
    if (!API_URL) {
      setApiState({
        kind: "network_error",
        detail: "NEXT_PUBLIC_API_URL is not configured.",
      });
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // getSession() here is client-side token retrieval only (not an auth decision).
      const token = session?.access_token;
      if (!token) {
        setApiState({ kind: "auth_error" });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          setApiState({ kind: "ok", data });
        } else if (res.status === 401) {
          setApiState({ kind: "auth_error" });
        } else {
          setApiState({
            kind: "network_error",
            detail: `HTTP ${res.status} ${res.statusText}`,
          });
        }
      } catch (err) {
        clearTimeout(timer);
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        setApiState({
          kind: "network_error",
          detail: isAbort
            ? "Request timed out after 60 seconds."
            : err instanceof Error
              ? `Network or CORS error: ${err.message}`
              : "Unknown network error.",
        });
      }
    } catch (err) {
      setApiState({
        kind: "network_error",
        detail:
          err instanceof Error ? err.message : "Failed to read auth session.",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void executeCheck();
    }, 0);
    return () => clearTimeout(timer);
  }, [executeCheck]);

  const handleManualCheck = () => {
    setApiState({ kind: "loading" });
    void executeCheck();
  };

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "64px auto",
        padding: "0 24px",
        fontFamily: "inherit",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        API Connectivity Status
      </h1>
      <p style={{ color: "var(--muted, #666)", marginBottom: 32, fontSize: 14 }}>
        Tests the connection to the ProLink Core Engine API using your current
        session token.
      </p>

      {/* Target URL row */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted, #666)" }}>
          Target:{" "}
        </span>
        <code style={{ fontSize: 13 }}>
          {API_URL ? `${API_URL}/me` : "⚠ NEXT_PUBLIC_API_URL not set"}
        </code>
      </div>

      {/* Status card */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border, #e5e7eb)",
          background: statusBg(apiState),
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span aria-hidden>{statusIcon(apiState)}</span>
          <span>{statusTitle(apiState)}</span>
        </div>
        {apiState.kind === "network_error" && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>
            {apiState.detail}
          </p>
        )}
        {apiState.kind === "ok" && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#166534" }}>
            JWT validated. Sub and role received (not shown for security).
          </p>
        )}
        {apiState.kind === "auth_error" && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#92400e" }}>
            The API returned 401. Either the JWT is invalid, expired, or the
            API SUPABASE_URL is misconfigured.
          </p>
        )}
      </div>

      <button
        onClick={handleManualCheck}
        disabled={apiState.kind === "loading"}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          background: "var(--forest, #166534)",
          color: "white",
          border: "none",
          cursor: apiState.kind === "loading" ? "wait" : "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {apiState.kind === "loading" ? "Checking…" : "Re-check"}
      </button>
    </div>
  );
}

function statusBg(s: ApiState) {
  if (s.kind === "ok") return "#f0fdf4";
  if (s.kind === "auth_error") return "#fffbeb";
  if (s.kind === "network_error") return "#fef2f2";
  return "var(--background, #fff)";
}

function statusIcon(s: ApiState) {
  if (s.kind === "loading") return "⏳";
  if (s.kind === "ok") return "✅";
  if (s.kind === "auth_error") return "🔒";
  if (s.kind === "network_error") return "❌";
  return "⚪";
}

function statusTitle(s: ApiState) {
  if (s.kind === "idle") return "Not checked yet";
  if (s.kind === "loading") return "Checking…";
  if (s.kind === "ok") return "OK — API is reachable and JWT is valid";
  if (s.kind === "auth_error") return "401 — Authentication failed";
  if (s.kind === "network_error") return "Network or CORS error";
}
