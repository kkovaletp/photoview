import { useMutation, gql } from '@apollo/client'
import PeriodicScanner from './PeriodicScanner'
import { ScannerConcurrentWorkers } from './ScannerConcurrentWorkers'
import { SectionTitle, InputLabelDescription } from './SettingsPage'
import { useTranslation } from 'react-i18next'
import { ScanAllMutationMutation } from './__generated__/ScannerSection'
import { Button } from '../../primitives/form/Input'
import { useMessageState } from '../../components/messages/MessageState'
import { useMemo } from 'react'

const SCAN_MUTATION = gql`
  mutation scanAllMutation {
    scanAll {
      success
      message
    }
  }
`

// Exact backend key from api/scanner/scanner_queue/queue.go:21
const SCANNER_GLOBAL_KEY = 'global-scanner-progress'

// If we have not seen a fresh scanner update within this window, treat state as unknown
// (prevents a stuck-disabled button after a backend crash or lost final notification).
const SCANNER_MSG_STALE_AFTER_MS = 2 * 60 * 1000 // 2 minutes

const ScannerSection = () => {
  const { t } = useTranslation()
  const [startScanner, { loading }] = useMutation<ScanAllMutationMutation>(SCAN_MUTATION)
  const { messages } = useMessageState()

  // Derive scanner state from the exact key the backend emits
  const scannerRunning = useMemo(() => {
    const scannerMsg = messages.find(m => m.key === SCANNER_GLOBAL_KEY)
    if (!scannerMsg) return false
    const now = Date.now()
    const isFresh =
      scannerMsg?.timestamp != null &&
      (now - scannerMsg.timestamp) < SCANNER_MSG_STALE_AFTER_MS
    return isFresh && scannerMsg.props.positive !== true
  }, [messages])

  // Disable policy:
  // - disable while the HTTP request is in-flight (loading)
  // - disable while the scanner is actually running (from notifications)
  const disabled = loading || scannerRunning

  const startingLabel = t('settings.scanner.starting', 'Starting…')
  const inProgressLabel = t('settings.scanner.scanning', 'Scan in progress…')
  const defaultLabel = t('settings.scanner.scan_all_users', 'Scan all users')

  let buttonLabel: string
  if (loading) {
    buttonLabel = startingLabel
  } else if (scannerRunning) {
    buttonLabel = inProgressLabel
  } else {
    buttonLabel = defaultLabel
  }

  // Keep width stable across label changes using the longest localized label
  const longestCh = Math.max(
    startingLabel.length,
    inProgressLabel.length,
    defaultLabel.length
  ) + 2
  const stableButtonStyle = { minWidth: `${longestCh}ch` }

  const handleStart = () => {
    startScanner()
      .catch(error => {
        console.error('Failed to start scanner: ', error)
      })
  }

  return (
    <div>
      <SectionTitle nospace>
        {t('settings.scanner.title', 'Scanner')}
      </SectionTitle>
      <InputLabelDescription>
        {t(
          'settings.scanner.description',
          'Will scan all users for new or updated media'
        )}
      </InputLabelDescription>
      <Button onClick={handleStart} disabled={disabled} style={stableButtonStyle}>
        {buttonLabel}
      </Button>
      <PeriodicScanner />
      <ScannerConcurrentWorkers />
    </div>
  )
}

export default ScannerSection
