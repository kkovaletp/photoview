declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  // const content: string

  export { ReactComponent }
  // export default content
}
//TODO: clarify how PROD, DEV, and NODE_ENV are set and used
interface ImportMetaEnv {
  readonly REACT_APP_API_ENDPOINT?: string | undefined
  readonly REACT_APP_BUILD_VERSION: string | undefined
  readonly REACT_APP_BUILD_DATE: string | undefined
  readonly REACT_APP_BUILD_COMMIT_SHA: string | undefined
  readonly BASE_URL: string | undefined
  readonly PROD: boolean | undefined
  readonly DEV: boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type Time = string
type Any = object
