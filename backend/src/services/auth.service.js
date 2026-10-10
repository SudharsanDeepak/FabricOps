import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User, CustomerProfile, OperatorProfile, AuditLog } from '../models/index.js';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const authService = {
  /**
   * Issue signed JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  },

  /**
   * Set HTTP-only cookie on Express response
   */
  setTokenCookie(res, token) {
    res.cookie(env.COOKIE_NAME, token, COOKIE_OPTIONS);
  },

  /**
   * Clear auth cookie on logout
   */
  clearTokenCookie(res) {
    res.clearCookie(env.COOKIE_NAME, {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });
  },

  /**
   * Authenticate credentials and return session token + user
   */
  async login(email, password, ipAddress) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (user.status !== 'ACTIVE') {
      const error = new Error(`Account is currently ${user.status.toLowerCase()}. Please contact administrator.`);
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);

    // Audit log
    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      ipAddress,
      notes: `User logged in successfully from role ${user.role}`,
    });

    // Fetch associated profile
    let profile = null;
    if (user.role === 'CUSTOMER') {
      profile = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === 'OPERATOR') {
      profile = await OperatorProfile.findOne({ userId: user._id }).populate('assignedMachines', 'machineCode name type status');
    }

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return { user: userObj, profile, token };
  },

  /**
   * Public B2B Customer registration (Self-Service)
   * Strictly enforces role = 'CUSTOMER' regardless of incoming data
   */
  async registerCustomer(data, ipAddress) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create User record strictly as CUSTOMER
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'CUSTOMER', // Hardcoded role to block role escalation
      phone: data.phone,
      status: 'ACTIVE',
    });

    // Auto-generate customer code
    const count = await CustomerProfile.countDocuments();
    const customerCode = `CUST-${String(count + 1).padStart(4, '0')}`;

    const profile = await CustomerProfile.create({
      userId: user._id,
      customerCode,
      companyName: data.companyName,
      taxId: data.taxId,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      creditLimit: 500000,
      paymentTermsDays: 30,
      contactPerson: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });

    const token = this.generateToken(user);

    await AuditLog.create({
      actorId: user._id,
      actorRole: 'CUSTOMER',
      action: 'CUSTOMER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      ipAddress,
      notes: `New customer account registered: ${data.companyName} (${customerCode})`,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return { user: userObj, profile, token };
  },

  /**
   * Admin-only staff account creation (Operator or Admin)
   */
  async createStaffAccount(data, adminUser, ipAddress) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone,
      status: 'ACTIVE',
    });

    let profile = null;
    if (data.role === 'OPERATOR') {
      const count = await OperatorProfile.countDocuments();
      const employeeCode = data.employeeCode || `EMP-${String(count + 1).padStart(4, '0')}`;

      profile = await OperatorProfile.create({
        userId: user._id,
        employeeCode,
        department: data.department || 'WEAVING',
        skillLevel: data.skillLevel || 'LEVEL_1',
        hourlyWageRate: data.hourlyWageRate || 150,
      });
    }

    await AuditLog.create({
      actorId: adminUser._id,
      actorRole: 'ADMIN',
      action: 'STAFF_ACCOUNT_CREATED',
      entityType: 'User',
      entityId: user._id,
      ipAddress,
      notes: `Admin ${adminUser.name} created ${data.role} account for ${user.name} (${user.email})`,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return { user: userObj, profile };
  },

  /**
   * Retrieve current authenticated user and linked profile
   */
  async getCurrentUserWithProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User account not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    let profile = null;
    if (user.role === 'CUSTOMER') {
      profile = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === 'OPERATOR') {
      profile = await OperatorProfile.findOne({ userId: user._id }).populate('assignedMachines', 'machineCode name type status location');
    }

    return { user, profile };
  },

  /**
   * Update customer profile (strictly scoped to owner)
   */
  async updateCustomerProfile(userId, updateData) {
    const profile = await CustomerProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!profile) {
      const error = new Error('Customer profile not found');
      error.statusCode = 404;
      error.code = 'PROFILE_NOT_FOUND';
      throw error;
    }

    return profile;
  },

  /**
   * Admin updates operator department, wage rate, or assigned machines
   */
  async updateOperatorAssignments(operatorUserId, updateData, adminUser) {
    const profile = await OperatorProfile.findOneAndUpdate(
      { userId: operatorUserId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('assignedMachines', 'machineCode name type status');

    if (!profile) {
      const error = new Error('Operator profile not found');
      error.statusCode = 404;
      error.code = 'PROFILE_NOT_FOUND';
      throw error;
    }

    await AuditLog.create({
      actorId: adminUser._id,
      actorRole: 'ADMIN',
      action: 'OPERATOR_ASSIGNMENTS_UPDATED',
      entityType: 'OperatorProfile',
      entityId: profile._id,
      notes: `Admin ${adminUser.name} updated assignments for operator ${profile.employeeCode}`,
    });

    return profile;
  },
};
