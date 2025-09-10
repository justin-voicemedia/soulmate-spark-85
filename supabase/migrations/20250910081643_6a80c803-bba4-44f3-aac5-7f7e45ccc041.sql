-- Update companion image URLs with realistic placeholder images
UPDATE public.companions 
SET image_url = CASE 
  WHEN name = 'Emma' THEN 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'Alex' THEN 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'Sophia' THEN 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'Marcus' THEN 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'Luna' THEN 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'David' THEN 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'Isabella' THEN 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face'
  WHEN name = 'James' THEN 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face'
  ELSE image_url
END
WHERE is_prebuilt = true;