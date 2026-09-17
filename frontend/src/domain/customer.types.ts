export interface Customer {
  id: string;
  firstName: string;
  email: string;
  isAuthenticated: boolean;
  avatarUrl?: string;
}

export interface ReviewSummary {
  rating: number;
  count: number;
  verifiedPercent: number;
}
