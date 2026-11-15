"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ApiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: unknown }
  | { kind: "auth_error" }
  | { kind: "network_error"; detail: string };

interface LiveJobEvent {
  job_id: string;
  from_status: string;
  to_status: string;
  time: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const STATUS_FEED_URL = process.env.NEXT_PUBLIC_STATUS_FEED_URL ?? "";
const TIMEOUT_MS = 60_000;
const MAX_EVENTS = 50;
const MAX_RECONNECT_DELAY_MS = 30_000;

export default function StatusPage() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });
  const [wsStatus, setWsStatus] = useState<"connected" | "offline">("offline");
  const [liveEvents, setLiveEvents] = useState<LiveJobEvent[]>([]);

  const reconnectDelayRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Core API Status Check
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

  // 2. Realtime WebSocket Feed Connection (only when NEXT_PUBLIC_STATUS_FEED_URL is configured)
  useEffect(() => {
    if (!STATUS_FEED_URL) {
      return;
    }

    let ws: WebSocket | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;

      try {
        ws = new WebSocket(STATUS_FEED_URL);

        ws.onopen = () => {
          if (isDisposed) {
            ws?.close();
            return;
          }
          setWsStatus("connected");
          reconnectDelayRef.current = 1000;
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw && typeof raw === "object" && "job_id" in raw) {
              const parsed: LiveJobEvent = {
                job_id: String(raw.job_id || "unknown"),
                from_status: String(raw.from_status || "-"),
                to_status: String(raw.to_status || "-"),
                time: String(raw.time || new Date().toISOString()),
              };
              setLiveEvents((prev) => [parsed, ...prev.slice(0, MAX_EVENTS - 1)]);
            }
          } catch {
            // Silently ignore malformed messages without crashing
          }
        };

        ws.onclose = () => {
          setWsStatus("offline");
          if (!isDisposed) {
            const delay = reconnectDelayRef.current;
            reconnectTimerRef.current = setTimeout(() => {
              reconnectDelayRef.current = Math.min(
                reconnectDelayRef.current * 1.5,
                MAX_RECONNECT_DELAY_MS
              );
              connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setWsStatus("offline");
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleManualCheck = () => {
    setApiState({ kind: "loading" });
    void executeCheck();
  };

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "64px auto",
        padding: "0 24px",
        fontFamily: "inherit",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        System & Network Status
      </h1>
      <p style={{ color: "var(--muted, #666)", marginBottom: 32, fontSize: 14 }}>
        Telemetry and connectivity status for ProLink services.
      </p>

      {/* Live Status Feed Section */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border, #e5e7eb)",
          background: wsStatus === "connected" ? "#f0fdf4" : "#f9fafb",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Live Job Status Feed</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {STATUS_FEED_URL ? "Streaming live status broadcast" : "Status feed"}
            </div>
          </div>
          {STATUS_FEED_URL ? (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: wsStatus === "connected" ? "#166534" : "#9ca3af",
                color: "white",
              }}
            >
              {wsStatus === "connected" ? "● Connected" : "○ Offline"}
            </span>
          ) : (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: "#e5e7eb",
                color: "#4b5563",
              }}
            >
              Demo only
            </span>
          )}
        </div>

        {!STATUS_FEED_URL ? (
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            The live feed is available in the local demo only.
          </p>
        ) : wsStatus === "connected" ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 8 }}>
              Demo events:
            </div>
            {liveEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>
                Listening for status updates...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {liveEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "white",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 13,
                      border: "1px solid #dcfce7",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span><strong>{evt.job_id}:</strong> {evt.from_status} → <strong>{evt.to_status}</strong></span>
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{evt.time.includes("T") ? evt.time.split("T")[1] : evt.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Status feed server is currently offline. Retrying automatically...
          </p>
        )}
      </div>

      {/* Target URL row */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted, #666)" }}>
          Target API:{" "}
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
        {apiState.kind === "loading" ? "Checking…" : "Re-check API"}
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
