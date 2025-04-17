export const mockClerk = {
  auth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: () => Promise.resolve('test-token'),
  }),
  currentUser: () => ({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  }),
  protect: () => (req: any) => req,
  clerkMiddleware: () => (req: any) => req,
} 