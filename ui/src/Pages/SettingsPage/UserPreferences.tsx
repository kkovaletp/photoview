import { useMutation, useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { LanguageTranslation } from '../../__generated__/globalTypes'
import Dropdown from '../../primitives/form/Dropdown'
import { Button } from '../../primitives/form/Input'
import {
  InputLabelDescription,
  InputLabelTitle,
  SectionTitle,
} from './SettingsPage'
import {
  LOCALE_DISPLAY_NAMES,
  LANGUAGE_TRANSLATION_TO_LOCALE,
} from '../../helpers/localeDisplayNames'
import {
  changeUserPreferences,
  changeUserPreferencesVariables,
} from './__generated__/changeUserPreferences'
import { myUserPreferences } from './__generated__/myUserPreferences'
import { TranslationFn } from '../../localization'
import { changeTheme, getTheme } from '../../theme'

const languagePreferences = (
  Object.entries(LANGUAGE_TRANSLATION_TO_LOCALE) as [LanguageTranslation, string][]
).map(([enumValue, localeCode], index) => ({
  key: index + 1,
  label: LOCALE_DISPLAY_NAMES[localeCode] ?? localeCode,
  value: enumValue,
}))

const themePreferences = (t: TranslationFn) => [
  {
    key: 1,
    label: t('settings.user_preferences.theme.auto.label', 'Same as system'),
    value: 'auto',
  },
  {
    key: 2,
    label: t('settings.user_preferences.theme.light.label', 'Light'),
    value: 'light',
  },
  {
    key: 2,
    label: t('settings.user_preferences.theme.dark.label', 'Dark'),
    value: 'dark',
  },
]

const CHANGE_USER_PREFERENCES = gql`
  mutation changeUserPreferences($language: String) {
    changeUserPreferences(language: $language) {
      id
      language
    }
  }
`

const MY_USER_PREFERENCES = gql`
  query myUserPreferences {
    myUserPreferences {
      id
      language
    }
  }
`

const LogoutButton = () => {
  const { t } = useTranslation()

  return (
    <Button
      className="mb-4"
      onClick={() => {
        location.href = '/logout'
      }}
    >
      {t('settings.logout', 'Log out')}
    </Button>
  )
}

const UserPreferencesWrapper = styled.div`
  margin-bottom: 24px;
`

const UserPreferences = () => {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(getTheme())

  const changeStateTheme = (value: string) => {
    changeTheme(value)
    setTheme(value)
  }

  const { data } = useQuery<myUserPreferences>(MY_USER_PREFERENCES)

  const [changePrefs, { loading: loadingPrefs, error }] = useMutation<
    changeUserPreferences,
    changeUserPreferencesVariables
  >(CHANGE_USER_PREFERENCES)

  const sortedLanguagePrefs = useMemo(
    () => [...languagePreferences].sort((a, b) => a.label.localeCompare(b.label)),
    []
  )

  if (error) {
    return <div>{error.message}</div>
  }

  return (
    <UserPreferencesWrapper>
      <SectionTitle nospace>
        {t('settings.user_preferences.title', 'User preferences')}
      </SectionTitle>
      <LogoutButton />
      <label htmlFor="user_pref_change_language_field">
        <InputLabelTitle>
          {t(
            'settings.user_preferences.change_language.label',
            'Website language'
          )}
        </InputLabelTitle>
        <InputLabelDescription>
          {t(
            'settings.user_preferences.change_language.description',
            'Change website language specific for this user'
          )}
        </InputLabelDescription>
      </label>
      <Dropdown
        id="user_pref_change_language_field"
        placeholder={t(
          'settings.user_preferences.language_selector.placeholder',
          'Select language'
        )}
        items={sortedLanguagePrefs}
        setSelected={language => {
          changePrefs({
            variables: {
              language: language as LanguageTranslation,
            },
          })
        }}
        selected={data?.myUserPreferences.language || undefined}
        disabled={loadingPrefs}
      />
      <label htmlFor="user_pref_change_theme_field">
        <InputLabelTitle>
          {t('settings.user_preferences.theme.title', 'Theme preferences')}
        </InputLabelTitle>
        <InputLabelDescription>
          {t(
            'settings.user_preferences.theme.description',
            'Change the appearance of the website'
          )}
        </InputLabelDescription>
      </label>
      <Dropdown
        id="user_pref_change_theme_field"
        items={themePreferences(t)}
        setSelected={changeStateTheme}
        selected={theme}
      />
    </UserPreferencesWrapper>
  )
}

export default UserPreferences
