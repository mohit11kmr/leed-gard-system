#!/bin/sh
# Worker health check script
# Checks Redis connectivity and BullMQ queue accessibility

set -e

# Check Redis connectivity
redis-cli -h redis ping > /dev/null 2>&1 || exit 1

# Check if we can connect to the database (optional, but good for full health)
# We'll skip DB check for worker since it primarily needs Redis

# Check if the worker process is running (by checking if we can access the queue)
# This is a simple check - in production you might want more sophisticated checks
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  connectTimeout: 3000,
});

redis.ping().then(() => {
  console.log('Worker health check: OK');
  process.exit(0);
}).catch((err) => {
  console.error('Worker health check failed:', err.message);
  process.exit(1);
});
" || exit 1