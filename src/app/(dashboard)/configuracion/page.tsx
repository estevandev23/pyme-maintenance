"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Settings, Loader2 } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Configuracion {
  diasProgramacion: number
  limites: {
    diasProgramacionMinimo: number
    diasProgramacionMaximo: number
  }
}

export default function ConfiguracionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [dias, setDias] = useState("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // La comprobación de rol se hace también en el servidor: aquí solo evita
  // enseñar una pantalla que no va a poder usar.
  useEffect(() => {
    if (status === "loading") return
    if (session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") return

    const cargar = async () => {
      try {
        const respuesta = await fetch("/api/configuracion")
        if (!respuesta.ok) throw new Error("Error al cargar la configuración")
        const datos: Configuracion = await respuesta.json()
        setConfiguracion(datos)
        setDias(String(datos.diasProgramacion))
      } catch (error) {
        toast.error("No se pudo cargar la configuración")
        console.error(error)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [session])

  const guardar = async () => {
    try {
      setGuardando(true)
      const respuesta = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasProgramacion: Number(dias) }),
      })

      const resultado = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(resultado.error || "Error al guardar")
      }

      toast.success("Configuración guardada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  if (session?.user?.role !== "ADMIN") return null

  const minimo = configuracion?.limites.diasProgramacionMinimo ?? 1
  const maximo = configuracion?.limites.diasProgramacionMaximo ?? 3
  const sinCambios = String(configuracion?.diasProgramacion ?? "") === dias

  return (
    <>
      <Header
        title="Configuración"
        description="Parámetros de operación del sistema"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Programación de mantenimientos</CardTitle>
                  <CardDescription>
                    Cómo se programan los mantenimientos que nacen de una
                    solicitud del cliente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cargando ? (
                <p className="text-muted-foreground py-6">
                  Cargando configuración...
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diasProgramacion">Días de adelanto</Label>
                    <Input
                      id="diasProgramacion"
                      type="number"
                      min={minimo}
                      max={maximo}
                      value={dias}
                      onChange={(evento) => setDias(evento.target.value)}
                      className="mt-1 w-32"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Cuando un cliente registra una solicitud, su mantenimiento
                      queda programado para dentro de este número de días.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Admite entre {minimo} y {maximo} días. Por debajo, el
                      mantenimiento nacería vencido; por encima, no aparecería en
                      los avisos hasta pasados varios días.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      El cambio se aplica a las solicitudes que se registren a
                      partir de ahora. Los mantenimientos ya creados conservan su
                      fecha.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={guardar} disabled={guardando || sinCambios}>
                      {guardando && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
