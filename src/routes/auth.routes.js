// ============================================
// ShroomSync — Authentication & Onboarding Routes
// ============================================

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/register-farmer', optionalAuth, authController.registerFarmer);

// Protected routes (wajib token login)
router.get('/me', requireAuth, authController.getMe);
router.post('/complete-onboarding', requireAuth, authController.completeOnboarding);

module.exports = router;
