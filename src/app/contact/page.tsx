"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  contactSchema,
  MENSAJE_MAX_CARACTERES,
  MENSAJE_MIN_CARACTERES,
  type ContactInput,
} from "@/lib/validations/contact"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Wrench, ArrowLeft, Send, CheckCircle2 } from "lucide-react"

const CAMPOS = ["nombre", "email", "mensaje"] as const

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState("")
  const [error, setError] = useState("")

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      nombre: "",
      email: "",
      mensaje: "",
    },
  })

  const mensaje = form.watch("mensaje")
  const caracteresMensaje = mensaje.trim().length
  const faltanCaracteres = Math.max(0, MENSAJE_MIN_CARACTERES - caracteresMensaje)
  const isLoading = form.formState.isSubmitting

  const handleSubmit = async (data: ContactInput) => {
    setError("")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // El servidor valida con el mismo esquema: si señala campos concretos,
        // los marcamos en el formulario en vez de mostrar un error genérico.
        const fieldErrors = result.fieldErrors as
          | Partial<Record<(typeof CAMPOS)[number], string[]>>
          | undefined
        let campoMarcado = false

        for (const campo of CAMPOS) {
          const mensajeCampo = fieldErrors?.[campo]?.[0]
          if (mensajeCampo) {
            form.setError(campo, { type: "server", message: mensajeCampo })
            if (!campoMarcado) {
              form.setFocus(campo)
              campoMarcado = true
            }
          }
        }

        if (campoMarcado) return

        throw new Error(result.error || "Error al enviar mensaje")
      }

      setEmailEnviado(data.email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensaje")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Contactar Administrador</CardTitle>
            <CardDescription className="text-muted-foreground">
              {sent
                ? "Mensaje enviado correctamente"
                : "Envía un mensaje al administrador del sistema"
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Tu mensaje ha sido enviado al administrador. Te responderán al correo <strong>{emailEnviado}</strong>.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Nombre</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Tu nombre completo"
                          autoComplete="name"
                          className="bg-muted/50 border-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="tu@correo.com"
                          autoComplete="email"
                          className="bg-muted/50 border-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mensaje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Mensaje</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe tu solicitud o consulta..."
                          rows={4}
                          maxLength={MENSAJE_MAX_CARACTERES}
                          className="bg-muted/50 border-input resize-none"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-start justify-between gap-3">
                        <FormMessage />
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                          {caracteresMensaje}/{MENSAJE_MAX_CARACTERES}
                        </span>
                      </div>
                      <FormDescription>
                        {faltanCaracteres > 0
                          ? `Mínimo ${MENSAJE_MIN_CARACTERES} caracteres: te ${faltanCaracteres === 1 ? "falta 1 carácter" : `faltan ${faltanCaracteres} caracteres`}.`
                          : `Mínimo ${MENSAJE_MIN_CARACTERES} caracteres.`}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
