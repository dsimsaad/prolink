"use client";
import type { ProfessionalState } from "@/utils/professional";
import PortalApp from "./portal-app";

export interface PortalProps {
  role: "admin" | "customer";
  user: { id: string; name: string; email: string };
  professionalState: ProfessionalState;
}

export function PortalLoader(props: PortalProps) {
  return <PortalApp {...props} />;
}
