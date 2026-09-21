const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] 🌱 Seeding default users & devices...');

  const defaultPassword = await bcrypt.hash('PasswordDefault123!', 10);
  const activePassword = await bcrypt.hash('PasswordRahasiaBaru2026', 10);

  // 1. Akun Petani Baru (Untuk test alur login pertama & onboarding di Postman)
  const petaniBaru = await prisma.user.upsert({
    where: { username: 'petani_baru' },
    update: {},
    create: {
      username: 'petani_baru',
      email: 'petani.baru@shroomsync.local',
      password: defaultPassword,
      role: 'farmer',
      isFirstLogin: true,
      isProfileCompleted: false,
    },
  });
  console.log(`[SEED] ✅ User 1: "${petaniBaru.username}" | Password: "PasswordDefault123!" (Status: Akun Baru / Wajib Onboarding)`);

  // 2. Akun Petani Aktif (Untuk test langsung login dashboard tanpa onboarding)
  const petaniAktif = await prisma.user.upsert({
    where: { username: 'petani_sukamaju' },
    update: {},
    create: {
      username: 'petani_sukamaju',
      email: 'budi@shroomsync.local',
      password: activePassword,
      fullName: 'Pak Budi Santoso',
      phoneNumber: '081234567890',
      farmName: 'Kumbung Berkah Tiram',
      farmAddress: 'Desa Sukamaju RT 02 RW 01, Lembang, Bandung Barat',
      role: 'farmer',
      isFirstLogin: false,
      isProfileCompleted: true,
    },
  });
  console.log(`[SEED] ✅ User 2: "${petaniAktif.username}" | Password: "PasswordRahasiaBaru2026" (Status: Aktif / Profil Lengkap)`);

  // 3. Sample Device SCM-ESP32-ABCD (Sudah teraktivasi untuk petani_sukamaju)
  const sampleDevice = await prisma.device.upsert({
    where: { deviceId: 'SCM-ESP32-ABCD' },
    update: {},
    create: {
      deviceId: 'SCM-ESP32-ABCD',
      name: 'Kumbung A (Tiram Putih)',
      userId: petaniAktif.id,
      activatedAt: new Date(),
      hardwareVersion: '1.0',
      firmwareVersion: '1.1.0',
      isOnline: false,
      config: {
        create: {
          controlMode: 2,
          minS: 26,
          midS: 28,
          minK: 80,
          midK: 90,
          timerMinute: 1,
          timerSecond: 30,
        },
      },
    },
  });
  console.log(`[SEED] ✅ Device: "${sampleDevice.deviceId}" (Tautan Pemilik: ${petaniAktif.username})`);

  console.log('[SEED] 🎉 Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

