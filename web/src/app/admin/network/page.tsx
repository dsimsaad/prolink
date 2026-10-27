import { Radio } from "lucide-react";

export default function AdminNetworkPlaceholderPage() {
  return (
    <div className="rounded-xl border border-[#DCE8E0] bg-white p-8 text-center shadow-2xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F4EA] text-[#0F6B3E]">
        <Radio className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-[#0C2A1B]">
        Network Health Module — Coming Soon
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#34453B]">
        The Computer Networks telemetry and socket diagnostics module is not connected yet. Once enabled, this view will display real-time WebSocket heartbeat metrics, latency histograms, and connection pool health.
      </p>
    </div>
  );
}
