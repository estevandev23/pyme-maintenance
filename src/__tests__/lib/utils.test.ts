import { cn } from "@/lib/utils"

describe("cn (classname utility)", () => {
  it("should merge class names correctly", () => {
    const result = cn("bg-red-500", "text-white")
    expect(result).toBe("bg-red-500 text-white")
  })

  it("should handle conditional classes", () => {
    const isActive = true
    const result = cn("base-class", isActive && "active-class")
    expect(result).toBe("base-class active-class")
  })

  it("should handle false conditional classes", () => {
    const isActive = false
    const result = cn("base-class", isActive && "active-class")
    expect(result).toBe("base-class")
  })

  it("should merge tailwind classes correctly", () => {
    const result = cn("px-2 py-1", "px-4")
    expect(result).toBe("py-1 px-4")
  })

  it("should handle undefined and null values", () => {
    const result = cn("base", undefined, null, "end")
    expect(result).toBe("base end")
  })

  it("should handle array of classes", () => {
    const result = cn(["class1", "class2"])
    expect(result).toBe("class1 class2")
  })

  it("should handle empty input", () => {
    const result = cn()
    expect(result).toBe("")
  })

  it("should handle object notation", () => {
    const result = cn({
      "bg-blue-500": true,
      "text-white": true,
      "hidden": false,
    })
    expect(result).toBe("bg-blue-500 text-white")
  })
})
