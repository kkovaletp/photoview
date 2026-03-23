import { useEffect, useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Container, INITIAL_SETUP_QUERY, login } from './loginUtilities'
import { authToken } from '../../helpers/authentication'
import { normalizePath, normalizeUsername } from '../../helpers/normalize'
import { useTranslation } from 'react-i18next'
import { CheckInitialSetupQuery } from './__generated__/loginUtilities'
import { InitialSetupMutation, InitialSetupMutationVariables } from './__generated__/InitialSetupPage'
import { useForm } from 'react-hook-form'
import { Submit, TextField } from '../../primitives/form/Input'
import MessageBox from '../../primitives/form/MessageBox'

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
  const token = authToken()

  const {
    register,
    clearErrors,
    setError,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<InitialSetupFormData>()

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  const { data: initialSetupData } =
    useQuery<CheckInitialSetupQuery>(INITIAL_SETUP_QUERY)

  const notInitialSetup = initialSetupData?.siteInfo?.initialSetup === false

  useEffect(() => {
    if (notInitialSetup) navigate('/')
  }, [notInitialSetup])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [authorize, { loading: authorizeLoading }] =
    useMutation<InitialSetupMutation, InitialSetupMutationVariables>(initialSetupMutation)

  const signIn = handleSubmit(async (data) => {
    try {
      setErrorMessage(null)
      clearErrors(['username', 'rootPath'])

      const username = normalizeUsername(data.username)
      const rootPath = normalizePath(data.rootPath)
      let hasError = false

      if (username === '') {
        setError('username', { type: 'required' })
        hasError = true
      }

      if (rootPath === '') {
        setError('rootPath', { type: 'required' })
        hasError = true
      }

      if (hasError) return

      const result = await authorize({
        variables: {
          username,
          password: data.password,
          rootPath,
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

  if (token || notInitialSetup) {
    return null
  }

  return (
    <div>
      <Container>
        <h1 className="text-center text-xl">
          {t('login_page.initial_setup.title', 'Initial Setup')}
        </h1>
        <form onSubmit={signIn} className="max-w-125 mx-auto">
          <TextField
            wrapperClassName="my-4"
            fullWidth
            {...register('username', { required: true })}
            label={t('login_page.field.username', 'Username')}
            error={
              formErrors.username?.type === 'required'
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
              formErrors.password?.type === 'required'
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
              formErrors.rootPath?.type === 'required'
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
