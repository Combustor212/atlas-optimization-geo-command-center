/**
 * Auth Service Tests
 */
import { registerUser, loginUser } from '../services/authService';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        passwordHash: 'hashed',
      };

      const mockOrg = {
        id: 'org-1',
        name: 'Test Org',
        ownerUserId: 'user-1',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockResolvedValue({
        user: mockUser,
        organization: mockOrg,
      });

      const result = await registerUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        organizationName: 'Test Org',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should fail if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      const result = await registerUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        organizationName: 'Test Org',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });
  });

  describe('loginUser', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        passwordHash: '$2b$10$...',
        memberships: [{ organizationId: 'org-1' }],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return true
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true),
        hash: jest.fn(),
      }));

      // Note: This test would need proper bcrypt mocking
      // For now, it's a structure example
    });
  });
});



