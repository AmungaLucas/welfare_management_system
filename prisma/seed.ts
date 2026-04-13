import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create districts
  const districtNames = [
    'BETHLEHEM', 'SAMARIA', 'NAZARETH', 'JERUSALEM',
    'GALILEE', 'BETHANY', 'JUDEA', 'DIASPORA', 'UNIVERSAL'
  ];

  for (const name of districtNames) {
    await prisma.district.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }
  console.log('✅ Districts created');

  // Create default admin user
  const adminEmail = 'admin@welfare.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        phone: '0712345678',
      },
    });
    console.log('✅ Admin user created (admin@welfare.com / admin123)');
  }

  // Create default settings
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        monthlyContributionAmount: 200,
        registrationFee: 200,
        annualRenewalFee: 200,
        joiningFeeNewMember: 2600,
        joiningFeeOldMember: 5000,
        nuclearBenefitAmount: 100000,
        parentBenefitAmount: 60000,
        nuclearContributionPerMember: 300,
        parentContributionPerMember: 200,
        childCoverageMaxAge: 25,
        waitingPeriodMonths: 3,
        redAlertThreshold: 2,
        suspensionThreshold: 3,
        suspensionDurationMonths: 6,
        removalThreshold: 6,
        maxBurialAttendees: 2,
        newChurchMemberYears: 2,
      },
    });
    console.log('✅ Default settings created');
  }

  // Create sample members
  const districts = await prisma.district.findMany();
  const sampleMembers = [
    {
      churchMembershipNo: 'ACK/UTW/BTH/001',
      firstName: 'John',
      lastName: 'Mwangi',
      phone: '0711000001',
      email: 'john.mwangi@email.com',
      districtName: 'BETHLEHEM',
      status: 'ACTIVE' as const,
      joiningFeePaid: 5000,
      registrationFeePaid: 200,
      dateJoinedWelfare: new Date('2024-06-15'),
      churchMembershipDate: new Date('2020-01-15'),
      churchDurationYears: 5,
      isNewChurchMember: false,
      spouseName: 'Mary Mwangi',
      spouseAlive: true,
      nextOfKinName: 'Peter Mwangi',
      nextOfKinPhone: '0711000099',
      nextOfKinRelationship: 'Brother',
    },
    {
      churchMembershipNo: 'ACK/UTW/SAM/002',
      firstName: 'Grace',
      lastName: 'Wanjiku',
      phone: '0711000002',
      email: 'grace.wanjiku@email.com',
      districtName: 'SAMARIA',
      status: 'ACTIVE' as const,
      joiningFeePaid: 2600,
      registrationFeePaid: 200,
      dateJoinedWelfare: new Date('2024-08-20'),
      churchMembershipDate: new Date('2023-11-01'),
      churchDurationYears: 1,
      isNewChurchMember: true,
      spouseName: 'Samuel Wanjiku',
      spouseAlive: true,
      nextOfKinName: 'Agnes Wanjiku',
      nextOfKinPhone: '0711000098',
      nextOfKinRelationship: 'Mother',
    },
    {
      churchMembershipNo: 'ACK/UTW/NAZ/003',
      firstName: 'Joseph',
      lastName: 'Otieno',
      phone: '0711000003',
      email: 'joseph.otieno@email.com',
      districtName: 'NAZARETH',
      status: 'ACTIVE' as const,
      joiningFeePaid: 5000,
      registrationFeePaid: 200,
      dateJoinedWelfare: new Date('2024-03-10'),
      churchMembershipDate: new Date('2019-06-01'),
      churchDurationYears: 6,
      isNewChurchMember: false,
      spouseName: '',
      spouseAlive: null,
      nextOfKinName: 'James Otieno',
      nextOfKinPhone: '0711000097',
      nextOfKinRelationship: 'Brother',
    },
    {
      churchMembershipNo: 'ACK/UTW/JER/004',
      firstName: 'Faith',
      lastName: 'Akinyi',
      phone: '0711000004',
      email: 'faith.akinyi@email.com',
      districtName: 'JERUSALEM',
      status: 'PENDING_APPROVAL' as const,
      joiningFeePaid: 0,
      registrationFeePaid: 0,
      churchMembershipDate: new Date('2024-12-01'),
      churchDurationYears: 0,
      isNewChurchMember: true,
      nextOfKinName: 'Daniel Akinyi',
      nextOfKinPhone: '0711000096',
      nextOfKinRelationship: 'Father',
    },
    {
      churchMembershipNo: 'ACK/UTW/GAL/005',
      firstName: 'David',
      lastName: 'Kamau',
      phone: '0711000005',
      email: 'david.kamau@email.com',
      districtName: 'GALILEE',
      status: 'ACTIVE' as const,
      joiningFeePaid: 5000,
      registrationFeePaid: 200,
      dateJoinedWelfare: new Date('2024-01-05'),
      churchMembershipDate: new Date('2018-03-15'),
      churchDurationYears: 7,
      isNewChurchMember: false,
      spouseName: 'Ruth Kamau',
      spouseAlive: true,
      nextOfKinName: 'Stephen Kamau',
      nextOfKinPhone: '0711000095',
      nextOfKinRelationship: 'Father',
      consecutiveArrears: 1,
      totalDefaultEvents: 1,
    },
  ];

  for (const m of sampleMembers) {
    const district = districts.find((d) => d.name === m.districtName);
    if (!district) continue;

    const existing = await prisma.member.findUnique({
      where: { churchMembershipNo: m.churchMembershipNo },
    });

    if (!existing) {
      const member = await prisma.member.create({
        data: {
          churchMembershipNo: m.churchMembershipNo,
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone,
          email: m.email,
          districtId: district.id,
          status: m.status,
          joiningFeePaid: m.joiningFeePaid,
          registrationFeePaid: m.registrationFeePaid,
          dateJoinedWelfare: m.dateJoinedWelfare,
          churchMembershipDate: m.churchMembershipDate,
          churchDurationYears: m.churchDurationYears,
          isNewChurchMember: m.isNewChurchMember,
          spouseName: m.spouseName || undefined,
          spouseAlive: m.spouseAlive ?? undefined,
          nextOfKinName: m.nextOfKinName,
          nextOfKinPhone: m.nextOfKinPhone,
          nextOfKinRelationship: m.nextOfKinRelationship,
          consecutiveArrears: m.consecutiveArrears ?? 0,
          totalDefaultEvents: m.totalDefaultEvents ?? 0,
        },
      });

      // Create user account for active members
      if (m.status === 'ACTIVE') {
        const email = m.email || `${m.churchMembershipNo.toLowerCase().replace(/\//g, '_')}@welfare.local`;
        const passwordHash = await bcrypt.hash('member123', 10);
        await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: 'MEMBER',
            isActive: true,
            phone: m.phone,
            member: { connect: { id: member.id } },
          },
        });
      }
    }
  }
  console.log('✅ Sample members created');

  // Create some sample contributions
  const activeMembers = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
  });

  const now = new Date();
  for (const member of activeMembers) {
    for (let monthOffset = 1; monthOffset <= 6; monthOffset++) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const existing = await prisma.contribution.findUnique({
        where: {
          memberId_year_month: {
            memberId: member.id,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
          },
        },
      });
      if (!existing) {
        await prisma.contribution.create({
          data: {
            memberId: member.id,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            amount: 200,
            paymentMethod: 'MPESA',
            mpesaRef: `SBK${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
            status: 'COMPLETED',
            paidDate: new Date(date.getFullYear(), date.getMonth() + 1, 15),
          },
        });
      }
    }
  }
  console.log('✅ Sample contributions created');

  console.log('\n🎉 Seeding complete!');
  console.log('Admin login: admin@welfare.com / admin123');
  console.log('Member login: ACK/UTW/BTH/001 + 0711000001 (password: member123)');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
