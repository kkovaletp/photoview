import { Trans, useTranslation } from 'react-i18next'

export const TERMS_URL = import.meta.env.BASE_URL + 'ethical-use-license.html'

const AccessDeniedScreen = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 className="text-2xl font-bold mb-4">
        {t('terms_of_use.declined.title', 'Access Denied')}
      </h1>
      <p className="mb-4">
        <Trans
          i18nKey="terms_of_use.declined.message"
          defaults="You have declined the <licenseLink>Ethical Use License</licenseLink>. You must not use this service."
          components={{
            licenseLink: (
              <a href={TERMS_URL} className="text-blue-600 underline">
                Ethical Use License
              </a>
            ),
          }}
        />
      </p>
      <p className="text-sm text-gray-500">
        {t('terms_of_use.declined.close_tab', 'Please close this tab.')}
      </p>
    </div>
  )
}

export default AccessDeniedScreen
