import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { InputLabelTitle, InputLabelDescription } from './SettingsPage'
import { useTranslation } from 'react-i18next'
import {
  ConcurrentWorkersQueryQuery,
  SetConcurrentWorkersMutation,
  SetConcurrentWorkersMutationVariables,
} from './__generated__/ScannerConcurrentWorkers'
import { TextField } from '../../primitives/form/Input'

export const CONCURRENT_WORKERS_QUERY = gql`
  query concurrentWorkersQuery {
    siteInfo {
      concurrentWorkers
    }
  }
`

export const SET_CONCURRENT_WORKERS_MUTATION = gql`
  mutation setConcurrentWorkers($workers: Int!) {
    setScannerConcurrentWorkers(workers: $workers)
  }
`

export const ScannerConcurrentWorkers = () => {
  const { t } = useTranslation()

  const workerAmountServerValue = useRef<null | number>(null)
  const inFlightNextRef = useRef<number | null>(null)
  const initializedRef = useRef(false)
  const [workerAmount, setWorkerAmount] = useState(0)
  const [inputValue, setInputValue] = useState('')

  const workerAmountQuery = useQuery<ConcurrentWorkersQueryQuery>(CONCURRENT_WORKERS_QUERY)

  useEffect(() => {
    if (workerAmountQuery.error) {
      console.error('Failed to load concurrent workers setting: ', workerAmountQuery.error)
    }

    if (workerAmountQuery.data && !initializedRef.current) {
      const workers = workerAmountQuery.data.siteInfo?.concurrentWorkers
      setWorkerAmount(workers)
      setInputValue(String(workers))
      workerAmountServerValue.current = workers
      initializedRef.current = true
    } else if (workerAmountQuery.data && initializedRef.current) {
      // Subsequent updates - only update if server value changed and we're not editing
      const workers = workerAmountQuery.data.siteInfo?.concurrentWorkers
      if (workers !== workerAmountServerValue.current && inFlightNextRef.current === null) {
        setWorkerAmount(workers)
        setInputValue(String(workers))
        workerAmountServerValue.current = workers
      }
    }
  }, [workerAmountQuery.data, workerAmountQuery.error])

  const [setWorkersMutation, workersMutationData] = useMutation<
    SetConcurrentWorkersMutation,
    SetConcurrentWorkersMutationVariables
  >(SET_CONCURRENT_WORKERS_MUTATION, { errorPolicy: 'all' })

  const updateWorkerAmount = (next: number) => {
    const prev = workerAmountServerValue.current
    if (prev === null || prev === next) return
    if (inFlightNextRef.current === next) return
    inFlightNextRef.current = next

    void setWorkersMutation({
      variables: { workers: next },
    }).then(res => {
      if (!res.data || (Array.isArray(res.errors) && res.errors.length > 0)) {
        throw new Error('GraphQL error while updating concurrent workers')
      }
      const newValue = res.data.setScannerConcurrentWorkers
      workerAmountServerValue.current = newValue
      setWorkerAmount(newValue)
      setInputValue(String(newValue))
    }).catch(error => {
      console.error('Failed to update concurrent workers: ', error)
      // Reset to server value on error
      setWorkerAmount(prev)
      setInputValue(String(prev))
    }).finally(() => {
      inFlightNextRef.current = null
    })
  }

  const commitValue = () => {
    const n = Number(inputValue)
    const bounded = Math.min(24, Math.max(1, Number.isNaN(n) ? workerAmount : n))
    setInputValue(String(bounded))
    updateWorkerAmount(bounded)
  }

  if (workerAmountQuery.error) {
    return (
      <div>
        <label htmlFor="scanner_concurrent_workers_field">
          <InputLabelTitle>
            {t('settings.concurrent_workers.title', 'Scanner concurrent workers')}
          </InputLabelTitle>
        </label>
        <div className="text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded mt-2">
          {t('settings.concurrent_workers.error', 'Failed to load concurrent workers setting')}: {workerAmountQuery.error.message}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="scanner_concurrent_workers_field">
        <InputLabelTitle>
          {t('settings.concurrent_workers.title', 'Scanner concurrent workers')}
        </InputLabelTitle>
        <InputLabelDescription>
          {t(
            'settings.concurrent_workers.description',
            'The maximum amount of scanner jobs that is allowed to run at once'
          )}
        </InputLabelDescription>
      </label>
      <TextField
        disabled={workerAmountQuery.loading || workersMutationData.loading}
        type="number"
        min="1"
        max="24"
        id="scanner_concurrent_workers_field"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commitValue()
          }
        }}
      />
    </div>
  )
}
