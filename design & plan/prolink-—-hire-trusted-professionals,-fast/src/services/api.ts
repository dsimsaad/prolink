import { Job, Offer, User, Review, Transaction, VerificationRequest, NotificationItem } from '../types';
import { MOCK_JOBS, MOCK_OFFERS, MOCK_USERS, MOCK_REVIEWS, MOCK_TRANSACTIONS, MOCK_VERIFICATION_REQUESTS, MOCK_NOTIFICATIONS, MOCK_ANALYTICS_MONTHS } from '../data/mockData';

// In-memory session store
let jobsStore: Job[] = [...MOCK_JOBS];
let offersStore: Offer[] = [...MOCK_OFFERS];
let usersStore: User[] = [...MOCK_USERS];
let reviewsStore: Review[] = [...MOCK_REVIEWS];
let transactionsStore: Transaction[] = [...MOCK_TRANSACTIONS];
let verificationsStore: VerificationRequest[] = [...MOCK_VERIFICATION_REQUESTS];
let notificationsStore: NotificationItem[] = [...MOCK_NOTIFICATIONS];

const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // JOBS
  async getJobs(filter?: { category?: string; city?: string; status?: string; customerId?: string }): Promise<Job[]> {
    await delay();
    let result = [...jobsStore];
    if (filter) {
      if (filter.category) result = result.filter(j => j.category.toLowerCase() === filter.category!.toLowerCase());
      if (filter.city) result = result.filter(j => j.city.toLowerCase() === filter.city!.toLowerCase());
      if (filter.status) result = result.filter(j => j.status === filter.status);
      if (filter.customerId) result = result.filter(j => j.customerId === filter.customerId);
    }
    return result;
  },

  async getJobById(id: string): Promise<Job | null> {
    await delay();
    return jobsStore.find(j => j.id === id) || null;
  },

  async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'offersCount' | 'status'>): Promise<Job> {
    await delay(180);
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      offersCount: 0
    };
    jobsStore = [newJob, ...jobsStore];
    return newJob;
  },

  async updateJobStatus(jobId: string, status: Job['status'], updates?: Partial<Job>): Promise<Job> {
    await delay();
    const idx = jobsStore.findIndex(j => j.id === jobId);
    if (idx === -1) throw new Error('Job not found');
    const updated = { ...jobsStore[idx], status, ...updates };
    jobsStore[idx] = updated;
    return updated;
  },

  // OFFERS
  async getOffersForJob(jobId: string): Promise<Offer[]> {
    await delay();
    return offersStore.filter(o => o.jobId === jobId);
  },

  async getOffersForPro(proId: string): Promise<Offer[]> {
    await delay();
    return offersStore.filter(o => o.proId === proId);
  },

  async submitOffer(offerData: Omit<Offer, 'id' | 'status' | 'createdAt'>): Promise<Offer> {
    await delay(160);
    const newOffer: Offer = {
      ...offerData,
      id: `off-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    offersStore = [newOffer, ...offersStore];

    // Update job offer count and status if was 'open'
    const jobIdx = jobsStore.findIndex(j => j.id === offerData.jobId);
    if (jobIdx !== -1) {
      jobsStore[jobIdx].offersCount = (jobsStore[jobIdx].offersCount || 0) + 1;
      if (jobsStore[jobIdx].status === 'open') {
        jobsStore[jobIdx].status = 'offers_received';
      }
    }
    return newOffer;
  },

  async acceptOffer(offerId: string): Promise<{ job: Job; offer: Offer }> {
    await delay(150);
    const offerIdx = offersStore.findIndex(o => o.id === offerId);
    if (offerIdx === -1) throw new Error('Offer not found');
    const acceptedOffer = offersStore[offerIdx];
    acceptedOffer.status = 'accepted';

    // Reject other offers for this job
    offersStore = offersStore.map(o => {
      if (o.jobId === acceptedOffer.jobId && o.id !== offerId) {
        return { ...o, status: 'rejected' };
      }
      return o;
    });

    // Update job to in_progress with hired pro
    const jobIdx = jobsStore.findIndex(j => j.id === acceptedOffer.jobId);
    if (jobIdx === -1) throw new Error('Job not found');

    const updatedJob: Job = {
      ...jobsStore[jobIdx],
      status: 'in_progress',
      selectedOfferId: offerId,
      hiredProId: acceptedOffer.proId,
      hiredProName: acceptedOffer.proName,
      hiredProAvatar: acceptedOffer.proAvatar,
      proWorkLog: {
        status: 'assigned',
        etaMinutes: 25,
        notes: ['Offer accepted. Pro notified to proceed.']
      }
    };
    jobsStore[jobIdx] = updatedJob;

    // Create escrow hold transaction
    transactionsStore = [
      {
        id: `tx-${Date.now()}`,
        jobId: updatedJob.id,
        jobTitle: updatedJob.title,
        customerId: updatedJob.customerId,
        customerName: updatedJob.customerName,
        proId: acceptedOffer.proId,
        proName: acceptedOffer.proName,
        amountPKR: acceptedOffer.totalEstimatePKR,
        platformFeePKR: Math.round(acceptedOffer.totalEstimatePKR * 0.05),
        type: 'escrow_hold',
        status: 'held',
        date: new Date().toISOString().split('T')[0]
      },
      ...transactionsStore
    ];

    return { job: updatedJob, offer: acceptedOffer };
  },

  async updateProWorkLog(jobId: string, workLog: Job['proWorkLog']): Promise<Job> {
    await delay();
    const jobIdx = jobsStore.findIndex(j => j.id === jobId);
    if (jobIdx === -1) throw new Error('Job not found');
    jobsStore[jobIdx] = {
      ...jobsStore[jobIdx],
      proWorkLog: workLog
    };
    return jobsStore[jobIdx];
  },

  async completeJobAndReview(jobId: string, review: { rating: number; tags: string[]; text: string }): Promise<Job> {
    await delay(160);
    const jobIdx = jobsStore.findIndex(j => j.id === jobId);
    if (jobIdx === -1) throw new Error('Job not found');
    const job = jobsStore[jobIdx];

    const completedJob: Job = {
      ...job,
      status: 'completed',
      completedAt: new Date().toISOString(),
      clientReview: {
        ...review,
        createdAt: new Date().toISOString()
      }
    };
    jobsStore[jobIdx] = completedJob;

    // Add review
    if (job.hiredProId) {
      reviewsStore = [
        {
          id: `rev-${Date.now()}`,
          jobId: job.id,
          jobTitle: job.title,
          customerId: job.customerId,
          customerName: job.customerName,
          customerAvatar: job.customerAvatar || '',
          proId: job.hiredProId,
          proName: job.hiredProName || 'Professional',
          rating: review.rating,
          tags: review.tags,
          comment: review.text,
          createdAt: new Date().toISOString(),
          city: job.city
        },
        ...reviewsStore
      ];
    }

    // Release escrow transaction
    transactionsStore = [
      {
        id: `tx-${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        customerId: job.customerId,
        customerName: job.customerName,
        proId: job.hiredProId || '',
        proName: job.hiredProName || '',
        amountPKR: job.budgetMax,
        platformFeePKR: Math.round(job.budgetMax * 0.05),
        type: 'escrow_release',
        status: 'completed',
        date: new Date().toISOString().split('T')[0]
      },
      ...transactionsStore
    ];

    return completedJob;
  },

  // USERS & PROFILES
  async getUsers(role?: string): Promise<User[]> {
    await delay();
    if (!role) return [...usersStore];
    return usersStore.filter(u => u.role === role);
  },

  async getUserById(id: string): Promise<User | null> {
    await delay();
    return usersStore.find(u => u.id === id) || null;
  },

  async updateUserStatus(userId: string, status: User['status']): Promise<User> {
    await delay();
    const idx = usersStore.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    usersStore[idx].status = status;
    return usersStore[idx];
  },

  async registerUser(userData: Partial<User>): Promise<User> {
    await delay(180);
    const newUser: User = {
      id: `${userData.role === 'professional' ? 'pro' : 'cust'}-${Date.now()}`,
      name: userData.name || 'New Member',
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || 'customer',
      avatar: userData.avatar || (userData.role === 'professional' ? '/src/assets/images/pro_electrician_headshot_1791024696030.jpg' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
      city: userData.city || 'Islamabad',
      area: userData.area || 'F-7',
      status: userData.role === 'professional' ? 'pending' : 'active',
      joinedDate: new Date().toISOString().split('T')[0],
      totalSpentPKR: 0,
      jobsPosted: 0,
      savedProIds: [],
      ...userData
    };
    usersStore = [newUser, ...usersStore];

    // If professional, create verification queue entry
    if (userData.role === 'professional') {
      const vr: VerificationRequest = {
        id: `vr-${Date.now()}`,
        proId: newUser.id,
        proName: newUser.name,
        proEmail: newUser.email,
        proPhone: newUser.phone,
        category: newUser.category || 'General',
        experienceYears: newUser.experienceYears || 3,
        cnicNumber: '37405-1234567-9',
        cnicFrontImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        selfieImage: newUser.avatar,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      verificationsStore = [vr, ...verificationsStore];
    }

    return newUser;
  },

  // VERIFICATION QUEUE (ADMIN)
  async getVerificationRequests(): Promise<VerificationRequest[]> {
    await delay();
    return [...verificationsStore];
  },

  async approveVerification(requestId: string, notes?: string): Promise<VerificationRequest> {
    await delay(120);
    const idx = verificationsStore.findIndex(v => v.id === requestId);
    if (idx === -1) throw new Error('Verification request not found');
    verificationsStore[idx].status = 'approved';
    verificationsStore[idx].adminNotes = notes || 'Credentials verified against official databases.';

    // Update the pro user
    const proId = verificationsStore[idx].proId;
    const proIdx = usersStore.findIndex(u => u.id === proId);
    if (proIdx !== -1) {
      usersStore[proIdx].status = 'active';
      usersStore[proIdx].isVerified = true;
      usersStore[proIdx].level = 'verified';
    }

    return verificationsStore[idx];
  },

  async rejectVerification(requestId: string, reason: string): Promise<VerificationRequest> {
    await delay(120);
    const idx = verificationsStore.findIndex(v => v.id === requestId);
    if (idx === -1) throw new Error('Verification request not found');
    verificationsStore[idx].status = 'rejected';
    verificationsStore[idx].rejectionReason = reason;
    return verificationsStore[idx];
  },

  // NOTIFICATIONS
  async getNotifications(role: string): Promise<NotificationItem[]> {
    await delay();
    return notificationsStore.filter(n => n.targetRole === role);
  },

  async markNotificationRead(id: string): Promise<void> {
    const idx = notificationsStore.findIndex(n => n.id === id);
    if (idx !== -1) notificationsStore[idx].read = true;
  },

  // ADMIN STATS & ANALYTICS
  async getAdminStats() {
    await delay();
    const gmv = transactionsStore.reduce((acc, t) => acc + t.amountPKR, 0);
    const revenue = transactionsStore.reduce((acc, t) => acc + t.platformFeePKR, 0);
    const activeUsers = usersStore.filter(u => u.status === 'active').length;
    const pendingVerifications = verificationsStore.filter(v => v.status === 'pending').length;

    return {
      gmvPKR: gmv + 8540000,
      platformRevenuePKR: revenue + 427000,
      activeUsers: activeUsers + 1240,
      newSignups: 142,
      jobFillRatePct: 94.8,
      timeToFirstOfferMins: 14.2,
      disputeRatePct: 0.8,
      satisfactionScore: 4.88,
      pendingVerifications,
      monthlyTrends: MOCK_ANALYTICS_MONTHS
    };
  },

  // RESET DEMO DATA
  resetData() {
    jobsStore = [...MOCK_JOBS];
    offersStore = [...MOCK_OFFERS];
    usersStore = [...MOCK_USERS];
    reviewsStore = [...MOCK_REVIEWS];
    transactionsStore = [...MOCK_TRANSACTIONS];
    verificationsStore = [...MOCK_VERIFICATION_REQUESTS];
    notificationsStore = [...MOCK_NOTIFICATIONS];
  }
};
