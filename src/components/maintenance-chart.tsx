"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Ene", preventivo: 45, correctivo: 12 },
  { month: "Feb", preventivo: 52, correctivo: 18 },
  { month: "Mar", preventivo: 48, correctivo: 15 },
  { month: "Abr", preventivo: 61, correctivo: 22 },
  { month: "May", preventivo: 55, correctivo: 19 },
  { month: "Jun", preventivo: 67, correctivo: 25 },
  { month: "Jul", preventivo: 58, correctivo: 16 },
  { month: "Ago", preventivo: 64, correctivo: 21 },
]

export function MaintenanceChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
