ALTER TABLE market_signals
  ADD COLUMN IF NOT EXISTS product_subcategory text;

UPDATE market_signals
SET product_subcategory = CASE
  WHEN product_category = 'savings' THEN 'easy_access'
  WHEN product_category = 'credit_card' THEN 'rewards'
  WHEN product_category = 'mortgage' THEN 'purchase_fixed'
END
WHERE product_subcategory IS NULL;

ALTER TABLE market_signals
  ALTER COLUMN product_subcategory SET NOT NULL;

ALTER TABLE market_propositions
  ADD COLUMN IF NOT EXISTS product_subcategory text,
  ADD COLUMN IF NOT EXISTS primary_rate double precision,
  ADD COLUMN IF NOT EXISTS rate_type text,
  ADD COLUMN IF NOT EXISTS rate_direction text,
  ADD COLUMN IF NOT EXISTS currency text;

UPDATE market_propositions
SET product_subcategory = COALESCE(product_subcategory, CASE
      WHEN product_category = 'savings' AND product_name ILIKE '%notice%' THEN 'notice'
      WHEN product_category = 'savings' AND (product_name ILIKE '%fixed%' OR product_name ILIKE '%festgeld%') THEN 'fixed_term'
      WHEN product_category = 'savings' THEN 'easy_access'
      WHEN product_category = 'credit_card' AND product_name ILIKE '%balance%' THEN 'balance_transfer'
      WHEN product_category = 'credit_card' AND product_name ILIKE '%travel%' THEN 'travel_rewards'
      WHEN product_category = 'credit_card' AND product_name ILIKE '%cash%' THEN 'cashback'
      WHEN product_category = 'credit_card' THEN 'rewards'
      WHEN product_name ILIKE '%remortgage%' THEN 'remortgage'
      WHEN product_name ILIKE '%5-Year%' THEN 'purchase_5yr_fixed'
      ELSE 'purchase_2yr_fixed'
    END),
    primary_rate = COALESCE(primary_rate, rate),
    rate_type = COALESCE(rate_type, CASE
      WHEN product_category = 'savings' AND market = 'UK_RETAIL_BANKING' THEN 'AER_variable'
      WHEN product_category = 'savings' THEN 'gross_annual_variable_rate'
      WHEN product_category = 'credit_card' AND market = 'US_RETAIL_BANKING' THEN 'variable_purchase_apr'
      WHEN product_category = 'credit_card' THEN 'representative_apr'
      WHEN market = 'FR_RETAIL_BANKING' THEN 'taux_fixe'
      ELSE 'fixed_mortgage_rate'
    END),
    rate_direction = COALESCE(rate_direction, CASE
      WHEN product_category = 'savings' THEN 'higher_is_better'
      ELSE 'lower_is_better'
    END),
    currency = COALESCE(currency, CASE country
      WHEN 'US' THEN 'USD'
      WHEN 'GB' THEN 'GBP'
      ELSE 'EUR'
    END);

ALTER TABLE market_propositions
  ALTER COLUMN product_subcategory SET NOT NULL,
  ALTER COLUMN primary_rate SET NOT NULL,
  ALTER COLUMN rate_type SET NOT NULL,
  ALTER COLUMN rate_direction SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL;

CREATE INDEX IF NOT EXISTS market_propositions_subcategory_idx
  ON market_propositions (market, product_category, product_subcategory, provider);