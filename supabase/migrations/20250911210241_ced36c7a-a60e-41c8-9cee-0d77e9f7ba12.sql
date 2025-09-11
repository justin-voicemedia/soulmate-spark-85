-- Check if policies exist for companion-images bucket and create them if needed
-- Policy to allow anyone to view companion images (since bucket is public)
CREATE POLICY "Allow public access to companion images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'companion-images');

-- Policy to allow authenticated users to upload companion images
CREATE POLICY "Allow authenticated users to upload companion images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'companion-images' AND auth.role() = 'authenticated');

-- Policy to allow authenticated users to update companion images they uploaded
CREATE POLICY "Allow authenticated users to update companion images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'companion-images' AND auth.role() = 'authenticated');

-- Policy to allow authenticated users to delete companion images they uploaded  
CREATE POLICY "Allow authenticated users to delete companion images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'companion-images' AND auth.role() = 'authenticated');