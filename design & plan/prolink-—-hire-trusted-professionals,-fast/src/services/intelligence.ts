import { Job, User, ServiceCategory } from '../types';
import { CATEGORIES } from '../data/mockData';

// Keyword dictionaries for intelligent category suggestion
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cat-plumbing': ['leak', 'pipe', 'tap', 'sink', 'drain', 'flush', 'geyser', 'water', 'tank', 'sanitary', 'fittings', 'pprc', 'bathroom', 'toilet', 'seepage', 'plumber'],
  'cat-electrical': ['wire', 'wiring', 'switch', 'socket', 'breaker', 'fuse', 'ups', 'inverter', 'light', 'fan', 'short circuit', 'current', 'electrician', 'chandelier', 'solar', 'earthing', 'power'],
  'cat-ac-repair': ['ac', 'air conditioner', 'cooling', 'inverter', 'gas', 'r410', 'refrigerant', 'chilling', 'compressor', 'split', 'hvac', 'outdoor unit', 'coil', 'leakage gas'],
  'cat-cleaning': ['clean', 'cleaning', 'wash', 'sofa', 'carpet', 'curtain', 'steam', 'deep clean', 'sanitize', 'marble polish', 'housemaid', 'dust', 'stain', 'scrub', 'kitchen deep clean'],
  'cat-painting': ['paint', 'painting', 'wall', 'primer', 'polish', 'varnish', 'distemper', 'weather sheet', 'emulsion', 'wood polish', 'repainting', 'scraper', 'roller'],
  'cat-carpentry': ['wood', 'door', 'lock', 'handle', 'hinge', 'wardrobe', 'cabinet', 'drawer', 'furniture', 'shelf', 'carpenter', 'kitchen cabinet', 'latch', 'bed'],
  'cat-appliance': ['washing machine', 'fridge', 'refrigerator', 'microwave', 'oven', 'dispenser', 'iron', 'hood', 'stove', 'appliance', 'motor', 'drum'],
  'cat-tutoring': ['tutor', 'tuition', 'study', 'math', 'physics', 'chemistry', 'biology', 'o level', 'a level', 'cambridge', 'exam', 'teacher', 'fsc', 'ielts', 'quran'],
  'cat-pest-control': ['termite', 'deemak', 'cockroach', 'pest', 'bedbug', 'fumigation', 'spray', 'mosquito', 'insect', 'rodent', 'rat'],
  'cat-movers': ['move', 'shifting', 'packer', 'transport', 'truck', 'shehzore', 'carton', 'intercity', 'loading', 'luggage', 'relocation']
};

/**
 * Suggest category from job title & description using weighted keyword scoring
 */
export function suggestCategory(text: string): { category: ServiceCategory | null; confidence: number; matches: string[] } {
  if (!text || text.trim().length < 3) {
    return { category: null, confidence: 0, matches: [] };
  }

  const normalized = text.toLowerCase();
  let bestCatId: string | null = null;
  let highestScore = 0;
  let matchedWords: string[] = [];

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    const currentMatches: string[] = [];
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        score += kw.length > 5 ? 3 : 2;
        currentMatches.push(kw);
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCatId = catId;
      matchedWords = currentMatches;
    }
  }

  if (!bestCatId || highestScore === 0) {
    return { category: null, confidence: 0, matches: [] };
  }

  const category = CATEGORIES.find(c => c.id === bestCatId) || null;
  const confidence = Math.min(Math.round((highestScore / 8) * 100), 98);
  return { category, confidence, matches: matchedWords };
}

/**
 * Calculate match score (0 - 100) between a job and a professional
 * Takes into account: category & skills, distance, rating, price fit, response time
 */
export function calculateMatchScore(
  job: Job,
  pro: User,
  weights = { skills: 0.35, distance: 0.25, rating: 0.20, priceFit: 0.10, responseTime: 0.10 }
): {
  totalScore: number;
  breakdown: { skills: number; distance: number; rating: number; priceFit: number; responseTime: number };
} {
  // 1. Skills / Category score
  let skillsScore = 50;
  if (pro.category && job.category && pro.category.toLowerCase().includes(job.category.toLowerCase())) {
    skillsScore = 85;
    // Check specific skills in job description
    const desc = `${job.title} ${job.description}`.toLowerCase();
    const matchingSkills = pro.skills?.filter(s => desc.includes(s.toLowerCase())) || [];
    if (matchingSkills.length > 0) {
      skillsScore = Math.min(100, 85 + matchingSkills.length * 5);
    }
  }

  // 2. Distance score (same city gives 80+, same area gives 95+)
  let distanceScore = 50;
  if (pro.city.toLowerCase() === job.city.toLowerCase()) {
    distanceScore = 82;
    if (pro.area.toLowerCase().includes(job.area.toLowerCase()) || job.area.toLowerCase().includes(pro.area.toLowerCase())) {
      distanceScore = 98;
    }
  }

  // 3. Rating score (4.0 to 5.0 scaled to 70-100)
  const rating = pro.rating || 4.5;
  const ratingScore = Math.min(100, Math.round(((rating - 3.5) / 1.5) * 30 + 70));

  // 4. Price fit score (how well pro base rate aligns with job budget)
  let priceFitScore = 85;
  if (pro.baseRate) {
    if (pro.baseRate <= job.budgetMax && pro.baseRate >= job.budgetMin * 0.7) {
      priceFitScore = 95;
    } else if (pro.baseRate > job.budgetMax) {
      priceFitScore = 65;
    }
  }

  // 5. Response time score
  const responseMinutes = pro.responseMinutes || 25;
  const responseTimeScore = responseMinutes <= 15 ? 98 : responseMinutes <= 30 ? 88 : 72;

  const total = Math.round(
    skillsScore * weights.skills +
    distanceScore * weights.distance +
    ratingScore * weights.rating +
    priceFitScore * weights.priceFit +
    responseTimeScore * weights.responseTime
  );

  return {
    totalScore: Math.min(99, Math.max(45, total)),
    breakdown: {
      skills: skillsScore,
      distance: distanceScore,
      rating: ratingScore,
      priceFit: priceFitScore,
      responseTime: responseTimeScore
    }
  };
}

/**
 * Order jobs by urgency and age
 */
export function sortJobsByUrgencyAndAge(jobs: Job[]): Job[] {
  const urgencyWeight: Record<string, number> = {
    urgent: 3,
    today: 2,
    flexible: 1
  };

  return [...jobs].sort((a, b) => {
    const uA = urgencyWeight[a.urgency] || 1;
    const uB = urgencyWeight[b.urgency] || 1;
    if (uB !== uA) {
      return uB - uA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
