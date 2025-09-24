-- First, let's remove duplicate records keeping only the most recent one
DELETE FROM user_companions 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, companion_id) id
    FROM user_companions 
    ORDER BY user_id, companion_id, updated_at DESC
);

-- Now add a unique constraint to prevent duplicates in the future
ALTER TABLE user_companions 
ADD CONSTRAINT unique_user_companion 
UNIQUE (user_id, companion_id);