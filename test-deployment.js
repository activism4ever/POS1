// Hospital POS System - Deployment Testing Script
// Run this script to test your live deployment

const axios = require('axios');

// Configuration - UPDATE THESE URLS AFTER DEPLOYMENT
const CONFIG = {
  BACKEND_URL: 'https://hospital-pos-api-production.up.railway.app', // Update with your Railway URL
  FRONTEND_URL: 'https://your-app.netlify.app', // Update with your Netlify URL
  TEST_CREDENTIALS: {
    admin: { username: 'admin', password: 'admin123' },
    doctor: { username: 'doctor', password: 'doctor123' },
    cashier: { username: 'cashier', password: 'cashier123' },
    lab: { username: 'lab', password: 'lab123' },
    pharmacy: { username: 'pharmacy', password: 'pharmacy123' }
  }
};

class DeploymentTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Testing: ${testName}`);
    try {
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testHealthEndpoint() {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/health`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (!response.data.message) {
      throw new Error('Health endpoint missing message');
    }
    console.log(`   Health Status: ${response.data.message}`);
  }

  async testDatabaseConnection() {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/health`);
    if (!response.data.database) {
      throw new Error('Database health check missing');
    }
    if (response.data.database.status !== 'healthy') {
      throw new Error(`Database unhealthy: ${response.data.database.status}`);
    }
    console.log(`   Database Status: ${response.data.database.status}`);
  }

  async testLogin(role) {
    const credentials = CONFIG.TEST_CREDENTIALS[role];
    const response = await axios.post(`${CONFIG.BACKEND_URL}/api/auth/login`, credentials);
    
    if (response.status !== 200) {
      throw new Error(`Login failed with status ${response.status}`);
    }
    
    if (!response.data.token || !response.data.user) {
      throw new Error('Login response missing token or user data');
    }
    
    if (response.data.user.role !== role) {
      throw new Error(`Expected role ${role}, got ${response.data.user.role}`);
    }
    
    console.log(`   Role: ${response.data.user.role}, User: ${response.data.user.name}`);
    return response.data.token;
  }

  async testAuthenticatedEndpoint(token, endpoint, expectedData) {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    console.log(`   Endpoint /${endpoint}: ${response.data.length || 'OK'} items`);
  }

  async testPatientEndpoints(token) {
    // Test getting patients
    await this.testAuthenticatedEndpoint(token, 'patients', 'patients');
    
    // Test getting services
    await this.testAuthenticatedEndpoint(token, 'services', 'services');
  }

  async testCORSHeaders() {
    try {
      const response = await axios.options(`${CONFIG.BACKEND_URL}/api/health`);
      console.log(`   CORS preflight status: ${response.status}`);
    } catch (error) {
      // OPTIONS might not be explicitly handled, check regular request has CORS headers
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/health`);
      if (!response.headers['access-control-allow-origin']) {
        throw new Error('CORS headers missing');
      }
      console.log(`   CORS headers present`);
    }
  }

  async runAllTests() {
    console.log('🏥 Hospital POS System - Deployment Testing');
    console.log('='.repeat(50));
    console.log(`Backend URL: ${CONFIG.BACKEND_URL}`);
    console.log(`Frontend URL: ${CONFIG.FRONTEND_URL}`);
    console.log('='.repeat(50));

    // Basic connectivity tests
    await this.runTest('Backend Health Check', () => this.testHealthEndpoint());
    await this.runTest('Database Connection', () => this.testDatabaseConnection());
    await this.runTest('CORS Configuration', () => this.testCORSHeaders());

    // Authentication tests for each role
    const roles = ['admin', 'doctor', 'cashier', 'lab', 'pharmacy'];
    const tokens = {};
    
    for (const role of roles) {
      await this.runTest(`${role.toUpperCase()} Login`, async () => {
        tokens[role] = await this.testLogin(role);
      });
    }

    // Test authenticated endpoints
    if (tokens.admin) {
      await this.runTest('Patient Endpoints', () => this.testPatientEndpoints(tokens.admin));
    }

    // Display results
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your Hospital POS System is ready for production!');
      console.log('\n📋 Next Steps:');
      console.log('1. Change default passwords');
      console.log('2. Add your hospital services and pricing');
      console.log('3. Train your staff on the system');
      console.log('4. Start using for patient management!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }

    return this.results;
  }
}

// Export for use in other scripts
module.exports = DeploymentTester;

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new DeploymentTester();
  tester.runAllTests().catch(console.error);
}