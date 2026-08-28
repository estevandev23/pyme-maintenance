import { NextResponse } from "next/server"
import { z } from "zod"
import { sendContactMessage } from "@/lib/email"
import { contactSchema } from "@/lib/validations/contact"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error)
      const primerError = Object.values(fieldErrors).flat()[0]

      return NextResponse.json(
        {
          error: primerError ?? "Revisa los datos del formulario",
          fieldErrors,
        },
        { status: 400 }
      )
    }

    const { nombre, email, mensaje } = parsed.data

    await sendContactMessage(nombre, email, mensaje)

    return NextResponse.json({
      message: "Mensaje enviado correctamente.",
    })
  } catch (error) {
    console.error("Error en contacto:", error)
    return NextResponse.json(
      { error: "Error al enviar el mensaje. Inténtalo de nuevo." },
      { status: 500 }
    )
  }
}
