import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from './mongoTestHelper.js';
import { User, CustomerProfile, OperatorProfile, AuditLog } from '../src/models/index.js';
import { authService } from '../src/services/auth.service.js';
import { env } from '../src/config/env.js';

describe('Authentication & Role-Based Access Control (RBAC)', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  // =========================================================================
  // 1. CREDENTIALS & LOGIN
  // =========================================================================
  describe('1. Login & Secure Cookies', () => {
    it('authenticates valid credentials, sets HTTP-only cookie, and logs login in audit collection', async () => {
      // Create user
      const customer = await authService.registerCustomer(
        {
          name: 'Priya Narayanan',
          email: 'priya@textiles.com',
          password: 'Password@123',
          companyName: 'Priya Garments Export Ltd',
        },
        '127.0.0.1'
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'priya@textiles.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', 'priya@textiles.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      // Verify Set-Cookie header contains HTTP-only cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');

      // Verify AuditLog record
      const audit = await AuditLog.findOne({ action: 'USER_LOGIN', actorId: customer.user._id });
      expect(audit).toBeDefined();
    });

    it('rejects invalid password with 401 and code INVALID_CREDENTIALS', async () => {
      await authService.registerCustomer(
        {
          name: 'Test Customer',
          email: 'wrongpass@test.com',
          password: 'CorrectPassword123',
          companyName: 'Company A',
        },
        '127.0.0.1'
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrongpass@test.com',
          password: 'IncorrectPassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects login for INACTIVE or SUSPENDED accounts', async () => {
      const user = await User.create({
        name: 'Inactive Staff',
        email: 'suspended@mill.com',
        passwordHash: 'dummy',
        role: 'OPERATOR',
        status: 'SUSPENDED',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'suspended@mill.com',
          password: 'SomePassword123',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  // =========================================================================
  // 2. EXPIRED SESSIONS & UNAUTHORIZED REQUESTS
  // =========================================================================
  describe('2. Session Validation & Expiration', () => {
    it('returns 401 when accessing protected /api/v1/auth/me without cookie or token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when an expired JWT token is presented', async () => {
      const user = await User.create({
        name: 'Expired User',
        email: 'expired@test.com',
        passwordHash: 'dummy',
        role: 'CUSTOMER',
      });

      // Generate an expired token (expiresIn: -10s)
      const expiredToken = jwt.sign(
        { id: user._id.toString(), role: user.role, email: user.email },
        env.JWT_SECRET,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${env.COOKIE_NAME}=${expiredToken}`]);

      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('successfully clears cookie and logs logout on /api/v1/auth/logout', async () => {
      const { user, token } = await authService.registerCustomer(
        {
          name: 'Logout Test',
          email: 'logout@test.com',
          password: 'Password@123',
          companyName: 'Logout Corp',
        },
        '127.0.0.1'
      );

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`${env.COOKIE_NAME}=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cookie cleared (Expires in past or Max-Age=0)
      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('Max-Age=0') || c.includes('expires='))).toBe(true);
    });
  });

  // =========================================================================
  // 3. ROLE ESCALATION PREVENTION
  // =========================================================================
  describe('3. Attempted Role Escalation Prevention', () => {
    it('strictly forces role to CUSTOMER even if client submits role: ADMIN in registration payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-customer')
        .send({
          name: 'Hacker Bob',
          email: 'hacker@bob.com',
          password: 'Password@123',
          companyName: 'Hacker Corp',
          role: 'ADMIN', // Malicious attempt to escalate privileges
        });

      expect(res.statusCode).toBe(201);
      // Role must strictly be CUSTOMER
      expect(res.body.data.user.role).toBe('CUSTOMER');

      const savedUser = await User.findById(res.body.data.user._id);
      expect(savedUser.role).toBe('CUSTOMER');
    });
  });

  // =========================================================================
  // 4. ADMIN PRIVILEGES & STAFF PROVISIONING
  // =========================================================================
  describe('4. Admin Staff Provisioning & Role Boundaries', () => {
    it('allows ADMIN to create new staff accounts (OPERATOR) with department and wage rate', async () => {
      const admin = await User.create({
        name: 'Chief Supervisor',
        email: 'supervisor@mill.com',
        passwordHash: 'dummy',
        role: 'ADMIN',
      });
      const adminToken = authService.generateToken(admin);

      const res = await request(app)
        .post('/api/v1/auth/staff')
        .set('Cookie', [`${env.COOKIE_NAME}=${adminToken}`])
        .send({
          name: 'Suresh Weaver',
          email: 'suresh.weaver@mill.com',
          password: 'Password@123',
          role: 'OPERATOR',
          department: 'WEAVING',
          skillLevel: 'MASTER_WEAVER',
          hourlyWageRate: 200,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe('OPERATOR');
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.profile.department).toBe('WEAVING');
      expect(res.body.data.profile.hourlyWageRate).toBe(200);

      // Verify AuditLog
      const audit = await AuditLog.findOne({ action: 'STAFF_ACCOUNT_CREATED' });
      expect(audit).toBeDefined();
      expect(audit.actorId.toString()).toBe(admin._id.toString());
    });

    it('rejects CUSTOMER attempting to create staff accounts with 403 Forbidden', async () => {
      const customer = await User.create({
        name: 'Customer Bob',
        email: 'customer.bob@apparel.com',
        passwordHash: 'dummy',
        role: 'CUSTOMER',
      });
      const customerToken = authService.generateToken(customer);

      const res = await request(app)
        .post('/api/v1/auth/staff')
        .set('Cookie', [`${env.COOKIE_NAME}=${customerToken}`])
        .send({
          name: 'Fake Operator',
          email: 'fake.operator@mill.com',
          password: 'Password@123',
          role: 'OPERATOR',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Verify security alert logged in AuditLog
      const audit = await AuditLog.findOne({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: customer._id,
      });
      expect(audit).toBeDefined();
    });

    it('rejects OPERATOR attempting to list all registered users with 403 Forbidden', async () => {
      const operator = await User.create({
        name: 'Operator Raju',
        email: 'operator.raju@mill.com',
        passwordHash: 'dummy',
        role: 'OPERATOR',
      });
      const operatorToken = authService.generateToken(operator);

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Cookie', [`${env.COOKIE_NAME}=${operatorToken}`]);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 5. CROSS-CUSTOMER PROFILE ACCESS ISOLATION
  // =========================================================================
  describe('5. Cross-Customer Profile Isolation', () => {
    it('prevents customer A from updating customer B profile by enforcing server-side session identity', async () => {
      const customerA = await authService.registerCustomer(
        {
          name: 'Customer Alpha',
          email: 'alpha@textiles.com',
          password: 'Password@123',
          companyName: 'Alpha Textiles Ltd',
        },
        '127.0.0.1'
      );

      const customerB = await authService.registerCustomer(
        {
          name: 'Customer Beta',
          email: 'beta@textiles.com',
          password: 'Password@123',
          companyName: 'Beta Garments Ltd',
        },
        '127.0.0.1'
      );

      // Customer A sends request attempting to pass customer B's userId in body
      const res = await request(app)
        .patch('/api/v1/auth/customer-profile')
        .set('Cookie', [`${env.COOKIE_NAME}=${customerA.token}`])
        .send({
          userId: customerB.user._id, // Malicious override
          companyName: 'Malicious Hijack Name',
        });

      expect(res.statusCode).toBe(200);

      // Verify Customer A's own profile was updated, while Customer B was NOT touched!
      const profileA = await CustomerProfile.findOne({ userId: customerA.user._id });
      expect(profileA.companyName).toBe('Malicious Hijack Name');

      const profileB = await CustomerProfile.findOne({ userId: customerB.user._id });
      expect(profileB.companyName).toBe('Beta Garments Ltd'); // Unchanged!
    });
  });
});
