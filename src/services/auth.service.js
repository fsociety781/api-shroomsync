// ============================================
// ShroomSync — Authentication & Onboarding Service
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../utils/prisma');
const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} = require('../utils/errors');

function formatSafeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

class AuthService {
  /**
   * Login user dengan username/email & password.
   * Mendeteksi apakah akun baru (first-time login) atau akun lama.
   */
  async login({ identifier, password }) {
    if (!identifier || !password) {
      throw new ValidationError('Username/email dan password wajib diisi');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedError('Username/email atau password salah');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Username/email atau password salah');
    }

    const token = generateToken(user);
    const safeUser = formatSafeUser(user);

    // Cek apakah akun baru yang belum menyelesaikan setup profil
    const mustSetupProfile = user.isFirstLogin || !user.isProfileCompleted;
    const nextStep = mustSetupProfile ? 'complete_profile' : 'dashboard';

    return {
      token,
      user: safeUser,
      mustSetupProfile,
      nextStep,
    };
  }

  /**
   * Selesaikan onboarding akun baru:
   * 1. Verifikasi password default saat ini
   * 2. Ganti ke password baru
   * 3. Simpan data diri lengkap (nama lengkap, kontak, nama usaha kumbung, alamat)
   * 4. Set isFirstLogin = false, isProfileCompleted = true
   */
  async completeOnboarding(userId, data) {
    const { currentPassword, newPassword, fullName, phoneNumber, farmName, farmAddress } = data;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Password saat ini dan password baru wajib diisi');
    }

    if (newPassword.length < 6) {
      throw new ValidationError('Password baru minimal harus 6 karakter');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User tidak ditemukan');
    }

    // Verifikasi password saat ini
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentMatch) {
      throw new ValidationError('Password lama/default tidak cocok');
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        fullName: fullName !== undefined ? fullName : user.fullName,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
        farmName: farmName !== undefined ? farmName : user.farmName,
        farmAddress: farmAddress !== undefined ? farmAddress : user.farmAddress,
        isFirstLogin: false,
        isProfileCompleted: true,
      },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    const refreshedToken = generateToken(updatedUser);
    const safeUser = formatSafeUser(updatedUser);

    return {
      token: refreshedToken,
      user: safeUser,
      mustSetupProfile: false,
      nextStep: 'dashboard',
    };
  }

  /**
   * Mendapatkan profil user yang sedang login beserta jumlah device/kumbung yang dimiliki.
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User tidak ditemukan');
    }

    const safeUser = formatSafeUser(user);
    const mustSetupProfile = user.isFirstLogin || !user.isProfileCompleted;

    return {
      user: safeUser,
      deviceCount: user._count.devices,
      mustSetupProfile,
      nextStep: mustSetupProfile ? 'complete_profile' : 'dashboard',
    };
  }

  /**
   * Registrasi akun baru (bisa dipanggil oleh Admin atau sistem registrasi awal).
   * Akun baru otomatis memiliki status isFirstLogin = true.
   */
  async registerFarmer(data) {
    const { email, username, password, fullName, phoneNumber, farmName, farmAddress, role = 'farmer' } = data;

    if (!email || !username || !password) {
      throw new ValidationError('Email, username, dan password wajib diisi');
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existing) {
      throw new ConflictError('Email atau username sudah terdaftar dalam sistem');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName: fullName || null,
        phoneNumber: phoneNumber || null,
        farmName: farmName || null,
        farmAddress: farmAddress || null,
        role,
        isFirstLogin: true,
        isProfileCompleted: false,
      },
    });

    return formatSafeUser(newUser);
  }
}

module.exports = new AuthService();
