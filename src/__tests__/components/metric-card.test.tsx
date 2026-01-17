import { render, screen } from "@testing-library/react"
import { MetricCard } from "@/components/metric-card"
import { Wrench, Bell, BarChart3 } from "lucide-react"

describe("MetricCard", () => {
  it("should render title and value", () => {
    render(
      <MetricCard
        title="Total Equipos"
        value="100"
        change="+5%"
        trend="up"
        icon={Wrench}
      />
    )

    expect(screen.getByText("Total Equipos")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("+5%")).toBeInTheDocument()
  })

  it("should render with up trend and show correct text", () => {
    render(
      <MetricCard
        title="Test Metric"
        value="50"
        change="+10%"
        trend="up"
        icon={BarChart3}
      />
    )

    expect(screen.getByText("+10%")).toBeInTheDocument()
    expect(screen.getByText("Test Metric")).toBeInTheDocument()
  })

  it("should render with down trend", () => {
    render(
      <MetricCard
        title="Test Metric"
        value="30"
        change="-5%"
        trend="down"
        icon={BarChart3}
      />
    )

    expect(screen.getByText("-5%")).toBeInTheDocument()
  })

  it("should render with critical trend", () => {
    render(
      <MetricCard
        title="Equipos Críticos"
        value="5"
        change="Requieren atención"
        trend="critical"
        icon={Bell}
      />
    )

    expect(screen.getByText("Requieren atención")).toBeInTheDocument()
  })

  it("should render the icon wrapper", () => {
    const { container } = render(
      <MetricCard
        title="Test"
        value="0"
        change="N/A"
        trend="up"
        icon={Wrench}
      />
    )

    // Check that the icon wrapper exists (using class selector)
    const iconWrapper = container.querySelector(".rounded-lg")
    expect(iconWrapper).toBeInTheDocument()
  })

  it("should display change text correctly", () => {
    render(
      <MetricCard
        title="Metric"
        value="42"
        change="80 activos"
        trend="up"
        icon={Wrench}
      />
    )

    expect(screen.getByText("80 activos")).toBeInTheDocument()
  })

  it("should render value as h3 heading", () => {
    render(
      <MetricCard
        title="Test"
        value="123"
        change="Test change"
        trend="up"
        icon={Wrench}
      />
    )

    const heading = screen.getByRole("heading", { level: 3 })
    expect(heading).toHaveTextContent("123")
  })

  it("should render different values for each trend type", () => {
    const { rerender } = render(
      <MetricCard title="Test" value="1" change="up change" trend="up" icon={Wrench} />
    )
    expect(screen.getByText("up change")).toBeInTheDocument()

    rerender(
      <MetricCard title="Test" value="2" change="down change" trend="down" icon={Wrench} />
    )
    expect(screen.getByText("down change")).toBeInTheDocument()

    rerender(
      <MetricCard title="Test" value="3" change="critical change" trend="critical" icon={Bell} />
    )
    expect(screen.getByText("critical change")).toBeInTheDocument()
  })
})
