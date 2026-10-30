import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  InputLabelDescription,
  InputLabelTitle,
  SectionTitle,
} from './SettingsPage'

const VERSION = import.meta.env.REACT_APP_BUILD_VERSION ?? 'undefined'
const BUILD_DATE = import.meta.env.REACT_APP_BUILD_DATE ?? 'undefined'
const BUILD_COMMIT_SHA = import.meta.env.REACT_APP_BUILD_COMMIT_SHA || undefined

const VersionInfoWrapper = styled.div`
  margin-bottom: 24px;
`

const VersionInfo = () => {
  const { t } = useTranslation()
  const [commitSha, setCommitSha] = useState<string | undefined>(
    BUILD_COMMIT_SHA
  )

  useEffect(() => {
    // Non-Docker builds can supply the commit at build time.
    if (BUILD_COMMIT_SHA) {
      return
    }

    const controller = new AbortController()

    const loadBuildInfo = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}build-info.json`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          return
        }

        const buildInfo: unknown = await response.json()

        if (
          !controller.signal.aborted &&
          typeof buildInfo === 'object' &&
          buildInfo !== null &&
          'commitSha' in buildInfo &&
          typeof buildInfo.commitSha === 'string' &&
          /^[0-9a-f]+$/i.test(buildInfo.commitSha)
        ) {
          setCommitSha(buildInfo.commitSha)
        }
      } catch {
        // Metadata can be unavailable offline or during navigation.
        // Keep the version information usable without a commit link.
      }
    }

    void loadBuildInfo()

    return () => controller.abort()
  }, [])

  return (
    <VersionInfoWrapper>
      <SectionTitle>
        {t('settings.version_info.title', 'Photoview Version')}
      </SectionTitle>
      <InputLabelTitle>
        {t('settings.version_info.version_title', 'Release Version')}
      </InputLabelTitle>
      <InputLabelDescription>
        {VERSION}
        {commitSha && (
          <>
            {' ('}
            <a
              href={`https://github.com/kkovaletp/photoview/commit/${commitSha}`}
              title={commitSha}
            >
              {commitSha.substring(0, 8)}
            </a>
            {')'}
          </>
        )}
      </InputLabelDescription>
      <InputLabelTitle>
        {t('settings.version_info.build_date_title', 'Build date')}
      </InputLabelTitle>
      <InputLabelDescription>{BUILD_DATE}</InputLabelDescription>
    </VersionInfoWrapper>
  )
}

export default VersionInfo
