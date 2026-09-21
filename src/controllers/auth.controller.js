// ============================================
// ShroomSync — Auth & Onboarding Controller
// ============================================

const authService = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

const authController = {
  /**
   * POST /api/v1/auth/login
   * Login pengguna & deteksi akun baru vs akun lama
   */
  login: asyncHandler(async (req, res) => {
    const { identifier, username, email, password } = req.body;
    const loginIdentifier = identifier || username || email;

    const result = await authService.login({
      identifier: loginIdentifier,
      password,
    });

    const message = result.mustSetupProfile
      ? 'Login berhasil. Silakan lengkapi data diri dan ganti password default Anda.'
      : 'Login berhasil. Selamat datang kembali.';

    ApiResponse.success(res, result, message);
  }),

  /**
   * POST /api/v1/auth/complete-onboarding
   * Wajib bagi akun baru: ganti password default & isi data diri
   */
  completeOnboarding: asyncHandler(async (req, res) => {
    const result = await authService.completeOnboarding(req.user.id, req.body);
    ApiResponse.success(
      res,
      result,
      'Profil berhasil diperbarui dan password berhasil diganti. Selamat datang di ShroomSync!'
    );
  }),

  /**
   * GET /api/v1/auth/me
   * Mendapatkan profil user yang sedang login
   */
  getMe: asyncHandler(async (req, res) => {
    const result = await authService.getMe(req.user.id);
    ApiResponse.success(res, result);
  }),

  /**
   * POST /api/v1/auth/register-farmer
   * Registrasi akun baru (Admin / Inisialisasi awal)
   */
  registerFarmer: asyncHandler(async (req, res) => {
    const result = await authService.registerFarmer(req.body);
    ApiResponse.success(
      res,
      result,
      'Akun petani berhasil dibuat dengan status akun baru (wajib onboarding saat login pertama).',
      201
    );
  }),
};

module.exports = authController;
