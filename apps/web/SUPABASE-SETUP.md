# 🚀 Yeni Supabase Projesi Kurulum Rehberi

Bu rehber, Farcaster Mini App için **tamamen yeni** bir Supabase projesi oluşturmanızı sağlar.

---

## 📋 Adım 1: Yeni Supabase Projesi Oluştur

1. **Supabase Dashboard'a git:** https://supabase.com/dashboard
2. **"New Project"** butonuna tıkla
3. **Proje ayarlarını gir:**
   - **Name**: `xfrora-farcaster` (veya istediğin isim)
   - **Database Password**: Güçlü bir şifre oluştur (kaydet!)
   - **Region**: `East US (North Virginia)` (en yakın/hızlı)
   - **Pricing Plan**: `Free` (başlangıç için)
4. **"Create new project"** tıkla
5. **~2 dakika bekle** (proje hazırlanıyor...)

---

## 📊 Adım 2: Tabloları Oluştur

Proje hazır olunca:

1. Sol menüden **"SQL Editor"** sekmesine git
2. **"New Query"** butonuna tıkla
3. `supabase-complete-migration.sql` dosyasının **tüm içeriğini** kopyala-yapıştır
4. **"Run"** (veya `Cmd+Enter`) ile çalıştır
5. ✅ **"Success. No rows returned"** mesajını gör

Bu SQL, şu tabloları oluşturur:
- ✅ `users` - Farcaster kullanıcı profilleri
- ✅ `tokens` - Generate edilen NFT'ler
- ✅ `payments` - USDC ödeme kayıtları
- ✅ `chat_tokens` - Chatbot kredileri ve puanlar
- ✅ `posts` - Sosyal medya paylaşımları
- ✅ `post_favs` - Post beğenileri
- ✅ `weekly_rewards` - Haftalık ödül kazananları
- ✅ `kv_store` - Rate limiting için anahtar-değer deposu
- ✅ `referral_codes` - Referans kodları
- ✅ `referrals` - Referans ilişkileri
- ✅ `pending_referrals` - Bekleyen referanslar
- ✅ `conversations` - Chatbot konuşmaları
- ✅ `messages` - Chatbot mesajları
- ✅ `message_rate_limits` - Mesaj rate limiting
- ✅ `graph_reports` - Yama Agent raporları

---

## 🔑 Adım 3: API Anahtarlarını Kopyala

1. Sol menüden **"Project Settings"** (dişli ikonu) → **"API"** sekmesine git
2. Şu bilgileri kopyala:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```

### Service Role Key (secret!)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **DİKKAT:** `service_role` anahtarını kullan, `anon` değil!

---

## 🔐 Adım 4: Vercel Environment Variables

### Vercel Dashboard'da:

1. https://vercel.com/dashboard
2. Projenizi seçin → **"Settings"** → **"Environment Variables"**
3. **Yeni değişkenleri ekle veya güncelle:**

```bash
# Supabase Configuration (NEW PROJECT!)
NEXT_PUBLIC_SUPABASE_URL=https://YENI-PROJECT-URL.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YENI-KEY...

# Supabase Connection Pooling (Optional - for better performance)
PG_CONNECTION_STRING=postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

4. **"Save"** tıkla

### Connection Pooling String Nasıl Bulunur?

Supabase Dashboard → **"Database"** → **"Connection Pooling"**
- **Mode**: Transaction
- **Connection String**: Kopyala ve `PG_CONNECTION_STRING` olarak ekle

---

## 🚀 Adım 5: Deploy

### Otomatik Deploy (Önerilen):
```bash
# Değişiklikleri commit ve push et
git add .
git commit -m "chore: Update Supabase to new project"
git push
```

Vercel otomatik olarak deploy edecek.

### Manuel Deploy:
Vercel Dashboard → **"Deployments"** → **"Redeploy"**

---

## ✅ Adım 6: Test Et

1. **Deploy tamamlandıktan sonra** uygulamanızı aç
2. **Farcaster'da bağlan**
3. **NFT generate et**
4. **Supabase Dashboard'da kontrol et:**
   - **"Table Editor"** → `users` tablosuna git
   - **Farcaster FID'niz** `x_user_id` sütununda görünmeli ✅
   - **Kullanıcı adınız** `username` sütununda görünmeli ✅

---

## 🔧 Troubleshooting

### "Database connection failed"
- ✅ Environment variables doğru mu?
- ✅ Vercel'de redeploy yaptın mı?
- ✅ Supabase projesi aktif mi?

### "RLS policy violation"
- ✅ `service_role` key kullandığına emin ol (anon değil!)

### "Table does not exist"
- ✅ Migration SQL'i çalıştırdın mı?
- ✅ Success mesajı aldın mı?

---

## 📈 Performans Optimizasyonu (İlerisi için)

Trafiğiniz arttığında:

1. **Connection Pooling** aktif et (yukarıda açıklandı)
2. **Supabase planını yükselt** (Free → Pro)
3. **Vercel KV ekle** (rate limiting için):
   ```bash
   npm install @vercel/kv
   ```

---

## 🎉 Tamamlandı!

Artık **tamamen ayrı** bir Supabase projeniz var:
- ✅ Eski X projesi → Eski Supabase (dokunulmadı)
- ✅ Yeni Farcaster projesi → Yeni Supabase (temiz başlangıç)

Her iki proje de aynı veritabanı şemasını kullanıyor ama **tamamen ayrı veriler** saklıyor.

---

## 📚 Ek Notlar

### Farcaster FID Nerede Saklanıyor?
- `users.x_user_id` → Farcaster FID
- `tokens.x_user_id` → Farcaster FID
- `payments.x_user_id` → Farcaster FID

Bu sayede **aynı veritabanı şeması** hem X hem Farcaster için çalışıyor.

### Veritabanı Şeması Değişirse?
Her iki projeye de **aynı migration**'ı uygula:
1. SQL dosyasını güncelle
2. Her iki Supabase projesinde çalıştır

---

**Sorularınız için:** Bu dosyayı saklayın ve adım adım takip edin!

