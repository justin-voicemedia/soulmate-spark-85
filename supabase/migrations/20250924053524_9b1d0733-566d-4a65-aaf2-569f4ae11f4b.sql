-- Clean up duplicate conversation usage entries
-- This will remove obvious duplicates where multiple entries exist with the same:
-- user_id, companion_id, api_type, minutes_used, tokens_used created within the same second

-- First, let's create a temporary table with the IDs we want to keep (one per unique combination)
WITH ranked_usage AS (
  SELECT id,
         user_id,
         companion_id,
         api_type,
         minutes_used,
         tokens_used,
         created_at,
         session_start,
         session_end,
         ROW_NUMBER() OVER (
           PARTITION BY 
             user_id, 
             companion_id, 
             api_type, 
             minutes_used, 
             COALESCE(tokens_used, 0),
             DATE_TRUNC('second', created_at)
           ORDER BY created_at ASC
         ) as rn
  FROM conversation_usage
),
duplicates_to_delete AS (
  SELECT id
  FROM ranked_usage
  WHERE rn > 1
)
DELETE FROM conversation_usage
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Log the cleanup
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate conversation usage entries', deleted_count;
END $$;