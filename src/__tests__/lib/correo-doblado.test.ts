/**
 * Comprueba que el envío de correo está doblado en el arranque de pruebas.
 *
 * No prueba una funcionalidad del producto: protege de un accidente concreto.
 * `next/jest` carga el `.env` real del proyecto, que tiene credenciales de
 * correo válidas, y los datos que siembra `scripts/seed-data.js` apuntan a
 * dominios registrables. Sin el doble, cualquier prueba que importe una ruta
 * que envíe correo manda mensajes de verdad a terceros.
 *
 * Si esta prueba falla, hay que arreglar `jest.setup.js` antes de seguir, no
 * marcarla como omitida.
 */

import nodemailer from "nodemailer"
import * as email from "@/lib/email"

describe("el envío de correo está doblado en las pruebas", () => {
  it("nodemailer no puede abrir un transporte real", () => {
    expect(jest.isMockFunction(nodemailer.createTransport)).toBe(true)

    const transporte = nodemailer.createTransport({})
    expect(jest.isMockFunction(transporte.sendMail)).toBe(true)
  })

  it("un envío por el transporte doblado se resuelve sin tocar la red", async () => {
    const transporte = nodemailer.createTransport({})

    await expect(
      transporte.sendMail({ to: "nadie@example.invalid", subject: "prueba" })
    ).resolves.toEqual({ messageId: "prueba" })

    expect(transporte.sendMail).toHaveBeenCalledTimes(1)
  })

  it("las funciones de @/lib/email están dobladas y registran la llamada", async () => {
    expect(jest.isMockFunction(email.sendPasswordResetEmail)).toBe(true)
    expect(jest.isMockFunction(email.sendContactMessage)).toBe(true)

    await email.sendContactMessage("Prueba", "nadie@example.invalid", "hola")

    expect(email.sendContactMessage).toHaveBeenCalledWith(
      "Prueba",
      "nadie@example.invalid",
      "hola"
    )
  })

  it("las credenciales del entorno llegan a las pruebas, que es el motivo del doble", () => {
    // No se comprueba el valor, solo que el .env real entra en process.env.
    // Si esto dejara de ser cierto, el doble seguiría siendo necesario, pero
    // conviene enterarse de que la premisa cambió.
    const hayCredenciales =
      typeof process.env.SMTP_USER === "string" && process.env.SMTP_USER.length > 0

    if (!hayCredenciales) {
      console.warn(
        "SMTP_USER no está definido en este entorno: el doble sigue siendo obligatorio."
      )
    }

    expect(jest.isMockFunction(nodemailer.createTransport)).toBe(true)
  })
})
