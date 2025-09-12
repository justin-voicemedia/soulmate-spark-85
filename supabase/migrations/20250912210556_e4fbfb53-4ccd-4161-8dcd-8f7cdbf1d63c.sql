-- Add new columns to conversation_usage table for API type differentiation
ALTER TABLE conversation_usage 
ADD COLUMN api_type TEXT DEFAULT 'voice' CHECK (api_type IN ('voice', 'text')),
ADD COLUMN tokens_used INTEGER DEFAULT 0,
ADD COLUMN cost_override DECIMAL(10,4) DEFAULT NULL;

-- Add comment to explain the new columns
COMMENT ON COLUMN conversation_usage.api_type IS 'Type of API used: voice for OpenAI Realtime, text for chat completions';
COMMENT ON COLUMN conversation_usage.tokens_used IS 'Number of tokens used for text conversations';
COMMENT ON COLUMN conversation_usage.cost_override IS 'Override cost calculation for specific pricing models';