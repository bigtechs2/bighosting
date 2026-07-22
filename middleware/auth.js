// middleware/auth.js
// This file checks if a user is logged in before allowing them to access certain APIs

import jwt from 'jsonwebtoken';

export default function authMiddleware(req, res, next) {
  // Get the token from the request headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user data to the request so other APIs can use it
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      full_name: decoded.full_name,
      country: decoded.country
    };
    
    // Proceed to the next function (the actual API)
    next();
    
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}