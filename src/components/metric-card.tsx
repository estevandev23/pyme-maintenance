import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "critical"
  icon: LucideIcon
}

export function MetricCard({ title, value, change, trend, icon: Icon }: MetricCardProps) {
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

  return (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground min-h-[2.5rem] flex items-center">{title}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                <TrendIcon className="h-4 w-4" />
                {change}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
