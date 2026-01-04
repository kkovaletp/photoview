import React, { useEffect, useState } from 'react'
import { gql } from '@apollo/client'
import { useQuery, useMutation } from '@apollo/client/react'
import { useNavigate } from 'react-router-dom'

import { Container, INITIAL_SETUP_QUERY, login } from './loginUtilities'
import { authToken } from '../../helpers/authentication'
import { useTranslation } from 'react-i18next'
import { CheckInitialSetup } from './__generated__/CheckInitialSetup'
import { useForm } from 'react-hook-form'
import { Submit, TextField } from '../../primitives/form/Input'
import MessageBox from '../../primitives/form/MessageBox'
import {
  InitialSetup,
  InitialSetupVariables,
} from './__generated__/InitialSetup'

const initialSetupMutation = gql`
  mutation InitialSetup(
    $username: String!
    $password: String!
    $rootPath: String!
  ) {
    initialSetupWizard(
      username: $username
      password: $password
      rootPath: $rootPath
    ) {
      success
      status
      token
    }
  }
`

type InitialSetupFormData = {
  username: string
  password: string
  rootPath: string
}

const InitialSetupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<InitialSetupFormData>()

  useEffect(() => {
    if (authToken()) navigate('/')
  }, [])

  const { data: initialSetupData } =
    useQuery<CheckInitialSetup>(INITIAL_SETUP_QUERY)

  const notInitialSetup = initialSetupData?.siteInfo?.initialSetup === false

  useEffect(() => {
    if (notInitialSetup) navigate('/')
  }, [notInitialSetup])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [authorize, { loading: authorizeLoading }] =
    useMutation<InitialSetup, InitialSetupVariables>(initialSetupMutation)

  const signIn = handleSubmit(async (data) => {
    try {
      setErrorMessage(null)

      const result = await authorize({
        variables: {
          username: data.username,
          password: data.password,
          rootPath: data.rootPath,
        },
      })

      const setupData = result.data?.initialSetupWizard
      if (setupData?.success && setupData.token) {
        login(setupData.token)
      } else if (setupData?.status) {
        setErrorMessage(setupData.status)
      }
    } catch (error) {
      console.error('Initial setup failed:', error)
      setErrorMessage('An unexpected error occurred during setup')
    }
  })

  if (authToken() || notInitialSetup) {
    return null
  }

  return (
    <div>
      <Container>
        <h1 className="text-center text-xl">
          {t('login_page.initial_setup.title', 'Initial Setup')}
        </h1>
        <form onSubmit={signIn} className="max-w-[500px] mx-auto">
          <TextField
            wrapperClassName="my-4"
            fullWidth
            {...register('username', { required: true })}
            label={t('login_page.field.username', 'Username')}
            error={
              formErrors.username?.type == 'required'
                ? 'Please enter a username'
                : undefined
            }
          />
          <TextField
            wrapperClassName="my-4"
            fullWidth
            {...register('password', { required: true })}
            label={t('login_page.field.password', 'Password')}
            error={
              formErrors.password?.type == 'required'
                ? 'Please enter a password'
                : undefined
            }
          />
          <TextField
            wrapperClassName="my-4"
            fullWidth
            {...register('rootPath', { required: true })}
            label={t(
              'login_page.initial_setup.field.photo_path.label',
              'Photo path'
            )}
            placeholder={t(
              'login_page.initial_setup.field.photo_path.placeholder',
              '/path/to/photos'
            )}
            error={
              formErrors.password?.type == 'required'
                ? 'Please enter a photo path'
                : undefined
            }
          />
          <MessageBox
            type="negative"
            message={errorMessage}
            show={!!errorMessage}
          />
          <Submit className="mt-2" disabled={authorizeLoading}>
            {t('login_page.initial_setup.field.submit', 'Setup Photoview')}
          </Submit>
        </form>
      </Container>
    </div>
  )
}

export default InitialSetupPage
