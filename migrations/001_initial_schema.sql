CREATE TABLE IF NOT EXISTS market_signals (
  signal_id text PRIMARY KEY,
  market text NOT NULL,
  country text NOT NULL,
  product_category text NOT NULL CHECK (product_category IN ('savings', 'credit_card', 'mortgage')),
  product_subcategory text NOT NULL,
  signal_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  direction text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'RECENT', 'RESOLVED')),
  effective_from date NOT NULL,
  effective_to date,
  source text NOT NULL,
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS market_signals_active_category_idx
  ON market_signals (status, product_category, effective_from DESC);

CREATE TABLE IF NOT EXISTS market_propositions (
  provider text NOT NULL,
  market text NOT NULL,
  country text NOT NULL,
  product_category text NOT NULL CHECK (product_category IN ('savings', 'credit_card', 'mortgage')),
  product_subcategory text NOT NULL,
  product_name text NOT NULL,
  rate double precision NOT NULL,
  primary_rate double precision NOT NULL,
  rate_type text NOT NULL,
  rate_direction text NOT NULL CHECK (rate_direction IN ('higher_is_better', 'lower_is_better')),
  currency text NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  fee integer NOT NULL CHECK (fee >= 0),
  reward_rate double precision NOT NULL CHECK (reward_rate >= 0),
  intro_offer text NOT NULL,
  key_feature text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  PRIMARY KEY (provider, product_name, effective_from)
);

CREATE INDEX IF NOT EXISTS market_propositions_category_idx
  ON market_propositions (market, product_category, provider);