import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/utils/auth';
import { getProfessionalState } from '@/utils/professional';
import { PortalLoader } from '@/components/portal/portal-loader';
export const metadata = { title: 'Admin Dashboard | ProLink' };
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
 const { user, profile } = await requireUser('/admin');
 if (profile?.role !== 'admin') redirect('/user');
 const { slug = [] } = await params;
 if (slug.length > 1) notFound();
 if (slug[0] && !["overview","users","verification","jobs","matching"].includes(slug[0])) notFound();
 const pro = await getProfessionalState();
 return <PortalLoader role="admin" user={{ id: user.id, name: profile?.full_name || user.email?.split('@')[0] || 'User', email: user.email || '' }} professionalState={pro.state} />;
}
