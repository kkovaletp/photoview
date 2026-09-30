import { gql } from '@apollo/client'
import { screen, waitFor } from '@testing-library/react'
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
