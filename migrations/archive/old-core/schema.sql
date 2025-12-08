-- Users Table (for authentication and user management)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast email lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Google Places API Usage Tracking Table
-- Tracks all API calls for centralized quota management across all users

CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(100) NOT NULL,          -- 'text_search' or 'nearby_search'
  category_id VARCHAR(100),                -- amenity category (e.g., 'restaurants_budget')
  request_timestamp TIMESTAMP DEFAULT NOW(),
  year_month VARCHAR(7) NOT NULL,          -- '2025-10' for monthly aggregation
  status VARCHAR(20) DEFAULT 'success',    -- 'success', 'error', 'quota_exceeded'
  error_message TEXT,
  location_lat DECIMAL(10, 8),             -- Search location latitude
  location_lng DECIMAL(11, 8),             -- Search location longitude
  results_count INTEGER DEFAULT 0,         -- Number of places returned
  response_time_ms INTEGER                 -- API response time in milliseconds
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_year_month ON api_usage(year_month);
CREATE INDEX IF NOT EXISTS idx_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_endpoint_year_month ON api_usage(endpoint, year_month);
CREATE INDEX IF NOT EXISTS idx_status ON api_usage(status);
CREATE INDEX IF NOT EXISTS idx_timestamp ON api_usage(request_timestamp DESC);

-- View for monthly quota usage aggregation
CREATE OR REPLACE VIEW monthly_quota_usage AS
SELECT
  year_month,
  endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
  COUNT(*) FILTER (WHERE status = 'quota_exceeded') as quota_exceeded_requests,
  AVG(response_time_ms) FILTER (WHERE status = 'success') as avg_response_time_ms,
  SUM(results_count) as total_results_returned
FROM api_usage
GROUP BY year_month, endpoint
ORDER BY year_month DESC, endpoint;

-- View for current month's usage (for quick quota checks)
CREATE OR REPLACE VIEW current_month_usage AS
SELECT
  endpoint,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE status = 'success') as successful_count
FROM api_usage
WHERE year_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
GROUP BY endpoint;
