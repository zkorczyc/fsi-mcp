export type ProductCategory = "savings" | "credit_card" | "mortgage";
export type SignalStatus = "ACTIVE" | "RECENT" | "RESOLVED";
export type Impact = "low" | "medium" | "high";

export interface MarketSignal {
  signal_id: string;
  market: string;
  country: string;
  product_category: ProductCategory;
  product_subcategory: string;
  signal_type: string;
  title: string;
  summary: string;
  direction: string;
  impact: Impact;
  status: SignalStatus;
  effective_from: string;
  effective_to: string | null;
  source: string;
  confidence: number;
}

export interface MarketProposition {
  provider: string;
  market: string;
  country: string;
  product_category: ProductCategory;
  product_subcategory: string;
  product_name: string;
  primary_rate: number;
  rate_type: string;
  rate_direction: "higher_is_better" | "lower_is_better";
  currency: "USD" | "GBP" | "EUR";
  fee: number;
  reward_rate: number;
  intro_offer: string;
  key_feature: string;
  effective_from: string;
  effective_to: string | null;
}

export interface SignalFilters {
  market?: string;
  country?: string;
  product_category?: ProductCategory;
  product_subcategory?: string;
  signal_type?: string;
  impact?: Impact;
  limit?: number;
}

export interface SearchFilters extends SignalFilters {
  product?: string;
  keyword?: string;
  from_date?: string;
  to_date?: string;
  impact?: Impact;
  status?: SignalStatus;
  limit?: number;
}