export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  currency: string;
  last_price: number | null;
  forward_dividend_yield: number | null;
  ttm_dividend_yield: number | null;
  five_year_avg_yield: number | null;
  annual_dividend_rate: number | null;
  ttm_dividend_rate: number | null;
  dividend_frequency: string | null;
  payout_ratio: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
}

export interface Dividend {
  id: number;
  ex_date: string;
  pay_date: string | null;
  amount_per_share: number;
  currency: string;
}

export interface Holding {
  id: number;
  stock_id: number;
  shares: number;
  cost_per_share: number;
  purchase_date: string;
  notes: string | null;
  stock: Stock;
}
