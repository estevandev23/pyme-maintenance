import { render, screen } from "@testing-library/react"
import { MetricCard } from "@/components/metric-card"
import { Wrench, Bell, BarChart3, Clock } from "lucide-react"

describe("MetricCard", () => {
  it("should render title and value", () => {
    render(
      <MetricCard title="Total de equipos" value={100} hint="80 activos" trend="up" icon={Wrench} />
    )

    expect(screen.getByText("Total de equipos")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("80 activos")).toBeInTheDocument()
  })

  // El contrato separa la cifra de lo que la acompaña: es lo que impide volver
  // a colocar una frase donde el diseño espera un número.
  describe("composición del valor", () => {
    it("should render the unit beside the figure, as a separate element", () => {
      render(
        <MetricCard
          title="Desviación respecto a lo programado"
          value={1.5}
          unit="días"
          hint="de adelanto"
          decimals={1}
          trend="up"
          icon={Clock}
        />
      )

      const cifra = screen.getByText("1,5")
      const unidad = screen.getByText("días")

      expect(cifra).toBeInTheDocument()
      expect(unidad).toBeInTheDocument()
      expect(cifra).not.toBe(unidad)
      expect(screen.getByText("de adelanto")).toBeInTheDocument()
    })

    it("should omit the unit when there is none", () => {
      render(<MetricCard title="Pendientes" value={7} trend="down" icon={BarChart3} />)

      expect(screen.getByText("7")).toBeInTheDocument()
      expect(screen.queryByText("días")).not.toBeInTheDocument()
    })

    it("should render without a hint", () => {
      const { container } = render(
        <MetricCard title="Sin matiz" value={3} trend="up" icon={Wrench} />
      )

      expect(container.textContent).toContain("Sin matiz")
      expect(container.textContent).toContain("3")
    })
  })

  describe("presentación de las cifras", () => {
    it("should group thousands so a large figure reads at a glance", () => {
      render(<MetricCard title="Equipos" value={1234567} trend="up" icon={Wrench} />)

      // Separador de millar según la configuración regional española.
      expect(screen.getByText("1.234.567")).toBeInTheDocument()
    })

    it("should keep the requested number of decimals", () => {
      render(
        <MetricCard title="Desviación" value={2} unit="días" decimals={1} trend="up" icon={Clock} />
      )

      expect(screen.getByText("2,0")).toBeInTheDocument()
    })

    // Cifras tabulares: pasar de 9 a 10 no debe desplazar lo que hay al lado.
    it("should use tabular figures", () => {
      const { container } = render(
        <MetricCard title="Test" value={9} trend="up" icon={Wrench} />
      )

      expect(container.querySelector(".tabular-nums")).toBeInTheDocument()
    })
  })

  describe("jerarquía", () => {
    it("should show a highlighted metric with a bigger figure than a context one", () => {
      const { container: destacado } = render(
        <MetricCard title="Test" value={5} trend="up" icon={Wrench} />
      )
      const { container: contexto } = render(
        <MetricCard title="Test" value={5} trend="up" icon={Wrench} variant="contexto" />
      )

      expect(destacado.querySelector(".text-3xl")).toBeInTheDocument()
      expect(contexto.querySelector(".text-3xl")).not.toBeInTheDocument()
      expect(contexto.querySelector(".text-xl")).toBeInTheDocument()
    })

    it("should not force a minimum height on the title", () => {
      const { container } = render(
        <MetricCard title="Un rótulo bastante largo" value={1} trend="up" icon={Wrench} />
      )

      expect(container.querySelector(".min-h-10")).not.toBeInTheDocument()
    })
  })

  it("should render the icon wrapper", () => {
    const { container } = render(
      <MetricCard title="Test" value={0} trend="up" icon={Wrench} />
    )

    expect(container.querySelector(".rounded-lg")).toBeInTheDocument()
  })

  it("should render each trend type", () => {
    const { rerender } = render(
      <MetricCard title="Test" value={1} hint="al alza" trend="up" icon={Wrench} />
    )
    expect(screen.getByText("al alza")).toBeInTheDocument()

    rerender(
      <MetricCard title="Test" value={2} hint="a la baja" trend="down" icon={Wrench} />
    )
    expect(screen.getByText("a la baja")).toBeInTheDocument()

    rerender(
      <MetricCard title="Test" value={3} hint="crítico" trend="critical" icon={Bell} />
    )
    expect(screen.getByText("crítico")).toBeInTheDocument()
  })
})
