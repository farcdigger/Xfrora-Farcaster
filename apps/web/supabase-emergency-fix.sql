-- EMERGENCY: Reduce load on Supabase
-- Run this if Supabase is currently down

-- 1. Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < now() - interval '5 minutes';

-- 2. Clear KV store cache (if it's huge)
DELETE FROM kv_store WHERE expires_at < NOW();

-- 3. Vacuum tables (reclaim space)
VACUUM ANALYZE users;
VACUUM ANALYZE tokens;
VACUUM ANALYZE payments;

-- 4. Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

