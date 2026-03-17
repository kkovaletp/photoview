import { ForwardedRef, forwardRef, ReactNode } from 'react'
import DismissIcon from './icons/dismissIcon.svg?react'

export type MessageProps = {
  header: string
  content?: string
  children?: ReactNode
  onDismiss?(): void
  negative?: boolean
  positive?: boolean
}

const Message = forwardRef(
  (
    { onDismiss, header, children, content, negative, positive }: MessageProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    //TODO: Suggest a consistent and reliable refactoring to handle the following warning: "Extract this nested ternary operation into an independent statement"
    const backgroundColorClass = negative
      ? 'bg-red-100 dark:bg-red-900'
      : positive
        ? 'bg-green-100 dark:bg-green-900'
        : 'bg-white dark:bg-dark-bg2'

    return (
      <div
        ref={ref}
        className={`${backgroundColorClass} shadow-md border rounded p-2 relative`}
      >
        <button type="button" onClick={onDismiss} className="absolute top-3 right-2">
          <DismissIcon className="w-2.5 h-2.5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="font-semibold text-sm">{header}</h1>
        <div
          className="text-sm overflow-y-auto"
          style={{
            maxHeight: '6rem', // approx. 5 lines
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {content}
        </div>
        {children}
      </div>
    )
  }
)

export default Message
