// Load .env.test before any test modules so Prisma picks up the unpooled URL.
// The unpooled Neon URL is required for tests because PgBouncer's transaction
// pooling can route consecutive statements to different backend connections,
// causing FK violations when a freshly-inserted row is not yet visible on the
// connection that runs the next INSERT.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.test'), override: true });

// Increase default timeout to 30s to prevent clearDatabase from timing out and leaking into next tests
jest.setTimeout(30000);
