# Deployment Guide - XFroraSocial Feature

## 🚀 Canlıya Alma Adımları

### 1. Supabase Migration

**ÖNEMLİ:** Önce Supabase'de tabloları oluşturmanız gerekiyor!

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. Projenizi seçin
3. SQL Editor'a gidin
4. `apps/web/supabase-migration.sql` dosyasındaki SQL'i kopyalayıp çalıştırın

Veya Supabase CLI kullanarak:
```bash
cd apps/web
supabase db push
```

### 2. Environment Variables Kontrolü

Vercel'de şu environment variable'ların olduğundan emin olun:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `CONTRACT_ADDRESS`
- `RPC_URL`
- Diğer tüm keyler (Daydreams, Pinata, CDP, vs.)

### 3. GitHub'a Push

```bash
git add .
git commit -m "feat: Add XFroraSocial feature - posts, favs, weekly rewards"
git push origin main
```

### 4. Vercel Otomatik Deploy

Vercel otomatik olarak deploy edecek. Deployment'ı kontrol edin:
- https://vercel.com/dashboard
- Projenizi seçin
- Deployment'ları kontrol edin

### 5. Test Adımları

1. **Feed Sayfası Test:**
   - `/social` sayfasına gidin
   - Feed'in yüklendiğini kontrol edin

2. **Twit Atma Test:**
   - Wallet bağlayın
   - NFT sahibi olun
   - Twit atmayı deneyin (20K token yakımı)

3. **Fav Test:**
   - Bir twiti favlamayı deneyin (100 token yakımı)

4. **Leaderboard Test:**
   - `/leaderboard` sayfasına gidin
   - Sıralamayı kontrol edin

5. **Haftalık Ödül Test (Manuel):**
   - `/api/posts/distribute-weekly-rewards` endpoint'ini POST ile çağırın
   - Ödüllerin dağıtıldığını kontrol edin

## 📋 Yeni Özellikler

- ✅ XFroraSocial sayfası (`/social`)
- ✅ Twit atma (20K token yakımı, 8 puan)
- ✅ Fav sistemi (100 token yakımı)
- ✅ Leaderboard sayfası (`/leaderboard`)
- ✅ Haftalık ödül sistemi
- ✅ NFT kontrolü cache mekanizması
- ✅ Modern ve responsive UI

## 🔧 Sorun Giderme

### Database Hatası
- Supabase migration'ları çalıştırdığınızdan emin olun
- Environment variable'ları kontrol edin

### API Hatası
- Vercel logs'ları kontrol edin
- Environment variable'ları doğrulayın

### NFT Kontrolü Hatası
- RPC URL'in doğru olduğundan emin olun
- Contract address'i kontrol edin

