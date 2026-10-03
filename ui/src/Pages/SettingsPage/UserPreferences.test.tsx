import { gql } from '@apollo/client'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { LanguageTranslation } from '../../__generated__/globalTypes'
import { renderWithProviders } from '../../helpers/testUtils'
import UserPreferences from './UserPreferences'

const MY_USER_PREFERENCES = gql`
  query myUserPreferences {
    myUserPreferences {
      id
      language
    }
  }
`

const CHANGE_USER_PREFERENCES = gql`
  mutation changeUserPreferences($language: String) {
    changeUserPreferences(language: $language) {
      id
      language
    }
  }
`

test('updates the selected language with the requested mutation variables', async () => {
  const user = userEvent.setup()
  const mutationResult = vi.fn(() => ({
    data: {
      changeUserPreferences: {
        __typename: 'UserPreferences' as const,
        id: '1',
        language: LanguageTranslation.French,
      },
    },
  }))

  renderWithProviders(<UserPreferences />, {
    mocks: [
      {
        request: { query: MY_USER_PREFERENCES },
        result: {
          data: {
            myUserPreferences: {
              __typename: 'UserPreferences',
              id: '1',
              language: LanguageTranslation.English,
            },
          },
        },
      },
      {
        request: {
          query: CHANGE_USER_PREFERENCES,
          variables: { language: LanguageTranslation.French },
        },
        result: mutationResult,
      },
    ],
  })

  const languageSelect = screen.getByRole('combobox', {
    name: /Website language/i,
  })
  await waitFor(() => expect(languageSelect).toHaveValue(LanguageTranslation.English))

  await user.selectOptions(languageSelect, LanguageTranslation.French)

  await waitFor(() => {
    expect(mutationResult).toHaveBeenCalledOnce()
    expect(languageSelect).toHaveValue(LanguageTranslation.French)
  })
})

test.each([
  { basename: '/', href: '/logout' },
  { basename: '/photoview', href: '/photoview/logout' },
])(
  'logout uses document navigation to $href',
  async ({ basename, href }) => {
    const user = userEvent.setup()
    const prefix = basename === '/' ? '' : basename

    render(
      <MockedProvider
        mocks={[
          {
            request: { query: MY_USER_PREFERENCES },
            result: {
              data: {
                myUserPreferences: {
                  __typename: 'UserPreferences',
                  id: '1',
                  language: LanguageTranslation.English,
                },
              },
            },
          },
        ]}
      >
        <MemoryRouter
          basename={basename}
          initialEntries={[`${prefix}/settings`]}
        >
          <UserPreferences />
        </MemoryRouter>
      </MockedProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: /Website language/i })
      ).toHaveValue(LanguageTranslation.English)
    })

    const link = screen.getByRole('link', { name: 'Log out' })
    expect(link).toHaveAttribute('href', href)

    let routerPreventedNavigation: boolean | undefined

    // React's click handler runs before this document listener.
    // Cancel browser navigation here because jsdom cannot load documents.
    const stopDocumentNavigation = (event: MouseEvent) => {
      routerPreventedNavigation = event.defaultPrevented
      event.preventDefault()
    }

    document.addEventListener('click', stopDocumentNavigation, {
      once: true,
    })

    try {
      await user.click(link)
      expect(routerPreventedNavigation).toBe(false)
    } finally {
      document.removeEventListener('click', stopDocumentNavigation)
    }
  }
)
