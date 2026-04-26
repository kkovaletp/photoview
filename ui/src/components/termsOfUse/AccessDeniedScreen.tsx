const TERMS_URL = import.meta.env.BASE_URL + 'ethical-use-license.html'

const AccessDeniedScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p className="mb-4">
        You have declined the{' '}
        <a href={TERMS_URL} className="text-blue-600 underline">
          Ethical Use License
        </a>{/* */}
        . You must not use this service.
      </p>
      <p className="text-sm text-gray-500">Please close this tab.</p>
    </div>
  )
}

export default AccessDeniedScreen
