/**
 * @jest-environment node
 *
 * Barrera contra la recaída que motivó la migración a Tailwind v4.
 *
 * El proyecto llegó a tener componentes escritos para v4 compilando con v3. Las
 * clases de la versión equivocada no dan error: no se emite CSS y la interfaz
 * se ve mal sin que nada falle. Esta prueba detecta esa situación comparando la
 * versión instalada con la sintaxis presente en el código.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "fs"
import { join } from "path"

const RAIZ = process.cwd()

/** Marcas inequívocas de cada versión. No se listan clases cuyo nombre existe
 *  en ambas versiones: ahí el nombre no dice de qué generación es el código. */
const MARCAS_V3 = [
  { patron: /@tailwind\s+(base|components|utilities)\b/, que: "directiva @tailwind (v3; en v4 es @import \"tailwindcss\")" },
]

const MARCAS_V4 = [
  { patron: /@custom-variant\b/, que: "@custom-variant (v4)" },
  { patron: /@theme\b/, que: "@theme (v4)" },
  { patron: /\b(size|w|h|min-w|min-h|max-w|max-h|origin|bg|text)-\(--[a-z-]+\)/, que: "sintaxis de variable con paréntesis (v4; en v3 sería -[var(--x)])" },
  { patron: /--spacing\(/, que: "función --spacing() (v4)" },
]

const CONFIGS_V3 = [
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
]

function versionInstalada(): number {
  const pkg = join(RAIZ, "node_modules", "tailwindcss", "package.json")
  const { version } = JSON.parse(readFileSync(pkg, "utf8"))
  return Number(String(version).split(".")[0])
}

function archivosFuente(): string[] {
  const encontrados: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada)
      if (statSync(ruta).isDirectory()) recorrer(ruta)
      else if (/[.](tsx?|css)$/.test(ruta)) encontrados.push(ruta)
    }
  }
  recorrer(join(RAIZ, "src"))
  return encontrados
}

function buscar(marcas: typeof MARCAS_V3): string[] {
  const hallazgos: string[] = []

  for (const archivo of archivosFuente()) {
    const lineas = readFileSync(archivo, "utf8").split("\n")
    lineas.forEach((linea, i) => {
      for (const { patron, que } of marcas) {
        const encaje = patron.exec(linea)
        if (encaje) {
          const relativo = archivo.slice(RAIZ.length + 1)
          hallazgos.push(`${relativo}:${i + 1}  ${encaje[0]}  -> ${que}`)
        }
      }
    })
  }

  return hallazgos
}

describe("coherencia entre la versión de Tailwind instalada y el código", () => {
  const mayor = versionInstalada()

  it("el código no usa sintaxis de una versión distinta de la instalada", () => {
    const marcasAjenas = mayor >= 4 ? MARCAS_V3 : MARCAS_V4
    const hallazgos = buscar(marcasAjenas)

    if (hallazgos.length > 0) {
      throw new Error(
        `Tailwind instalado: v${mayor}. Se encontró sintaxis de otra versión ` +
          `en ${hallazgos.length} sitio(s). Esas clases no producen CSS y la ` +
          `interfaz se verá mal sin que falle nada:\n\n  ` +
          hallazgos.join("\n  ") +
          `\n\nVer openspec/changes/migrar-a-tailwind-v4/ y CLAUDE.md.`
      )
    }
  })

  it("no queda un archivo de configuración de la versión anterior", () => {
    if (mayor < 4) return

    const presentes = CONFIGS_V3.filter((nombre) =>
      existsSync(join(RAIZ, nombre))
    )

    expect(presentes).toEqual([])
  })

  it("PostCSS usa el plugin que corresponde a la versión instalada", () => {
    const postcss = readFileSync(join(RAIZ, "postcss.config.mjs"), "utf8")

    if (mayor >= 4) {
      expect(postcss).toContain("@tailwindcss/postcss")
    } else {
      expect(postcss).toMatch(/["']?tailwindcss["']?\s*:/)
    }
  })
})
