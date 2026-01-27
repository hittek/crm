const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Hash password function
async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  console.log('🗑️  Clearing existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.task.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.savedView.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Create organization first
  const organization = await prisma.organization.create({
    data: {
      name: 'Hittek',
      slug: 'hittek',
      primaryColor: '#2563eb',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      locale: 'es-MX',
      isActive: true,
    },
  })
  console.log(`✅ Created organization: ${organization.name}`)

  // Default password for all seeded users (in production, each user would have their own)
  const defaultPassword = await hashPassword('password123')

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@hittek.com',
        password: defaultPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@hittek.com',
        password: defaultPassword,
        name: 'Manager User',
        role: 'manager',
        isActive: true,
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'vendedor1@hittek.com',
        password: defaultPassword,
        name: 'Juan Vendedor',
        role: 'user',
        isActive: true,
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'vendedor2@hittek.com',
        password: defaultPassword,
        name: 'María Vendedora',
        role: 'user',
        isActive: true,
        organizationId: organization.id,
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users (default password: password123)`)

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        firstName: 'María',
        lastName: 'González',
        email: 'maria.gonzalez@empresa.com.mx',
        phone: '+52 55 1234 5678',
        company: 'Grupo Industrial MX',
        role: 'Directora de Operaciones',
        status: 'active',
        source: 'referral',
        notes: 'Contacto clave para proyecto de transformación digital',
        organizationId: organization.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Carlos',
        lastName: 'Ramírez',
        email: 'carlos.ramirez@techsolutions.mx',
        phone: '+52 33 9876 5432',
        company: 'Tech Solutions SA de CV',
        role: 'Gerente de TI',
        status: 'active',
        source: 'website',
        organizationId: organization.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Ana',
        lastName: 'Martínez',
        email: 'ana.martinez@consultoria.mx',
        phone: '+52 81 5555 1234',
        company: 'Consultoría Estratégica',
        role: 'Socia Fundadora',
        status: 'lead',
        source: 'linkedin',
        organizationId: organization.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Roberto',
        lastName: 'Hernández',
        email: 'roberto.h@finanzasplus.mx',
        phone: '+52 55 7777 8888',
        company: 'Finanzas Plus',
        role: 'Director General',
        status: 'active',
        source: 'event',
        notes: 'Conocido en expo fintech 2024',
        organizationId: organization.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Sofía',
        lastName: 'López',
        email: 'sofia.lopez@retail.mx',
        phone: '+52 442 3333 4444',
        company: 'Retail Moderno',
        role: 'Jefa de Compras',
        status: 'inactive',
        source: 'cold_call',
        organizationId: organization.id,
      },
    }),
  ])

  console.log(`✅ Created ${contacts.length} contacts`)

  // Create deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: 'Implementación ERP',
        contactId: contacts[0].id,
        value: 450000,
        stage: 'proposal',
        probability: 50,
        expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: 'Propuesta enviada, esperando respuesta del comité',
        organizationId: organization.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Licencias Software',
        contactId: contacts[1].id,
        value: 85000,
        stage: 'negotiation',
        probability: 75,
        expectedClose: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        organizationId: organization.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Consultoría Estratégica Q1',
        contactId: contacts[2].id,
        value: 120000,
        stage: 'qualified',
        probability: 25,
        expectedClose: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        organizationId: organization.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Sistema de Facturación',
        contactId: contacts[3].id,
        value: 65000,
        stage: 'lead',
        probability: 10,
        expectedClose: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        organizationId: organization.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Migración Cloud',
        contactId: contacts[0].id,
        value: 280000,
        stage: 'won',
        probability: 100,
        expectedClose: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        actualClose: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        organizationId: organization.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Soporte Técnico Anual',
        contactId: contacts[4].id,
        value: 48000,
        stage: 'lost',
        probability: 0,
        expectedClose: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        actualClose: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lostReason: 'Eligieron a la competencia por precio',
        organizationId: organization.id,
      },
    }),
  ])

  console.log(`✅ Created ${deals.length} deals`)

  // Create tasks
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Llamar a María para seguimiento de propuesta',
        type: 'call',
        priority: 'high',
        dueDate: today,
        contact: { connect: { id: contacts[0].id } },
        deal: { connect: { id: deals[0].id } },
        assignedTo: { connect: { id: users[2].id } }, // Juan Vendedor
        organization: { connect: { id: organization.id } },
        visibility: 'org',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Enviar cotización actualizada a Carlos',
        type: 'email',
        priority: 'high',
        dueDate: today,
        contact: { connect: { id: contacts[1].id } },
        deal: { connect: { id: deals[1].id } },
        assignedTo: { connect: { id: users[3].id } }, // María Vendedora
        organization: { connect: { id: organization.id } },
        visibility: 'assignee',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Preparar presentación para Ana',
        type: 'todo',
        priority: 'medium',
        dueDate: tomorrow,
        contact: { connect: { id: contacts[2].id } },
        deal: { connect: { id: deals[2].id } },
        assignedTo: { connect: { id: users[2].id } },
        organization: { connect: { id: organization.id } },
        visibility: 'org',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Reunión con equipo de Finanzas Plus',
        type: 'meeting',
        priority: 'medium',
        dueDate: nextWeek,
        contact: { connect: { id: contacts[3].id } },
        deal: { connect: { id: deals[3].id } },
        description: 'Sala de juntas virtual - enviar link',
        assignedTo: { connect: { id: users[1].id } }, // Manager
        organization: { connect: { id: organization.id } },
        visibility: 'org',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Revisar contrato con legal',
        type: 'todo',
        priority: 'low',
        dueDate: nextWeek,
        deal: { connect: { id: deals[1].id } },
        assignedTo: { connect: { id: users[0].id } }, // Admin
        organization: { connect: { id: organization.id } },
        visibility: 'org',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Dar seguimiento pendiente',
        type: 'follow_up',
        priority: 'high',
        dueDate: yesterday,
        contact: { connect: { id: contacts[2].id } },
        assignedTo: { connect: { id: users[3].id } },
        organization: { connect: { id: organization.id } },
        visibility: 'assignee',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Actualizar CRM con notas de llamada',
        type: 'todo',
        priority: 'low',
        dueDate: yesterday,
        status: 'completed',
        completedAt: today,
        organization: { connect: { id: organization.id } },
        visibility: 'org',
      },
    }),
  ])

  console.log(`✅ Created ${tasks.length} tasks`)

  // Create activities
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        type: 'email',
        subject: 'Propuesta de implementación ERP',
        content: 'Se envió propuesta detallada con alcance y costos',
        contact: { connect: { id: contacts[0].id } },
        deal: { connect: { id: deals[0].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'call',
        subject: 'Llamada inicial con Carlos',
        content: 'Discutimos necesidades de licenciamiento. Interesados en paquete enterprise.',
        duration: 25,
        contact: { connect: { id: contacts[1].id } },
        deal: { connect: { id: deals[1].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'meeting',
        subject: 'Presentación de servicios',
        content: 'Reunión presencial en oficinas de Consultoría Estratégica',
        duration: 60,
        contact: { connect: { id: contacts[2].id } },
        deal: { connect: { id: deals[2].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'note',
        subject: 'Nota interna',
        content: 'Roberto mencionó que tienen presupuesto aprobado para Q2',
        contact: { connect: { id: contacts[3].id } },
        deal: { connect: { id: deals[3].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'deal_updated',
        subject: 'Negocio cerrado: Migración Cloud',
        content: 'Contrato firmado por $280,000 MXN',
        contact: { connect: { id: contacts[0].id } },
        deal: { connect: { id: deals[4].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'email',
        subject: 'Seguimiento post-demo',
        content: 'Enviado resumen de la demo y próximos pasos',
        contact: { connect: { id: contacts[1].id } },
        deal: { connect: { id: deals[1].id } },
        organization: { connect: { id: organization.id } },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  console.log(`✅ Created ${activities.length} activities`)

  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
