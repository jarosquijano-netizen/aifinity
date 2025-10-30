// Helper to get user ID from JWT token (supports both userId and id formats)
export const getUserId = (req) => {
  if (!req.user) return null;
  return req.user.id || req.user.userId || null;
};

