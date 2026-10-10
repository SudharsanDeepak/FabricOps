import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerRegisterSchema = z.object({
  name: z.string().min(2, 'Contact person name must be at least 2 characters').trim(),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  companyName: z.string().min(2, 'Company name is required').trim(),
  taxId: z.string().optional(),
  billingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default('India'),
    })
    .optional(),
  shippingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default('India'),
    })
    .optional(),
  // Strict prevention: Even if client sends 'role', validator strips/ignores it, hardcoding to CUSTOMER
});

export const createStaffUserSchema = z.object({
  name: z.string().min(2, 'Name is required').trim(),
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'OPERATOR'], {
    errorMap: () => ({ message: 'Staff role must be either ADMIN or OPERATOR' }),
  }),
  phone: z.string().optional(),
  // Operator specific fields
  department: z.enum(['SPINNING', 'WEAVING', 'DYEING', 'FINISHING', 'MAINTENANCE', 'QC']).optional(),
  skillLevel: z.enum(['TRAINEE', 'LEVEL_1', 'LEVEL_2', 'MASTER_WEAVER']).optional(),
  hourlyWageRate: z.number().min(0).optional(),
  employeeCode: z.string().optional(),
});

export const updateCustomerProfileSchema = z.object({
  companyName: z.string().min(2).optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  billingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  shippingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  contactPerson: z
    .object({
      name: z.string().optional(),
      designation: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});
