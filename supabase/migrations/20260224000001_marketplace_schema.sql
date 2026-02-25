-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  account_type TEXT CHECK (account_type IN ('student', 'faculty', 'staff')),
  class_year INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT NOT NULL CHECK (category IN (
    'textbooks','furniture','electronics','clothing',
    'school_supplies','event_tickets','rides','services','free'
  )),
  condition TEXT CHECK (condition IN ('new','like_new','good','fair','poor')),
  course_dept TEXT,
  course_number TEXT,
  pickup_location TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active listings"
  ON listings FOR SELECT TO authenticated
  USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own listings"
  ON listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own listings"
  ON listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their conversations"
  ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND buyer_id != seller_id);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
