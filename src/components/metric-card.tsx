import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tarjeta de indicador del panel.
 *
 * `value` es un número, no un texto: es lo que impide volver a colocar una
 * frase donde el diseño espera una cifra. Lo que acompaña a la cifra va en
 * `unit` y `hint`, cada uno con su tratamiento, de modo que un matiz largo no
 * compita con el dato ni deforme la tarjeta.
 */
interface MetricCardProps {
  title: string
  /** La cifra. Se formatea aquí, con separador de millar. */
  value: number
  /** Unidad de la cifra, cuando la tenga. Acompaña al número, sin competir. */
  unit?: string
  /** Matiz que contextualiza la cifra. Nivel de apoyo. */
  hint?: string
  trend: "up" | "down" | "critical"
  icon: LucideIcon
  /**
   * `destacado` para las métricas que responden cómo vamos; `contexto` para las
   * que solo sitúan. La diferencia se ve en el tamaño de la cifra, no solo en
   * la posición.
   */
  variant?: "destacado" | "contexto"
  /** Decimales a mostrar. Por defecto ninguno: la mayoría son recuentos. */
  decimals?: number
}

export function MetricCard({
  title,
  value,
  unit,
  hint,
  trend,
  icon: Icon,
  variant = "destacado",
  decimals = 0,
}: MetricCardProps) {
  const esDestacado = variant === "destacado"

  const getTrendColor = () => {
    if (trend === "critical") return "text-destructive"
    if (trend === "up") return "text-chart-3"
    return "text-chart-2"
  }

  const getTrendIcon = () => {
    if (trend === "critical") return AlertTriangle
    if (trend === "up") return ArrowUpRight
    return ArrowDownRight
  }

  const TrendIcon = getTrendIcon()

  // Separador de millar y decimales fijos: una cifra que crece no debe
  // reordenar lo que tiene al lado.
  const cifra = value.toLocaleString("es", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <Card className="bg-card border-border h-full">
      <CardContent
        className={cn(
          "flex h-full flex-col",
          esDestacado ? "p-5" : "p-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div
            className={cn(
              "shrink-0 rounded-lg bg-primary/10",
              esDestacado ? "p-2.5" : "p-2"
            )}
          >
            <Icon
              className={cn(
                "text-primary",
                esDestacado ? "h-5 w-5" : "h-4 w-4"
              )}
            />
          </div>
        </div>

        {/* mt-auto alinea las cifras de una misma fila aunque los rótulos
            ocupen distinto número de líneas, sin recurrir a un alto mínimo. */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-bold tabular-nums text-foreground",
                esDestacado ? "text-3xl" : "text-xl"
              )}
            >
              {cifra}
            </span>
            {unit && (
              <span
                className={cn(
                  "font-normal text-muted-foreground",
                  esDestacado ? "text-base" : "text-sm"
                )}
              >
                {unit}
              </span>
            )}
          </div>

          {hint && (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-sm font-medium",
                getTrendColor()
              )}
            >
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">{hint}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
