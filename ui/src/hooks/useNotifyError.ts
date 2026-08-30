import { useCallback } from 'react'
import { useMessageState } from '../components/messages/MessageState'
import { NotificationType } from '../__generated__/globalTypes'
import { createUuid } from '../helpers/createUuid'

/**
 * Returns a stable `notifyError(header, error)` function that logs the error
 * to the console and shows a negative toast notification to the user.
 */
export const useNotifyError = () => {
    const { add } = useMessageState()

    return useCallback(
        (header: string, error: unknown) => {
            add({
                key: createUuid(),
                type: NotificationType.Message,
                props: {
                    negative: true,
                    header,
                    content:
                        error instanceof Error
                            ? error.message
                            : 'An unexpected error occurred',
                },
            })
        },
        [add]
    )
}
