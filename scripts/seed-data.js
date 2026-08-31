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
    // Los mantenimientos van ANTES que las solicitudes.
    //
    // `Mantenimiento.solicitudId` es una clave foránea con borrado restringido:
    // Postgres la comprueba de inmediato, no al final de la sentencia, así que
    // borrar una solicitud que ya generó un mantenimiento aborta. Y como estas
    // líneas no van en una transacción, al reventar dejarían el historial y las
    // alertas ya borrados y la base a medio limpiar, sin que reejecutar el
    // script lo arregle.
    //
    // Al revés no hay problema: la clave vive en el lado del mantenimiento.
    await prisma.mantenimiento.deleteMany({ where: { equipoId: { in: equipoIds } } })
    await prisma.solicitudServicio.deleteMany({ where: { equipoId: { in: equipoIds } } })
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
        email: 'info@techsolutions.example',
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
        email: 'contacto@innovatech.example',
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
        email: 'soporte@datacenter.example',
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
        email: 'info@sistemasintegrados.example',
        direccion: 'Calle 45 #23-45, Barranquilla',
      },
    }),
  ])

  console.log(`✅ ${empresas.length} empresas creadas`)

  // Crear usuarios
  console.log('👥 Creando usuarios...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mantenpro.example' },
    update: {},
    create: {
      email: 'admin@mantenpro.example',
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
    { email: 'tecnico1@mantenpro.example', nombre: 'Pedro Ramírez', empresa: 0 },
    { email: 'tecnico2@mantenpro.example', nombre: 'Ana García', empresa: 0 },
    { email: 'tecnico3@mantenpro.example', nombre: 'Luis Torres', empresa: 1 },
    { email: 'tecnico4@mantenpro.example', nombre: 'Marta Ruiz', empresa: 1 },
    { email: 'tecnico5@mantenpro.example', nombre: 'Jorge Peña', empresa: 2 },
    { email: 'tecnico6@mantenpro.example', nombre: 'Elena Vargas', empresa: 2 },
    { email: 'tecnico7@mantenpro.example', nombre: 'Iván Duarte', empresa: 3 },
    { email: 'tecnico8@mantenpro.example', nombre: 'Rocío Nieto', empresa: 3 },
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

  /**
   * Elige un técnico de la empresa del equipo, repartiendo de forma pareja.
   *
   * Devuelve `null` si la empresa no tiene ninguno. Antes el módulo sobre una
   * lista vacía daba NaN, `candidatos[NaN]` era `undefined` y el script moría al
   * leer su identificador: justo al intentar sembrar el caso que hace falta para
   * probar el mantenimiento sin técnico.
   */
  let turnoTecnico = 0
  const tecnicoPara = (equipo) => {
    const candidatos = tecnicosPorEmpresa.get(equipo.empresaId) || []
    if (candidatos.length === 0) return null
    return candidatos[turnoTecnico++ % candidatos.length]
  }

  const clientes = await Promise.all([
    prisma.user.upsert({
      where: { email: 'cliente1@techsolutions.example' },
      update: {},
      create: {
        email: 'cliente1@techsolutions.example',
        password: hashedPassword,
        nombre: 'Roberto Silva',
        role: 'CLIENTE',
        empresaId: empresas[0].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente2@innovatech.example' },
      update: {},
      create: {
        email: 'cliente2@innovatech.example',
        password: hashedPassword,
        nombre: 'Sandra López',
        role: 'CLIENTE',
        empresaId: empresas[1].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente3@datacenter.example' },
      update: {},
      create: {
        email: 'cliente3@datacenter.example',
        password: hashedPassword,
        nombre: 'Miguel Ángel Castro',
        role: 'CLIENTE',
        empresaId: empresas[2].id,
        activo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente4@sistemasintegrados.example' },
      update: {},
      create: {
        email: 'cliente4@sistemasintegrados.example',
        password: hashedPassword,
        nombre: 'Patricia Gómez',
        role: 'CLIENTE',
        empresaId: empresas[3].id,
        activo: true,
      },
    }),
  ])

  console.log(`✅ ${1 + tecnicos.length + clientes.length} usuarios creados`)
  console.log('   - Usuario: admin@mantenpro.example / password123')
  console.log(`   - Técnicos: tecnico1..${tecnicos.length}@mantenpro.example / password123 (dos por empresa)`)
  console.log('   - Clientes: cliente1@techsolutions.example, cliente2@innovatech.example, etc. / password123')

  // Crear equipos
  console.log('💻 Creando equipos...')
  const equipos = []

  const tiposEquipo = ['Computador de Escritorio', 'Laptop', 'Servidor', 'Impresora', 'Router', 'Switch', 'Firewall']
  const marcas = ['Dell', 'HP', 'Lenovo', 'Cisco', 'Epson', 'Canon', 'Fortinet']

  // Los equipos nacen ACTIVO. Su estado NO se sortea: se deriva al final de los
  // mantenimientos que se les hayan creado.
  //
  // Antes se elegía al azar de una lista que incluía EN_MANTENIMIENTO, y como
  // eso ocurría ANTES de crear ningún mantenimiento, la base sembrada violaba
  // el invariante desde el primer momento: había equipos en mantenimiento sin
  // trabajo abierto y equipos activos con trabajo pendiente. Verificar la regla
  // a ojo sobre esos datos daba falsos positivos y falsos negativos.

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
          estado: 'ACTIVO',
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

  // Solicitudes de servicio, con su mantenimiento.
  //
  // Antes el script no sembraba ninguna, así que el flujo nuevo —la solicitud
  // que crea su mantenimiento, el enlace entre ambos, la cancelación— no se
  // podía ver funcionando sin crearlas a mano.
  //
  // Se crean con `solicitudId` puesto en el mantenimiento porque el enlace es lo
  // que hace reproducible el caso; y una de ellas se deja SIN técnico para poder
  // ver el mantenimiento huérfano sin tener que desactivar técnicos a mano.
  console.log('🎫 Creando solicitudes de servicio...')
  const solicitudes = []

  const guionSolicitudes = [
    { descripcion: 'El equipo no enciende desde ayer por la mañana', prioridad: 'ALTA', conTecnico: true },
    { descripcion: 'Hace un ruido fuerte al arrancar y se apaga solo', prioridad: 'URGENTE', conTecnico: true },
    { descripcion: 'La impresora atasca el papel constantemente', prioridad: 'MEDIA', conTecnico: true },
    { descripcion: 'Va muy lento desde la última actualización', prioridad: 'BAJA', conTecnico: false },
  ]

  const diasAdelanto = 3

  for (let i = 0; i < guionSolicitudes.length; i++) {
    const guion = guionSolicitudes[i]
    const cliente = clientes[i % clientes.length]
    // El equipo tiene que ser de la empresa del cliente: es lo que el sistema
    // exige, y sembrar lo contrario dejaría datos que el código considera
    // imposibles.
    const equipoDelCliente = equipos.find((e) => e.empresaId === cliente.empresaId)
    if (!equipoDelCliente) continue

    const tecnico = guion.conTecnico ? tecnicoPara(equipoDelCliente) : null

    const fechaProgramada = new Date()
    fechaProgramada.setDate(fechaProgramada.getDate() + diasAdelanto)
    fechaProgramada.setHours(0, 0, 0, 0)

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        equipoId: equipoDelCliente.id,
        clienteId: cliente.id,
        descripcion: guion.descripcion,
        prioridad: guion.prioridad,
        estado: 'APROBADA',
      },
    })

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        equipoId: equipoDelCliente.id,
        solicitudId: solicitud.id,
        tecnicoId: tecnico ? tecnico.id : null,
        tipo: 'CORRECTIVO',
        estado: 'PROGRAMADO',
        fechaProgramada,
        descripcion: guion.descripcion,
      },
    })

    // El asiento se firma con quien provoca la creación, que aquí es el cliente.
    await prisma.historial.create({
      data: {
        equipoId: equipoDelCliente.id,
        mantenimientoId: mantenimiento.id,
        tecnicoId: cliente.id,
        observaciones: tecnico
          ? `Mantenimiento correctivo creado desde una solicitud y asignado a ${tecnico.nombre}: ${guion.descripcion}`
          : `Mantenimiento correctivo creado desde una solicitud, a la espera de técnico: ${guion.descripcion}`,
      },
    })

    solicitudes.push(solicitud)
    mantenimientos.push(mantenimiento)
  }

  console.log(`✅ ${solicitudes.length} solicitudes creadas con su mantenimiento`)

  // Estado de los equipos, derivado del trabajo que tienen.
  //
  // El invariante del sistema es: un equipo figura en mantenimiento si y solo si
  // tiene al menos un mantenimiento abierto CON técnico. Derivarlo aquí, en vez
  // de sortearlo antes de crear los mantenimientos, es lo que hace que la base
  // sembrada sirva para comprobar la regla a ojo.
  console.log('🔄 Derivando el estado de los equipos de su trabajo abierto...')
  let enMantenimiento = 0

  for (const equipo of equipos) {
    const abiertosConTecnico = await prisma.mantenimiento.count({
      where: {
        equipoId: equipo.id,
        estado: { in: ['PROGRAMADO', 'EN_PROCESO'] },
        tecnicoId: { not: null },
      },
    })

    if (abiertosConTecnico > 0) {
      await prisma.equipo.update({
        where: { id: equipo.id },
        data: { estado: 'EN_MANTENIMIENTO' },
      })
      enMantenimiento += 1
    }
  }

  console.log(`✅ ${enMantenimiento} equipos en mantenimiento, ${equipos.length - enMantenimiento} activos`)

  console.log('\n🎉 ¡Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log(`   - ${empresas.length} empresas`)
  console.log(`   - ${1 + tecnicos.length + clientes.length} usuarios`)
  console.log(`   - ${equipos.length} equipos`)
  console.log(`   - ${mantenimientos.length} mantenimientos`)
  console.log(`   - ${solicitudes.length} solicitudes (una de ellas sin técnico, a propósito)`)
  console.log('\n🔑 Credenciales de acceso:')
  console.log('   Admin: admin@mantenpro.example / password123')
  console.log('   Técnico: tecnico1@mantenpro.example / password123')
  console.log('   Cliente: cliente1@techsolutions.example / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
