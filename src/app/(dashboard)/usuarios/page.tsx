"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users as UsersIcon, Filter, Copy, Check } from "lucide-react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UsuariosTable } from "@/components/usuarios/usuarios-table"
import { UsuarioForm } from "@/components/usuarios/usuario-form"
import { toast } from "sonner"
import type { CreateUserInput } from "@/lib/validations/user"
import { DataPagination } from "@/components/ui/data-pagination"

interface Usuario {
  id: string
  email: string
  nombre: string
  role: "ADMIN" | "TECNICO" | "CLIENTE"
  activo: boolean
  empresaId: string | null
  empresa: {
    id: string
    nombre: string
    nit: string
  } | null
  _count?: {
    mantenimientos: number
    historial: number
  }
}

interface Empresa {
  id: string
  nombre: string
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all")
  const [newUserPassword, setNewUserPassword] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Redirigir si no es ADMIN
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/")
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchEmpresas()
      fetchUsuarios()
    }
  }, [session])

  const fetchEmpresas = async () => {
    try {
      const response = await fetch("/api/empresas")
      if (!response.ok) throw new Error("Error al cargar empresas")
      const data = await response.json()
      setEmpresas(data)
    } catch (error) {
      toast.error("Error al cargar empresas")
      console.error(error)
    }
  }

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterRole !== "all") params.append("role", filterRole)
      if (filterEmpresa !== "all") params.append("empresaId", filterEmpresa)
      params.append("page", currentPage.toString())
      params.append("limit", itemsPerPage.toString())

      const response = await fetch(`/api/usuarios?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar usuarios")

      const result = await response.json()
      setUsuarios(result.data)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
    } catch (error) {
      toast.error("Error al cargar usuarios")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filterRole, filterEmpresa])

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsuarios()
    }
  }, [filterRole, filterEmpresa, currentPage])

  const handleCreate = async (data: CreateUserInput) => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear usuario")
      }

      // Mostrar la contraseña temporal
      setNewUserPassword({
        email: result.email,
        password: result.temporaryPassword,
      })

      toast.success("Usuario creado exitosamente")
      setFormOpen(false)
      fetchUsuarios()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear usuario")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setFormOpen(true)
  }

  const handleUpdate = async (data: CreateUserInput) => {
    if (!editingUsuario) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/usuarios/${editingUsuario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar usuario")
      }

      toast.success("Usuario actualizado exitosamente")
      setFormOpen(false)
      setEditingUsuario(undefined)
      fetchUsuarios()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar usuario")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar usuario")
      }

      toast.success("Usuario eliminado exitosamente")
      fetchUsuarios()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar usuario")
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingUsuario(undefined)
    }
  }

  const handleCopyPassword = () => {
    if (newUserPassword) {
      navigator.clipboard.writeText(newUserPassword.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Contraseña copiada al portapapeles")
    }
  }

  return (
    <>
      <Header
        title="Usuarios"
        description="Gestión de usuarios del sistema"
      />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="ADMIN">Administradores</SelectItem>
                  <SelectItem value="TECNICO">Técnicos</SelectItem>
                  <SelectItem value="CLIENTE">Clientes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <UsersIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Listado de Usuarios</CardTitle>
                  <CardDescription>
                    {totalItems} {totalItems === 1 ? "usuario registrado" : "usuarios registrados"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando usuarios...</p>
                </div>
              ) : (
                <>
                  <UsuariosTable
                    usuarios={usuarios}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <DataPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <UsuarioForm
        usuario={editingUsuario}
        empresas={empresas}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={editingUsuario ? handleUpdate : handleCreate}
        isLoading={isSubmitting}
      />

      <AlertDialog open={!!newUserPassword} onOpenChange={() => setNewUserPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuario Creado Exitosamente</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm space-y-4">
              <p>Se ha creado el usuario con la siguiente información:</p>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email:</p>
                  <p className="font-medium">{newUserPassword?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contraseña Temporal:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                      {newUserPassword?.password}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyPassword}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-destructive">
                Guarda esta contraseña ahora. No podrás verla nuevamente.
              </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNewUserPassword(null)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
