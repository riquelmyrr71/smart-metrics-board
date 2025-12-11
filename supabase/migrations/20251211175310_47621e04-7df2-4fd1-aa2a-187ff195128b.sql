-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required)
CREATE POLICY "Allow public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert notes" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notes" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notes" ON public.notes FOR DELETE USING (true);

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true);

-- Storage policies
CREATE POLICY "Allow public read note images" ON storage.objects FOR SELECT USING (bucket_id = 'note-images');
CREATE POLICY "Allow public upload note images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'note-images');
CREATE POLICY "Allow public delete note images" ON storage.objects FOR DELETE USING (bucket_id = 'note-images');