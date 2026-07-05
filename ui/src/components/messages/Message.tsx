import { ForwardedRef, forwardRef, ReactNode } from 'react'
import DismissIcon from './icons/dismissIcon.svg?react'
import { Button } from '../../primitives/form/Input'

export type MessageProps = {
  header: string
  content?: string
  children?: ReactNode
  onDismiss?: () => void
  negative?: boolean
  positive?: boolean
  actionLabel?: string
  onAction?: () => void
}

// TODO: Small React 19 cleanup: drop forwardRef here
// React 19 lets this component accept ref as a normal prop, so forwardRef can be removed if you want to simplify this file.MessageProgress would need the same update to keep the ref path intact.
const Message = forwardRef(
  (
    { onDismiss, header, children, content, negative, positive, actionLabel, onAction }: MessageProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    let backgroundColorClass = 'bg-white dark:bg-dark-bg2'
    if (negative) {
      backgroundColorClass = 'bg-red-100 dark:bg-red-900'
    } else if (positive) {
      backgroundColorClass = 'bg-green-100 dark:bg-green-900'
    }

    return (
      <div
        ref={ref}
        className={`${backgroundColorClass} shadow-md border rounded p-2 relative`}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="absolute top-3 right-2"
        >
          <DismissIcon aria-hidden="true" className="w-2.5 h-2.5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="font-semibold text-sm">{header}</h1>
        <div
          className="text-sm overflow-y-auto"
          style={{
            maxHeight: '6rem',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {content}
        </div>
        {actionLabel !== undefined && onAction !== undefined && (
          <Button
            type="button"
            onClick={onAction}
            variant="positive"
            background="white"
            className="mt-2 px-3 py-0.5 text-xs"
          >
            {actionLabel}
          </Button>
        )}
        {children}
      </div>
    )
  }
)

export default Message
