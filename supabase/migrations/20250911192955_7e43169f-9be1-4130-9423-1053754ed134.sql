-- Update CORS settings for companion-images bucket to allow browser access
UPDATE storage.buckets 
SET cors_origin = '["*"]'
WHERE id = 'companion-images';