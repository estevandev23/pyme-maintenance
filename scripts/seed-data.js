// bcryptjs, el mismo que usa la aplicación para verificar la contraseña.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

/** NIT de las empresas que crea este script. Solo se borra lo que cuelga de ellas. */
const NITS_SEMILLA = ['900123456-1', '900234567-2', '900345678-3', '900456789-4']

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Borrar lo sembrado en ejecuciones anteriores, para que volver a ejecutar no
  // duplique equipos ni mantenimientos. Se limita a las empresas de este script:
  // los datos creados a mano desde la aplicación no se tocan.
  console.log('🧹 Limpiando lo sembrado anteriormente...')
  const empresasPrevias = await prisma.empresa.findMany({
    where: { nit: { in: NITS_SEMILLA } },
    select: { id: true },
  })
  const idsPrevios = empresasPrevias.map((e) => e.id)

  if (idsPrevios.length > 0) {
    const equiposPrevios = await prisma.equipo.findMany({
      where: { empresaId: { in: idsPrevios } },
      select: { id: true },
    })
    const equipoIds = equiposPrevios.map((e) => e.id)

    await prisma.historial.deleteMany({ where: { equipoId: { in: equipoIds } } })
    await prisma.alerta.deleteMany({
      where: { mantenimiento: { equipoId: { in: equipoIds } } },
    })
    await prisma.solicitudServicio.deleteMany({ where: { equipoId: { in: equipoIds } } })
    await prisma.mantenimiento.deleteMany({ where: { equipoId: { in: equipoIds } } })
    await prisma.equipo.deleteMany({ where: { id: { in: equipoIds } } })
    console.log(`   ${equipoIds.length} equipos anteriores retirados con lo que colgaba de ellos`)
  }

  // Crear empresas
  console.log('📦 Creando empresas...')
  const empresas = await Promise.all([
    prisma.empresa.upsert({
      where: { nit: '900123456-1' },
      update: {},
      create: {
        nombre: 'TechSolutions S.A.S',
        nit: '900123456-1',
        contacto: 'Carlos Mendoza',
        telefono: '3001234567',
        email: 'info@techsolutions.com',
        direccion: 'Calle 100 #15-20, Bogotá',
      },
    }),
    prisma.empresa.upsert({
      where: { nit: '900234567-2' },
      update: {},
      create: {
        nombre: 'InnovaTech Ltda',
        nit: '900234567-2',
        contacto: 'María Rodríguez',
        telefono: '3107654321',
        email: 'contacto@innovatech.com',
        direccion: 'Av. El Poblado #45-67, Medellín',
      },
    }),
    prisma.empresa.upsert({
      where: { nit: '900345678-3' },
      update: {},
      create: {
        nombre: 'DataCenter Colombia',
        nit: '900345678-3',
        contacto: 'Juan Pérez',
        telefono: '3209876543',
        email: 'soporte@datacenter.co',
        direccion: 'Carrera 7 #32-16, Cali',
      },
    }),
    prisma.empresa.upsert({
      where: { nit: '900456789-4' },
      update: {},
      create: {
        nombre: 'Sistemas Integrados',
        nit: '900456789-4',
        contacto: 'Laura Martínez',
        telefono: '3156789012',
        email: 'info@sistemasintegrados.com',
        direccion: 'Calle 45 #23-45, Barranquilla',
      },
    }),
  ])

  console.log(`✅ ${empresas.length} empresas creadas`)

  // Crear usuarios
  console.log('👥 Creando usuarios...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mantenpro.com' },
    update: {},
    create: {
      email: 'admin@mantenpro.com',
      password: hashedPassword,
      nombre: 'Administrador Sistema',
      role: 'ADMIN',
      activo: true,
    },
  })

  // Un técnico pertenece a una sola empresa, y el reparto de trabajo se hace
  // entre los de la empresa del equipo. Se crean dos por empresa para que ese
  // reparto por menor carga tenga entre quién elegir.
  const tecnicosSemilla = [
    { email: 'tecnico1@mantenpro.com', nombre: 'Pedro Ramírez', empresa: 0 },
    { email: 'tecnico2@mantenpro.com', nombre: 'Ana García', empresa: 0 },
    { email: 'tecnico3@mantenpro.com', nombre: 'Luis Torres', empresa: 1 },
    { email: 'tecnico4@mantenpro.com', nombre: 'Marta Ruiz', empresa: 1 },
    { email: 'tecnico5@mantenpro.com', nombre: 'Jorge Peña', empresa: 2 },
    { email: 'tecnico6@mantenpro.com', nombre: 'Elena Vargas', empresa: 2 },
    { email: 'tecnico7@mantenpro.com', nombre: 'Iván Duarte', empresa: 3 },
    { email: 'tecnico8@mantenpro.com', nombre: 'Rocío Nieto', empresa: 3 },
  ]

  const tecnicos = await Promise.all(
    tecnicosSemilla.map((t) =>
      prisma.user.upsert({
        where: { email: t.email },
        // El update repara ejecuciones anteriores que dejaron al técnico sin
        // empresa, situación que el rol no admite.
        update: { empresaId: empresas[t.empresa].id, activo: true },
        create: {
          email: t.email,
          password: hashedPassword,
          nombre: t.nombre,
          role: 'TECNICO',
          empresaId: empresas[t.empresa].id,
          activo: true,
        },
      })
    )
  )

  /** Técnicos agrupados por empresa, para no asignar trabajo fuera de la suya. */
  const tecnicosPorEmpresa = new Map()
  for (const tecnico of tecnicos) {
    const lista = tecnicosPorEmpresa.get(tecnico.empresaId) || []
    lista.push(tecnico)
    tecnicosPorEmpresa.set(tecnico.empresaId, lista)
  }

  /** Elige un técnico de la empresa del equipo, repartiendo de forma pareja. */
  let turnoTecnico = 0
  const tecnicoPara = (equipo) => {
    const candidatos = tecnicosPorEmpresa.get(equipo.empresaId) || []
    return candidatos[turnoTecnico++ % candidatos.length]
  }

  const clientes = await Promise.all([
    prisma.user.upsert({
      where: { email: 'cliente1@techsolutions.com' },
      update: {},
      create: {
        email: 'cliente1@techsolutions.com',
        password: hashedPassword,
        nombre: 'Roberto Silva',
        role: 'CLIENTE',
        empresaId: empresas[0].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente2@innovatech.com' },
      update: {},
      create: {
        email: 'cliente2@innovatech.com',
        password: hashedPassword,
        nombre: 'Sandra López',
        role: 'CLIENTE',
        empresaId: empresas[1].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente3@datacenter.co' },
      update: {},
      create: {
        email: 'cliente3@datacenter.co',
        password: hashedPassword,
        nombre: 'Miguel Ángel Castro',
        role: 'CLIENTE',
        empresaId: empresas[2].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente4@sistemasintegrados.com' },
      update: {},
      create: {
        email: 'cliente4@sistemasintegrados.com',
        password: hashedPassword,
        nombre: 'Patricia Gómez',
        role: 'CLIENTE',
        empresaId: empresas[3].id,
        activo: true,
      },
    }),
  ])

  console.log(`✅ ${1 + tecnicos.length + clientes.length} usuarios creados`)
  console.log('   - Usuario: admin@mantenpro.com / password123')
  console.log(`   - Técnicos: tecnico1..${tecnicos.length}@mantenpro.com / password123 (dos por empresa)`)
  console.log('   - Clientes: cliente1@techsolutions.com, cliente2@innovatech.com, etc. / password123')

  // Crear equipos
  console.log('💻 Creando equipos...')
  const equipos = []

  const tiposEquipo = ['Computador de Escritorio', 'Laptop', 'Servidor', 'Impresora', 'Router', 'Switch', 'Firewall']
  const marcas = ['Dell', 'HP', 'Lenovo', 'Cisco', 'Epson', 'Canon', 'Fortinet']
  const estados = ['ACTIVO', 'ACTIVO', 'ACTIVO', 'ACTIVO', 'EN_MANTENIMIENTO', 'INACTIVO']

  for (let i = 0; i < empresas.length; i++) {
    const empresa = empresas[i]
    const numEquipos = 8 + Math.floor(Math.random() * 5) // Entre 8 y 12 equipos por empresa

    for (let j = 0; j < numEquipos; j++) {
      const tipoIndex = Math.floor(Math.random() * tiposEquipo.length)
      const equipo = await prisma.equipo.create({
        data: {
          tipo: tiposEquipo[tipoIndex],
          marca: marcas[tipoIndex],
          modelo: `Modelo-${Math.floor(Math.random() * 9000) + 1000}`,
          serial: `SN-${empresa.nit.substring(0, 6)}-${Date.now()}-${j}`,
          estado: estados[Math.floor(Math.random() * estados.length)],
          ubicacion: `Oficina ${Math.floor(Math.random() * 5) + 1}`,
          empresaId: empresa.id,
        },
      })
      equipos.push(equipo)
    }
  }

  console.log(`✅ ${equipos.length} equipos creados`)

  // Crear mantenimientos
  console.log('🔧 Creando mantenimientos...')
  const mantenimientos = []

  const tipos = ['PREVENTIVO', 'CORRECTIVO']
  const estadosMantenimiento = ['COMPLETADO', 'PROGRAMADO', 'EN_PROCESO', 'PROGRAMADO', 'COMPLETADO']

  // Mantenimientos pasados (últimos 6 meses)
  const hoy = new Date()
  for (let i = 0; i < 40; i++) {
    const equipo = equipos[Math.floor(Math.random() * equipos.length)]
    const tecnico = tecnicoPara(equipo)
    const tipo = tipos[Math.floor(Math.random() * tipos.length)]
    const estado = 'COMPLETADO'

    // Fechas en los últimos 6 meses
    const diasAtras = Math.floor(Math.random() * 180)
    const fechaProgramada = new Date(hoy)
    fechaProgramada.setDate(fechaProgramada.getDate() - diasAtras)

    const fechaRealizada = new Date(fechaProgramada)
    // De -2 a +3 días: hay trabajos adelantados y atrasados, no solo atrasados.
    fechaRealizada.setDate(fechaRealizada.getDate() + Math.floor(Math.random() * 6) - 2)

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        equipoId: equipo.id,
        tecnicoId: tecnico.id,
        tipo,
        estado,
        fechaProgramada,
        fechaRealizada,
        descripcion: tipo === 'PREVENTIVO'
          ? `Mantenimiento preventivo programado: limpieza, revisión de componentes, actualización de software`
          : `Mantenimiento correctivo: ${['Falla de hardware', 'Error de sistema', 'Problema de red', 'Actualización requerida'][Math.floor(Math.random() * 4)]}`,
        observaciones: `Trabajo completado exitosamente. ${['Sin novedades', 'Se reemplazó componente', 'Se realizó configuración', 'Sistema operativo actualizado'][Math.floor(Math.random() * 4)]}`,
      },
    })

    // Crear entrada de historial
    await prisma.historial.create({
      data: {
        equipoId: equipo.id,
        mantenimientoId: mantenimiento.id,
        tecnicoId: tecnico.id,
        fecha: fechaRealizada,
        observaciones: `Mantenimiento ${tipo.toLowerCase()} completado: ${mantenimiento.descripcion}`,
      },
    })

    mantenimientos.push(mantenimiento)
  }

  // Mantenimientos futuros y en proceso
  for (let i = 0; i < 30; i++) {
    const equipo = equipos[Math.floor(Math.random() * equipos.length)]
    const tecnico = tecnicoPara(equipo)
    const tipo = tipos[Math.floor(Math.random() * tipos.length)]
    const estado = estadosMantenimiento[Math.floor(Math.random() * estadosMantenimiento.length)]

    // Fechas futuras (próximos 60 días)
    const diasFuturos = Math.floor(Math.random() * 60)
    const fechaProgramada = new Date(hoy)
    fechaProgramada.setDate(fechaProgramada.getDate() + diasFuturos)

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        equipoId: equipo.id,
        tecnicoId: tecnico.id,
        tipo,
        estado: estado === 'COMPLETADO' ? 'PROGRAMADO' : estado,
        fechaProgramada,
        fechaRealizada: null,
        descripcion: tipo === 'PREVENTIVO'
          ? `Mantenimiento preventivo programado: limpieza, revisión de componentes, actualización de software`
          : `Mantenimiento correctivo: ${['Revisión de falla reportada', 'Actualización de firmware', 'Diagnóstico de problema', 'Instalación de componente'][Math.floor(Math.random() * 4)]}`,
        observaciones: estado === 'EN_PROCESO' ? 'Trabajo en progreso' : null,
      },
    })

    // Crear entrada de historial para programación
    await prisma.historial.create({
      data: {
        equipoId: equipo.id,
        mantenimientoId: mantenimiento.id,
        tecnicoId: tecnico.id,
        observaciones: `Mantenimiento ${tipo.toLowerCase()} programado para el ${fechaProgramada.toLocaleDateString('es-CO')}`,
      },
    })

    mantenimientos.push(mantenimiento)
  }

  console.log(`✅ ${mantenimientos.length} mantenimientos creados`)
  console.log(`✅ ${mantenimientos.length} entradas de historial creadas`)

  console.log('\n🎉 ¡Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log(`   - ${empresas.length} empresas`)
  console.log(`   - ${1 + tecnicos.length + clientes.length} usuarios`)
  console.log(`   - ${equipos.length} equipos`)
  console.log(`   - ${mantenimientos.length} mantenimientos`)
  console.log('\n🔑 Credenciales de acceso:')
  console.log('   Admin: admin@mantenpro.com / password123')
  console.log('   Técnico: tecnico1@mantenpro.com / password123')
  console.log('   Cliente: cliente1@techsolutions.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
