// Registra los matchers de jest-dom (toBeInTheDocument, etc.) en el
// "expect" de Vitest. Se carga una sola vez via test.setupFiles.
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// El auto-cleanup de Testing Library depende de detectar un afterEach
// global (funciona "gratis" con Jest). Vitest no expone afterEach como
// global salvo que actives test.globals, asi que sin esto cada test dejaba
// el DOM del render anterior montado y el siguiente test encontraba
// elementos duplicados.
afterEach(() => {
  cleanup()
})
