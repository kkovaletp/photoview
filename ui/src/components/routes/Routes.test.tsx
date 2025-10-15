import Routes from './Routes'
import {
  render,
  screen,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../Pages/LoginPage/LoginPage.tsx', () => () => (
  <div>mocked login page</div>
))

describe('routes', () => {
  test('invalid page should print a "not found" message', () => {
    render(
      <MemoryRouter initialEntries={['/random_non_existent_page']}>
        <Routes />
      </MemoryRouter>
    )

    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })
})
