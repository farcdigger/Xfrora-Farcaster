-- Fix Messaging Points System
-- Bu dosyayı Supabase Dashboard'da çalıştırın

-- 1. Eğer total_messages_sent kolonu yoksa ekle
ALTER TABLE message_rate_limits 
ADD COLUMN IF NOT EXISTS total_messages_sent INTEGER DEFAULT 0;

-- 2. Mevcut kullanıcılar için total_messages_sent değerini sıfırdan başlat
UPDATE message_rate_limits 
SET total_messages_sent = 0 
WHERE total_messages_sent IS NULL;
