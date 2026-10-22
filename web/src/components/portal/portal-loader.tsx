"use client";
import type { ProfessionalState } from '@/utils/professional';
import dynamic from 'next/dynamic';
export interface PortalProps { role: 'admin' | 'customer'; user: { id: string; name: string; email: string }; professionalState: ProfessionalState }
const Portal = dynamic(() => import('./portal-app'), { ssr: false, loading: () => <p className="container">Loading your dashboard…</p> });
export function PortalLoader(props: PortalProps) { return <Portal {...props} />; }
