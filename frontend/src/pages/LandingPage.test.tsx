import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('el botón "Entrar" llama a onEnter', async () => {
    const user = userEvent.setup()
    const onEnter = vi.fn()

    render(<LandingPage onEnter={onEnter} />)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onEnter).toHaveBeenCalledOnce()
  })
})
