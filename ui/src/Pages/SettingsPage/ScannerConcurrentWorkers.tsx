import React, { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { InputLabelTitle, InputLabelDescription } from './SettingsPage'
import { useTranslation } from 'react-i18next'
import { concurrentWorkersQuery } from './__generated__/concurrentWorkersQuery'
import {
  setConcurrentWorkers,
  setConcurrentWorkersVariables,
} from './__generated__/setConcurrentWorkers'
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
  const [workerAmount, setWorkerAmount] = useState(0)

  const workerAmountQuery = useQuery<concurrentWorkersQuery>(CONCURRENT_WORKERS_QUERY)

  useEffect(() => {
    if (workerAmountQuery.error) {
      console.error('Failed to load concurrent workers setting: ', workerAmountQuery.error)
    }

    if (workerAmountQuery.data) {
      const workers = workerAmountQuery.data.siteInfo?.concurrentWorkers
      setWorkerAmount(workers)
      workerAmountServerValue.current = workers
    }
  }, [workerAmountQuery.data, workerAmountQuery.error])

  const [setWorkersMutation, workersMutationData] = useMutation<
    setConcurrentWorkers,
    setConcurrentWorkersVariables
  >(SET_CONCURRENT_WORKERS_MUTATION)

  const updateWorkerAmount = (workerAmount: number) => {
    if (workerAmountServerValue.current != workerAmount) {
      workerAmountServerValue.current = workerAmount
      setWorkersMutation({
        variables: {
          workers: workerAmount,
        },
      })
    }
  }

  if (workerAmountQuery.error) {
    return (
      <div>
        <label>
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
        value={workerAmount}
        onChange={event => {
          setWorkerAmount(parseInt(event.target.value))
        }}
        onBlur={() => updateWorkerAmount(workerAmount)}
        onKeyDown={event =>
          event.key == 'Enter' && updateWorkerAmount(workerAmount)
        }
      />
    </div>
  )
}
