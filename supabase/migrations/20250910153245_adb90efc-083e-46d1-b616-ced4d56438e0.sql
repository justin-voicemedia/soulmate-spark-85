-- Create storage bucket for companion images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('companion-images', 'companion-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Create RLS policies for companion images
CREATE POLICY "Allow public viewing of companion images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'companion-images');

CREATE POLICY "Allow authenticated users to upload companion images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'companion-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update companion images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'companion-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete companion images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'companion-images' AND auth.role() = 'authenticated');