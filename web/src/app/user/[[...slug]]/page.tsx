import { notFound } from 'next/navigation';
import { requireUser } from '@/utils/auth';
import { getProfessionalState } from '@/utils/professional';
import { PortalLoader } from '@/components/portal/portal-loader';
export const metadata = { title: 'User Dashboard | ProLink' };
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
 const { user, profile } = await requireUser('/user');
 
 const { slug = [] } = await params;
 if (slug.length > 2 || (slug.length === 2 && slug[0] !== 'jobs')) notFound();
 if (slug[0] && !["overview","jobs","post-job"].includes(slug[0])) notFound();
 const pro = await getProfessionalState();
 return <PortalLoader role="customer" user={{ id: user.id, name: profile?.full_name || user.email?.split('@')[0] || 'User', email: user.email || '' }} professionalState={pro.state} />;
}
