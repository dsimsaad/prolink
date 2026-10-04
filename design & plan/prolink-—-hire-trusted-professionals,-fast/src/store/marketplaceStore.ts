import { useState, useEffect } from 'react';
import { User, UserRole, Job, Offer } from '../types';
import { MOCK_USERS } from '../data/mockData';
import { api } from '../services/api';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export interface PostJobDraft {
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  city: string;
  area: string;
  urgency: 'urgent' | 'today' | 'flexible';
  dateScheduled: string;
  budgetMin: number;
  budgetMax: number;
  photos?: string[];
}

interface MarketplaceState {
  currentRole: UserRole;
  currentUser: User | null;
  currentPath: string;
  queryParams: Record<string, string>;
  postJobDraft: PostJobDraft | null;
  compareOfferIds: string[];
  compareDrawerOpen: boolean;
  toasts: ToastItem[];
  unreadNotifsCount: number;
}

// Initial state
const defaultCustomer = MOCK_USERS.find(u => u.id === 'cust-1') || MOCK_USERS[0];
const defaultPro = MOCK_USERS.find(u => u.id === 'pro-1') || MOCK_USERS[12];
const defaultAdmin = MOCK_USERS.find(u => u.id === 'admin-1') || MOCK_USERS[MOCK_USERS.length - 1];

let state: MarketplaceState = {
  currentRole: 'guest',
  currentUser: null,
  currentPath: window.location.pathname || '/',
  queryParams: Object.fromEntries(new URLSearchParams(window.location.search)),
  postJobDraft: null,
  compareOfferIds: [],
  compareDrawerOpen: false,
  toasts: [],
  unreadNotifsCount: 2
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export const marketplaceStore = {
  getState() {
    return state;
  },

  setRole(role: UserRole) {
    let user: User | null = null;
    let nextPath = state.currentPath;

    if (role === 'guest') {
      user = null;
      if (nextPath.startsWith('/customer') || nextPath.startsWith('/pro') || nextPath.startsWith('/admin')) {
        nextPath = '/';
      }
    } else if (role === 'customer') {
      user = defaultCustomer;
      if (nextPath === '/sign-in' || nextPath === '/join' || nextPath.startsWith('/pro') || nextPath.startsWith('/admin')) {
        nextPath = '/customer/overview';
      }
    } else if (role === 'professional') {
      user = defaultPro;
      if (nextPath === '/' || nextPath === '/sign-in' || nextPath.startsWith('/customer') || nextPath.startsWith('/admin')) {
        nextPath = '/pro/overview';
      }
    } else if (role === 'admin') {
      user = defaultAdmin;
      if (nextPath === '/' || nextPath === '/sign-in' || nextPath.startsWith('/customer') || nextPath.startsWith('/pro')) {
        nextPath = '/admin/overview';
      }
    }

    state = {
      ...state,
      currentRole: role,
      currentUser: user,
      currentPath: nextPath
    };
    marketplaceStore.updateUrl(nextPath);
    notify();
  },

  setCurrentUser(user: User | null) {
    state = { ...state, currentUser: user };
    notify();
  },

  navigate(path: string, query?: Record<string, string>) {
    state = {
      ...state,
      currentPath: path,
      queryParams: query || {}
    };
    marketplaceStore.updateUrl(path, query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify();
  },

  updateUrl(path: string, query?: Record<string, string>) {
    try {
      const q = query && Object.keys(query).length > 0
        ? '?' + new URLSearchParams(query).toString()
        : '';
      window.history.pushState({}, '', `${path}${q}`);
    } catch (e) {
      // In sandbox/iframe fallback
    }
  },

  setPostJobDraft(draft: PostJobDraft | null) {
    state = { ...state, postJobDraft: draft };
    notify();
  },

  toggleCompareOffer(offerId: string) {
    let nextIds = [...state.compareOfferIds];
    if (nextIds.includes(offerId)) {
      nextIds = nextIds.filter(id => id !== offerId);
    } else {
      if (nextIds.length >= 3) {
        marketplaceStore.addToast('Maximum 3 offers', 'You can compare up to 3 offers side-by-side.', 'info');
        return;
      }
      nextIds.push(offerId);
    }
    state = {
      ...state,
      compareOfferIds: nextIds,
      compareDrawerOpen: nextIds.length > 0
    };
    notify();
  },

  setCompareDrawerOpen(open: boolean) {
    state = { ...state, compareDrawerOpen: open };
    notify();
  },

  clearCompare() {
    state = { ...state, compareOfferIds: [], compareDrawerOpen: false };
    notify();
  },

  addToast(title: string, message?: string, type: ToastItem['type'] = 'success') {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = { id, title, message, type };
    state = { ...state, toasts: [...state.toasts, newToast] };
    notify();

    setTimeout(() => {
      marketplaceStore.removeToast(id);
    }, 4500);
  },

  removeToast(id: string) {
    state = { ...state, toasts: state.toasts.filter(t => t.id !== id) };
    notify();
  },

  // Simulated live event: after a customer posts a job, simulate 3 offers coming in
  simulateIncomingOffersForJob(jobId: string, jobTitle: string) {
    setTimeout(async () => {
      marketplaceStore.addToast(
        'New offer arrived! ⚡',
        'Ustad Sajid Hussain sent an offer of PKR 3,800 for "' + jobTitle.slice(0, 30) + '..."',
        'info'
      );
      state = { ...state, unreadNotifsCount: state.unreadNotifsCount + 1 };
      notify();
    }, 3500);

    setTimeout(async () => {
      marketplaceStore.addToast(
        'Best Match offer received! 🌟',
        'Tariq Mehmood (Top Rated, 4.94 ★) sent an offer of PKR 3,400 with arrival in 25 mins.',
        'success'
      );
      state = { ...state, unreadNotifsCount: state.unreadNotifsCount + 1 };
      notify();
    }, 7000);
  },

  resetAllData() {
    api.resetData();
    marketplaceStore.setRole('guest');
    marketplaceStore.navigate('/');
    marketplaceStore.addToast('Demo data reset', 'All jobs, offers, and verifications restored to default state.', 'info');
  }
};

export function useMarketplace() {
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    const listener = () => setSnapshot({ ...state });
    listeners.add(listener);

    const onPopState = () => {
      state = {
        ...state,
        currentPath: window.location.pathname || '/',
        queryParams: Object.fromEntries(new URLSearchParams(window.location.search))
      };
      notify();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return snapshot;
}
