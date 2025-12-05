// Jest setup file
// Load environment variables for testing

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-for-testing-purposes';

// Mock Next.js modules if needed
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams()
}));

// Set longer timeout for database tests
jest.setTimeout(10000);
