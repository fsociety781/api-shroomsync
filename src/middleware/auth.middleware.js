// ============================================
// ShroomSync — Authentication Middleware
// ============================================

const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../utils/prisma');
const ApiResponse = require('../utils/api-response');

async function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        farmName: true,
        farmAddress: true,
        role: true,
        isFirstLogin: true,
        isProfileCompleted: true,
      },
    });

    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Memastikan user terautentikasi dengan token JWT valid.
 */
async function requireAuth(req, res, next) {
  const user = await verifyToken(req);
  if (!user) {
    return ApiResponse.error(res, 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', 401);
  }

  req.user = user;
  next();
}

/**
 * Middleware: Memeriksa token jika ada, tapi tidak memblokir jika tidak ada.
 */
async function optionalAuth(req, res, next) {
  const user = await verifyToken(req);
  if (user) {
    req.user = user;
  }
  next();
}

/**
 * Middleware: Hanya untuk role 'admin'.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Akses ditolak. Fitur ini hanya untuk admin sistem.', 403);
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
};
