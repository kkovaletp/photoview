import { useEffect, useState } from 'react'
import { useQuery, gql, useMutation } from '@apollo/client'
import { useForm } from 'react-hook-form'
import { INITIAL_SETUP_QUERY, login } from './loginUtilities'
import { authToken } from '../../helpers/authentication'
import { normalizeUsername } from '../../helpers/normalize'
import TermsOfUseModal, { useTermsAccepted } from '../../components/termsOfUse/TermsOfUseModal'
import AccessDeniedScreen from '../../components/termsOfUse/AccessDeniedScreen'
import { useTranslation } from 'react-i18next'
import { Helmet, HelmetProvider } from '@dr.pogodin/react-helmet'
import { useNavigate } from 'react-router'
import { TextField } from '../../primitives/form/Input'
import MessageBox from '../../primitives/form/MessageBox'
import { CheckInitialSetupQuery } from './__generated__/loginUtilities'
import { AuthorizeMutation, AuthorizeMutationVariables } from './__generated__/LoginPage'

const authorizeMutation = gql`
  mutation Authorize($username: String!, $password: String!) {
    authorizeUser(username: $username, password: $password) {
      success
      status
      token
    }
  }
`

const LogoHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center flex-col mb-14 mt-20">
      <img
        className="h-24"
        src={import.meta.env.BASE_URL + 'photoview-logo.svg'}
        alt={t('login_page.logo_alt', 'Photoview logo')}
      />
      <h1 className="text-3xl text-center mt-4">
        {t('login_page.welcome', 'Welcome to Photoview')}
      </h1>
    </div>
  )
}

const LoginForm = () => {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<LoginInputs>()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [authorize, { loading }] = useMutation<AuthorizeMutation, AuthorizeMutationVariables>(authorizeMutation)

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null)

      const result = await authorize({
        variables: {
          username: normalizeUsername(data.username),
          password: data.password,
        },
      })

      const authData = result.data?.authorizeUser
      if (authData?.success && authData.token) {
        login(authData.token)
      } else if (authData?.status) {
        setErrorMessage(authData.status)
      }
    } catch (error) {
      console.error('Authorization failed: ', error)
      setErrorMessage('An unexpected error occurred during login')
    }
  })

  return (
    <form
      className="mx-auto max-w-125 px-4"
      onSubmit={onSubmit}
    >
      <TextField
        sizeVariant="big"
        wrapperClassName="my-6"
        className="w-full"
        label={t('login_page.field.username', 'Username')}
        autoComplete="username"
        {...register('username', { required: true })}
        error={
          formErrors.username?.type === 'required'
            ? t('login_page.field.username_error', 'Please enter a username')
            : undefined
        }
      />
      <TextField
        sizeVariant="big"
        wrapperClassName="my-6"
        className="w-full"
        type="password"
        label={t('login_page.field.password', 'Password')}
        autoComplete="current-password"
        {...register('password')}
      />
      <input
        type="submit"
        disabled={loading}
        value={t('login_page.field.submit', 'Sign in')}
        className="rounded-md px-8 py-2 mt-2 focus:outline-none cursor-pointer bg-linear-to-bl from-[#FF8246] to-[#D6264D] text-white font-semibold focus:ring-2 focus:ring-red-200 disabled:cursor-default disabled:opacity-80"
      />
      <MessageBox
        message={errorMessage}
        show={!!errorMessage}
        type="negative"
      />
    </form>
  )
}

type LoginInputs = {
  username: string
  password: string
}

const LoginPage = () => {
  const { t } = useTranslation()
  const { accepted, declined, accept, decline } = useTermsAccepted()
  const navigate = useNavigate()
  const token = authToken()

  const { data: initialSetupData } = useQuery<CheckInitialSetupQuery>(
    INITIAL_SETUP_QUERY,
    { variables: {} }
  )

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  useEffect(() => {
    if (initialSetupData?.siteInfo?.initialSetup) navigate('/initialSetup')
  }, [initialSetupData?.siteInfo?.initialSetup, navigate])

  if (token || initialSetupData?.siteInfo?.initialSetup) {
    return null
  }

  if (declined) {
    return <AccessDeniedScreen />
  }

  return (
    <>
      <HelmetProvider>
        <Helmet>
          <title>{t('title.login', 'Login')} - {t('meta.app_name', 'Photoview')}</title>
        </Helmet>
      </HelmetProvider>
      <TermsOfUseModal open={!accepted} onAccept={accept} onDecline={decline} />
      <div>
        <LogoHeader />
        <LoginForm />
      </div>
    </>
  )
}

export default LoginPage
