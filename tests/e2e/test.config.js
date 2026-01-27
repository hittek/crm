// Test configuration for E2E tests
// These values should match the seed data in prisma/seed.js

module.exports = {
  // Test user credentials (from seed.js)
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'admin@hittek.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  },
  
  // Alternative test users
  testUsers: {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@hittek.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'password123',
    },
    manager: {
      email: process.env.TEST_MANAGER_EMAIL || 'manager@hittek.com',
      password: process.env.TEST_MANAGER_PASSWORD || 'password123',
    },
    user: {
      email: process.env.TEST_USER_EMAIL || 'vendedor1@hittek.com',
      password: process.env.TEST_USER_PASSWORD || 'password123',
    },
  },
}
