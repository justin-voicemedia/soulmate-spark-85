-- Add unique constraint to relationship_type column for ON CONFLICT operations
ALTER TABLE public.relationship_prompts 
ADD CONSTRAINT relationship_prompts_relationship_type_key UNIQUE (relationship_type);