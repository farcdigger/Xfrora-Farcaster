-- Supabase Messaging Migration SQL (Fixed)
-- Bu dosyayı Supabase Dashboard'da çalıştırın: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- Conversations Table (Konuşmalar)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_wallet VARCHAR(255) NOT NULL,
  participant2_wallet VARCHAR(255) NOT NULL,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint için ayrı bir index oluşturalım
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_conversation 
ON conversations (
  CASE 
    WHEN participant1_wallet < participant2_wallet 
    THEN participant1_wallet || '|' || participant2_wallet
    ELSE participant2_wallet || '|' || participant1_wallet
  END
);

-- ============================================
-- Messages Table (Mesajlar)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_wallet VARCHAR(255) NOT NULL,
  receiver_wallet VARCHAR(255) NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 500), -- Max 500 karakter
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Rate Limiting Table (Spam Koruması)
-- ============================================
CREATE TABLE IF NOT EXISTS message_rate_limits (
  wallet_address VARCHAR(255) PRIMARY KEY,
  messages_sent_minute INTEGER DEFAULT 0,
  messages_sent_hour INTEGER DEFAULT 0,
  last_minute_reset TIMESTAMP DEFAULT NOW(),
  last_hour_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Performance Indexes
-- ============================================

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_wallet);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_wallet, read) WHERE read = FALSE;

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_wallet);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_wallet);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Rate limits table indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_minute_reset ON message_rate_limits(last_minute_reset);
CREATE INDEX IF NOT EXISTS idx_rate_limits_hour_reset ON message_rate_limits(last_hour_reset);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;

-- Conversations policies
-- Kullanıcılar sadece kendi konuşmalarını görebilir
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (
    participant1_wallet = current_setting('app.current_wallet', true) OR
    participant2_wallet = current_setting('app.current_wallet', true)
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    participant1_wallet = current_setting('app.current_wallet', true) OR
    participant2_wallet = current_setting('app.current_wallet', true)
  );

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    participant1_wallet = current_setting('app.current_wallet', true) OR
    participant2_wallet = current_setting('app.current_wallet', true)
  );

-- Messages policies
-- Kullanıcılar sadece kendi mesajlarını görebilir
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    sender_wallet = current_setting('app.current_wallet', true) OR
    receiver_wallet = current_setting('app.current_wallet', true)
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_wallet = current_setting('app.current_wallet', true)
  );

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  USING (
    receiver_wallet = current_setting('app.current_wallet', true)
  );

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits"
  ON message_rate_limits FOR ALL
  USING (
    wallet_address = current_setting('app.current_wallet', true)
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Otomatik mesaj silme fonksiyonu (her gece 03:00'da çalışacak)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 24 saatten eski mesajları sil
  DELETE FROM messages 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Boş kalan konuşmaları sil
  DELETE FROM conversations 
  WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages WHERE conversation_id IS NOT NULL);
  
  -- Rate limit kayıtlarını temizle (1 haftalık)
  DELETE FROM message_rate_limits 
  WHERE updated_at < NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Old messages cleanup completed at %', NOW();
END;
$$;

-- Rate limit kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_wallet_address VARCHAR(255),
  p_limit_type VARCHAR(10) -- 'minute' veya 'hour'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
  limit_value INTEGER;
BEGIN
  -- Limit tipine göre değerleri ayarla
  IF p_limit_type = 'minute' THEN
    limit_value := 10; -- Dakikada 10 mesaj
  ELSIF p_limit_type = 'hour' THEN
    limit_value := 100; -- Saatte 100 mesaj
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Rate limit kaydını al veya oluştur
  INSERT INTO message_rate_limits (wallet_address)
  VALUES (p_wallet_address)
  ON CONFLICT (wallet_address) DO NOTHING;
  
  -- Mevcut sayıyı al
  IF p_limit_type = 'minute' THEN
    SELECT messages_sent_minute INTO current_count
    FROM message_rate_limits 
    WHERE wallet_address = p_wallet_address;
  ELSE
    SELECT messages_sent_hour INTO current_count
    FROM message_rate_limits 
    WHERE wallet_address = p_wallet_address;
  END IF;
  
  -- Null kontrolü
  IF current_count IS NULL THEN
    current_count := 0;
  END IF;
  
  -- Limit kontrolü
  RETURN current_count < limit_value;
END;
$$;

-- Konuşma oluşturma yardımcı fonksiyonu
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_wallet1 VARCHAR(255),
  p_wallet2 VARCHAR(255)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_uuid UUID;
BEGIN
  -- Mevcut konuşmayı ara
  SELECT id INTO conversation_uuid
  FROM conversations
  WHERE (participant1_wallet = p_wallet1 AND participant2_wallet = p_wallet2)
     OR (participant1_wallet = p_wallet2 AND participant2_wallet = p_wallet1);
  
  -- Konuşma yoksa oluştur
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations (participant1_wallet, participant2_wallet)
    VALUES (p_wallet1, p_wallet2)
    RETURNING id INTO conversation_uuid;
  END IF;
  
  RETURN conversation_uuid;
END;
$$;

-- ============================================
-- Trigger Functions
-- ============================================

-- Konuşmanın last_message_at'ını güncelle
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Rate limit sayacını artır
CREATE OR REPLACE FUNCTION increment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  now_time TIMESTAMP := NOW();
BEGIN
  -- Rate limit kaydını güncelle
  INSERT INTO message_rate_limits (
    wallet_address,
    messages_sent_minute,
    messages_sent_hour,
    last_minute_reset,
    last_hour_reset,
    updated_at
  )
  VALUES (
    NEW.sender_wallet,
    1,
    1,
    now_time,
    now_time,
    now_time
  )
  ON CONFLICT (wallet_address) DO UPDATE SET
    messages_sent_minute = CASE 
      WHEN message_rate_limits.last_minute_reset < now_time - INTERVAL '1 minute' THEN 1
      ELSE message_rate_limits.messages_sent_minute + 1
    END,
    messages_sent_hour = CASE 
      WHEN message_rate_limits.last_hour_reset < now_time - INTERVAL '1 hour' THEN 1
      ELSE message_rate_limits.messages_sent_hour + 1
    END,
    last_minute_reset = CASE 
      WHEN message_rate_limits.last_minute_reset < now_time - INTERVAL '1 minute' THEN now_time
      ELSE message_rate_limits.last_minute_reset
    END,
    last_hour_reset = CASE 
      WHEN message_rate_limits.last_hour_reset < now_time - INTERVAL '1 hour' THEN now_time
      ELSE message_rate_limits.last_hour_reset
    END,
    updated_at = now_time;
    
  RETURN NEW;
END;
$$;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_increment_rate_limit ON messages;
CREATE TRIGGER trigger_increment_rate_limit
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_rate_limit();

-- ============================================
-- Migration Tamamlandı
-- ============================================

-- Migration başarılı mesajı
DO $$
BEGIN
  RAISE NOTICE '✅ Messaging migration completed successfully!';
  RAISE NOTICE '📊 Created tables: conversations, messages, message_rate_limits';
  RAISE NOTICE '🔒 RLS policies enabled for security';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🤖 Triggers and functions set up';
  RAISE NOTICE '🧹 Cleanup function ready for cron job';
END;
$$;
