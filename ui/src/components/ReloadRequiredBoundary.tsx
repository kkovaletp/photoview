import { Component, ReactNode } from 'react'
import i18n from 'i18next'
import { isChunkLoadFailure } from '../helpers/chunkLoadFailure'
import { Button } from '../primitives/form/Input'

type ReloadRequiredBoundaryProps = {
    children: ReactNode
}

type ReloadRequiredBoundaryState = {
    reloadRequired: boolean
}

export default class ReloadRequiredBoundary extends Component<
    ReloadRequiredBoundaryProps,
    ReloadRequiredBoundaryState
> {
    state: ReloadRequiredBoundaryState = {
        reloadRequired: false,
    }

    static getDerivedStateFromError(
        error: unknown
    ): ReloadRequiredBoundaryState | null {
        if (isChunkLoadFailure(error)) {
            return { reloadRequired: true }
        }

        return null
    }

    componentDidCatch(error: unknown) {
        if (!isChunkLoadFailure(error)) {
            console.error('[UI] Unhandled render error', error)
        }
    }

    render() {
        if (this.state.reloadRequired) {
            return (
                <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-dark-bg">
                    <div className="max-w-lg rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg2 shadow-md p-5">
                        <h1 className="text-lg font-semibold mb-3">
                            {i18n.t('update_available_page.header', 'Page refresh required')}
                        </h1>
                        <p className="text-sm whitespace-pre-wrap">
                            {i18n.t(
                                'update_available_page.content',
                                'This tab is using an older UI build and some page files are no longer available on the server. Please refresh the page to continue.'
                            )}
                        </p>
                        <Button
                            type="button"
                            onClick={() => {
                                globalThis.location.reload()
                            }}
                            variant="positive"
                            background="white"
                            className="mt-4 px-4 py-2 rounded border bg-green-600 text-white hover:bg-green-700"
                        >
                            {i18n.t('update_available_page.action', 'Refresh page')}
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
