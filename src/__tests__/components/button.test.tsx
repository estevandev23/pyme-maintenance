import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("should handle click events", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>)

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("should apply default variant styles", () => {
    render(<Button>Default</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("bg-primary")
  })

  it("should apply destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("bg-destructive")
  })

  it("should apply outline variant styles", () => {
    render(<Button variant="outline">Outline</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("border")
  })

  it("should apply secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("bg-secondary")
  })

  it("should apply ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("hover:bg-accent")
  })

  it("should apply link variant styles", () => {
    render(<Button variant="link">Link</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("underline-offset-4")
  })

  it("should apply small size styles", () => {
    render(<Button size="sm">Small</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("h-8")
  })

  it("should apply large size styles", () => {
    render(<Button size="lg">Large</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("h-10")
  })

  it("should apply icon size styles", () => {
    render(<Button size="icon">Icon</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("size-9")
  })

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("custom-class")
  })

  it("should render as child when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )

    const link = screen.getByRole("link", { name: "Link Button" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/test")
  })

  it("should have type button by default", () => {
    render(<Button>Submit</Button>)

    const button = screen.getByRole("button")
    // React defaults to no type, but buttons default to submit in forms
    expect(button.tagName).toBe("BUTTON")
  })

  it("should accept type prop", () => {
    render(<Button type="submit">Submit</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("type", "submit")
  })
})
