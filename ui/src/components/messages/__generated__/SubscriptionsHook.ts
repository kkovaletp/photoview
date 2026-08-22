/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

/** Specified the type a particular notification is of */
export type NotificationType =
  /** Close a notification with a given key */
  | 'Close'
  /** A regular message with no special additions */
  | 'Message'
  /** A notification with an attached progress indicator */
  | 'Progress'

export type NotificationSubscriptionSubscriptionVariables = Exact<{
  [key: string]: never
}>

export type NotificationSubscriptionSubscription = {
  notification: {
    key: string
    type: Types.NotificationType
    header: string
    content: string
    progress: number | null
    positive: boolean
    negative: boolean
    timeout: number | null
  }
}
