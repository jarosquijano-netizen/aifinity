import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 optionalAuth - Authorization header:', authHeader ? 'present' : 'missing');
  console.log('🔐 optionalAuth - Token:', token ? `${token.substring(0, 20)}...` : 'missing');

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        console.log('✅ optionalAuth - Token verified, user:', user);
        req.user = user;
      } else {
        console.log('❌ optionalAuth - Token verification failed:', err.message);
      }
    });
  } else {
    console.log('⚠️ optionalAuth - No token provided, proceeding without auth');
  }
  next();
};



