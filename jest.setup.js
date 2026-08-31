import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      },
    },
    status: 'authenticated',
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock nodemailer.
//
// Esta es la barrera dura, y no es opcional: `next/jest` carga el `.env` real
// del proyecto, que trae credenciales de correo válidas, y los datos sembrados
// apuntan a dominios registrables. Sin esto, la primera prueba que importe una
// ruta que envíe correo manda mensajes de verdad a terceros, con la descripción
// escrita por el cliente y el serial del equipo dentro.
//
// Se dobla `nodemailer` y no solo `@/lib/email` para que ningún módulo pueda
// abrir un socket SMTP por su cuenta, lo importe como lo importe.
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'prueba' }),
      verify: jest.fn().mockResolvedValue(true),
    })),
  },
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'prueba' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}))

// Mock del módulo de correo del proyecto.
//
// Doblarlo aquí además de nodemailer permite que una prueba afirme sobre el
// envío sin tener que rebuscar en el transporte.
jest.mock('@/lib/email', () => ({
  __esModule: true,
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'prueba' }),
  sendContactMessage: jest.fn().mockResolvedValue({ messageId: 'prueba' }),
  sendSolicitudRecibidaEmail: jest.fn().mockResolvedValue({ messageId: 'prueba' }),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
