
---

## 2. Database Schema (Supabase PostgreSQL)

```sql
-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  whatsapp_number TEXT,
  telegram_chat_id TEXT,
  plan TEXT DEFAULT 'FREE', -- 'FREE', 'PRO', 'AGENCY'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Monitored Websites Table
CREATE TABLE monitored_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  last_health_score INT DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  check_interval_hours INT DEFAULT 6,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Scan Results & Leaks Table
CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES monitored_sites(id) ON DELETE CASCADE,
  broken_links JSONB NOT NULL, -- [{ type: 'whatsapp', url: '...', error: '...' }]
  estimated_loss INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payment Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  razorpay_order_id TEXT NOT NULL,
  amount INT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);