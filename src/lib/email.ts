import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Topes explícitos. Los valores por defecto de nodemailer son de 120 s para
  // conectar y 600 s de socket: con un servidor que acepta el TCP y no
  // responde, un envío puede retener la petición durante minutos. El aviso al
  // cliente es accesorio y no debe hacer esperar a nadie tanto.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
})

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  nombre: string
) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  const result = await transporter.sendMail({
    from: `MantenPro <${process.env.SMTP_USER}>`,
    to,
    subject: "Restablecer contraseña - MantenPro",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Hola ${nombre},</h2>
        <p style="color: #4a4a4a; font-size: 16px;">
          Recibimos una solicitud para restablecer tu contraseña en MantenPro.
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Haz clic en el siguiente botón para crear una nueva contraseña:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #171717; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #6a6a6a; font-size: 14px;">
          Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
        <p style="color: #9a9a9a; font-size: 12px;">
          MantenPro - Sistema de Gestión de Mantenimiento
        </p>
      </div>
    `,
  })

  return result
}

export async function sendContactMessage(
  nombre: string,
  email: string,
  mensaje: string
) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL no está configurado")
  }

  await transporter.sendMail({
    from: `MantenPro <${process.env.SMTP_USER}>`,
    to: adminEmail,
    replyTo: email,
    subject: `Nuevo mensaje de contacto - ${nombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Nuevo mensaje de contacto</h2>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Nombre:</strong> ${nombre}
          </p>
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Email:</strong> ${email}
          </p>
        </div>
        <div style="margin: 20px 0;">
          <p style="color: #1a1a1a; font-weight: 600;">Mensaje:</p>
          <p style="color: #4a4a4a; font-size: 16px; white-space: pre-wrap;">${mensaje}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
        <p style="color: #9a9a9a; font-size: 12px;">
          Puedes responder directamente a este correo para contactar a ${nombre}.
        </p>
      </div>
    `,
  })
}

/** Datos que necesita el aviso de que una solicitud ya tiene mantenimiento. */
export interface AvisoSolicitudAtendida {
  clienteNombre: string
  clienteEmail: string
  descripcion: string
  equipo: {
    tipo: string
    marca: string
    modelo: string | null
    serial: string
  }
  fechaProgramada: Date
  /** Nombre del técnico asignado, o `null` si el mantenimiento espera uno. */
  tecnicoNombre: string | null
}

/**
 * Avisa al cliente de que su solicitud ya tiene un mantenimiento asociado.
 *
 * Se envía por las dos vías de creación: la automática, al registrar la
 * solicitud, y la manual, cuando el administrador atiende una que se quedó sin
 * mantenimiento. Desde el cliente el hecho es el mismo.
 *
 * IMPORTANTE: esta función se llama SIEMPRE fuera de la transacción y dentro de
 * un `try/catch` propio. Un fallo de envío no puede deshacer la solicitud ni el
 * mantenimiento, ni presentarse al cliente como un fallo del registro.
 */
export async function sendSolicitudRecibidaEmail(aviso: AvisoSolicitudAtendida) {
  const fecha = aviso.fechaProgramada.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const equipo = `${aviso.equipo.tipo} ${aviso.equipo.marca}${
    aviso.equipo.modelo ? ` ${aviso.equipo.modelo}` : ""
  }`

  const bloqueTecnico = aviso.tecnicoNombre
    ? `
        <p style="margin: 8px 0; color: #4a4a4a;">
          <strong>Técnico asignado:</strong> ${aviso.tecnicoNombre}
        </p>`
    : `
        <div style="background-color: #fff4e5; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #7c4a03; font-size: 14px;">
            <strong>Aún no hay un técnico asignado.</strong> No había ninguno
            disponible en este momento; el administrador asignará uno.
          </p>
        </div>`

  return transporter.sendMail({
    from: `MantenPro <${process.env.SMTP_USER}>`,
    to: aviso.clienteEmail,
    subject: `Solicitud recibida - ${equipo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Hola ${aviso.clienteNombre},</h2>
        <p style="color: #4a4a4a; font-size: 16px;">
          Recibimos su solicitud y ya tiene un mantenimiento programado.
        </p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Equipo:</strong> ${equipo}
          </p>
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Serial:</strong> ${aviso.equipo.serial}
          </p>
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Lo que nos reportó:</strong> ${aviso.descripcion}
          </p>
          <p style="margin: 8px 0; color: #4a4a4a;">
            <strong>Fecha programada:</strong> ${fecha}
          </p>
          ${bloqueTecnico}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
        <p style="color: #9a9a9a; font-size: 12px;">
          MantenPro - Sistema de Gestión de Mantenimiento
        </p>
      </div>
    `,
  })
}
