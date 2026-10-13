export function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  return res.status(401).json({
    error: 'Authentication required. Please log in to access the organizer dashboard.',
    code: 'UNAUTHENTICATED'
  });
}
