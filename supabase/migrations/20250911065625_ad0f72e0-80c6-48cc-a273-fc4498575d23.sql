-- Add vapi_agent_id to user_companions table to store the Vapi agent ID for each user-companion pair
ALTER TABLE user_companions ADD COLUMN vapi_agent_id TEXT;