import * as Types from '../../../__generated__/globalTypes'

export type NotificationSubscriptionSubscriptionVariables = Types.Exact<{
  [key: string]: never
}>

export type NotificationSubscriptionSubscription = {
  __typename?: 'Subscription'
  notification: {
    __typename?: 'Notification'
    key: string
    type: Types.NotificationType
    header: string
    content: string
    progress?: number | null
    positive: boolean
    negative: boolean
    timeout?: number | null
  }
}
