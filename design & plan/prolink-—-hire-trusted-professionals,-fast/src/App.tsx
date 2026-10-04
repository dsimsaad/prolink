import React, { useEffect } from 'react';
import { useMarketplace, marketplaceStore } from './store/marketplaceStore';

// Shells
import { GuestShell } from './components/layout/GuestShell';
import { CustomerShell } from './components/layout/CustomerShell';
import { ProfessionalShell } from './components/layout/ProfessionalShell';
import { AdminShell } from './components/layout/AdminShell';
import { DevToolbar } from './components/layout/DevToolbar';
import { ToastContainer } from './components/ui/ToastContainer';
import { CompareDrawer } from './components/layout/CompareDrawer';

// Pages - Public & Auth
import { GuestHome } from './pages/public/GuestHome';
import { CustomerHome } from './pages/public/CustomerHome';
import { SignInPage } from './pages/auth/SignInPage';
import { JoinPage } from './pages/auth/JoinPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AdminSignInPage } from './pages/auth/AdminSignInPage';

// Pages - Customer
import { CustomerOverview } from './pages/customer/CustomerOverview';
import { PostJobPage } from './pages/customer/PostJobPage';
import { MyJobsPage } from './pages/customer/MyJobsPage';
import { CustomerJobDetails } from './pages/customer/CustomerJobDetails';

// Pages - Professional
import { ProOverview } from './pages/professional/ProOverview';
import { JobFeedPage } from './pages/professional/JobFeedPage';
import { ProJobDetailsOfferComposer } from './pages/professional/ProJobDetailsOfferComposer';
import { MyOffersPage } from './pages/professional/MyOffersPage';
import { ProActiveJobsPage } from './pages/professional/ProActiveJobsPage';

// Pages - Admin
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVerificationQueue } from './pages/admin/AdminVerificationQueue';
import { AdminJobsOffersPage } from './pages/admin/AdminJobsOffersPage';
import { AdminMatchingAIPage } from './pages/admin/AdminMatchingAIPage';

// Placeholder fallback page
import { PlaceholderPage } from './pages/placeholder/PlaceholderPage';

export default function App() {
  const { currentRole, currentPath, currentUser } = useMarketplace();

  // Normalize path
  const path = currentPath.split('?')[0] || '/';

  // Role routing enforcement:
  // If professional visits '/', redirect to /pro/overview
  // If admin visits '/', redirect to /admin/overview
  useEffect(() => {
    if (path === '/') {
      if (currentRole === 'professional') {
        marketplaceStore.navigate('/pro/overview');
      } else if (currentRole === 'admin') {
        marketplaceStore.navigate('/admin/overview');
      }
    }
  }, [path, currentRole]);

  // Auth pages (rendered without persistent shell)
  if (path === '/sign-in') {
    return (
      <>
        <SignInPage />
        <DevToolbar />
        <ToastContainer />
      </>
    );
  }

  if (path === '/join') {
    return (
      <>
        <JoinPage />
        <DevToolbar />
        <ToastContainer />
      </>
    );
  }

  if (path === '/forgot-password') {
    return (
      <>
        <ForgotPasswordPage />
        <DevToolbar />
        <ToastContainer />
      </>
    );
  }

  if (path === '/admin/login') {
    return (
      <>
        <AdminSignInPage />
        <DevToolbar />
        <ToastContainer />
      </>
    );
  }

  // ==================== ADMIN SHELL ====================
  if (currentRole === 'admin') {
    let content: React.ReactNode;
    if (path === '/admin/overview' || path === '/') {
      content = <AdminOverview />;
    } else if (path === '/admin/users') {
      content = <AdminUsersPage />;
    } else if (path === '/admin/verification') {
      content = <AdminVerificationQueue />;
    } else if (path === '/admin/jobs') {
      content = <AdminJobsOffersPage />;
    } else if (path === '/admin/matching') {
      content = <AdminMatchingAIPage />;
    } else {
      // Dynamic placeholder
      const pageTitle = path.replace('/admin/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      content = (
        <PlaceholderPage
          title={`Admin: ${pageTitle}`}
          description={`System administration and governance interface for ${pageTitle}.`}
          breadcrumb={['ProLink', 'Admin Console', pageTitle]}
          type="table"
        />
      );
    }

    return (
      <AdminShell>
        {content}
        <DevToolbar />
        <ToastContainer />
      </AdminShell>
    );
  }

  // ==================== PROFESSIONAL SHELL ====================
  if (currentRole === 'professional') {
    let content: React.ReactNode;
    if (path === '/pro/overview' || path === '/') {
      content = <ProOverview />;
    } else if (path === '/pro/feed') {
      content = <JobFeedPage />;
    } else if (path.startsWith('/pro/feed/')) {
      const jobId = path.replace('/pro/feed/', '');
      content = <ProJobDetailsOfferComposer jobId={jobId} />;
    } else if (path === '/pro/offers') {
      content = <MyOffersPage />;
    } else if (path === '/pro/active') {
      content = <ProActiveJobsPage />;
    } else {
      const pageTitle = path.replace('/pro/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      content = (
        <PlaceholderPage
          title={`Pro: ${pageTitle}`}
          description={`Workspace tools for ${pageTitle}. Manage client bookings, track revenue, and update your catalog.`}
          breadcrumb={['ProLink', 'Professional Console', pageTitle]}
          type="cards"
        />
      );
    }

    return (
      <ProfessionalShell>
        {content}
        <DevToolbar />
        <ToastContainer />
      </ProfessionalShell>
    );
  }

  // ==================== CUSTOMER SHELL ====================
  if (currentRole === 'customer') {
    let content: React.ReactNode;
    if (path === '/') {
      content = <CustomerHome />;
    } else if (path === '/customer/overview') {
      content = <CustomerOverview />;
    } else if (path === '/customer/post-job') {
      content = <PostJobPage />;
    } else if (path === '/customer/jobs') {
      content = <MyJobsPage />;
    } else if (path.startsWith('/customer/jobs/')) {
      const jobId = path.replace('/customer/jobs/', '');
      content = <CustomerJobDetails jobId={jobId} />;
    } else {
      const pageTitle = path.replace('/customer/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      content = (
        <PlaceholderPage
          title={`Customer: ${pageTitle}`}
          description={`Customer account module for ${pageTitle}.`}
          breadcrumb={['ProLink', 'Customer Portal', pageTitle]}
          type="cards"
        />
      );
    }

    return (
      <CustomerShell>
        {content}
        <CompareDrawer />
        <DevToolbar />
        <ToastContainer />
      </CustomerShell>
    );
  }

  // ==================== GUEST SHELL ====================
  let guestContent: React.ReactNode;
  if (path === '/') {
    guestContent = <GuestHome />;
  } else if (path === '/customer/post-job') {
    guestContent = <PostJobPage />;
  } else if (path === '/search' || path.startsWith('/categories') || path.startsWith('/category/')) {
    guestContent = (
      <PlaceholderPage
        type="search"
      />
    );
  } else {
    // All other footer and nav links (about, terms, privacy, trust, fees, etc.)
    const cleanTitle = path.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Overview';
    guestContent = (
      <PlaceholderPage
        title={cleanTitle}
        description={`Learn more about ProLink ${cleanTitle}.`}
        breadcrumb={['ProLink', cleanTitle]}
        type="cards"
      />
    );
  }

  return (
    <GuestShell>
      {guestContent}
      <DevToolbar />
      <ToastContainer />
    </GuestShell>
  );
}
