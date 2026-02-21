"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface MaintenanceChartProps {
  data?: Array<{
    mes: string
    preventivo: number
    correctivo: number
  }>
}

const monthNames: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
}

// Datos de ejemplo por defecto
const defaultData = [
  { mes: "2024-01", preventivo: 12, correctivo: 5 },
  { mes: "2024-02", preventivo: 15, correctivo: 3 },
  { mes: "2024-03", preventivo: 18, correctivo: 7 },
  { mes: "2024-04", preventivo: 14, correctivo: 4 },
  { mes: "2024-05", preventivo: 20, correctivo: 6 },
  { mes: "2024-06", preventivo: 22, correctivo: 8 },
]

export function MaintenanceChart({ data = defaultData }: MaintenanceChartProps) {
  // Transformar los datos para el gráfico
  const chartData = data.map(item => {
    const [year, month] = item.mes.split("-")
    return {
      month: monthNames[month] || month,
      preventivo: item.preventivo,
      correctivo: item.correctivo,
    }
  })

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPreventivo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCorrectivo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Legend
            wrapperStyle={{
              color: "hsl(var(--foreground))",
            }}
          />
          <Area
            type="monotone"
            dataKey="preventivo"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPreventivo)"
            name="Preventivo"
          />
          <Area
            type="monotone"
            dataKey="correctivo"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCorrectivo)"
            name="Correctivo"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
