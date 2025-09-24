-- Create a testing account setup
-- Update the existing subscriber to have unlimited testing access
UPDATE subscribers 
SET trial_minutes_limit = 999999,
    trial_minutes_used = 0,
    subscription_tier = 'Testing',
    updated_at = now()
WHERE user_id = 'c6a38ea9-ccc2-456d-b8a6-c0b6ab877ccc';

-- Insert a testing subscription entry if it doesn't exist
INSERT INTO subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    spicy_unlocked
) 
SELECT 
    'c6a38ea9-ccc2-456d-b8a6-c0b6ab877ccc',
    'cus_T1zVTPS02rCovz',
    'sub_testing_unlimited',
    'testing',
    'active',
    now(),
    now() + interval '1 year',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = 'c6a38ea9-ccc2-456d-b8a6-c0b6ab877ccc'
);