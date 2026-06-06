import { useState } from 'react'
import { gql, useMutation } from '@apollo/client'
import { Trans, useTranslation } from 'react-i18next'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'
import Modal from '../../../primitives/Modal'
import { TextField } from '../../../primitives/form/Input'
import MessageBox from '../../../primitives/form/MessageBox'

const changeUserPasswordMutation = gql`
  mutation changeUserPassword($userId: ID!, $password: String!) {
    updateUser(id: $userId, password: $password) {
      id
    }
  }
`

interface ChangePasswordModalProps {
  onClose(): void
  open: boolean
  user: SettingsUsersQueryQuery['user'][0]
}

const ChangePasswordModal = ({
  onClose,
  user,
  open,
}: ChangePasswordModalProps) => {
  const { t } = useTranslation()
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isChanging, setIsChanging] = useState(false)
  const [changePassword] = useMutation(changeUserPasswordMutation)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('settings.users.password_reset.title', 'Change password')}
      description={
        <Trans t={t}
          i18nKey="settings.users.password_reset.description"
          values={{ username: user.username }}
        >
          Change password for <b>{user.username}</b>
        </Trans>
      }
      actions={[
        {
          key: 'cancel',
          label: t('general.action.cancel', 'Cancel'),
          onClick: () => onClose?.(),
          disabled: isChanging,
        },
        {
          key: 'change_password',
          label: t(
            'settings.users.password_reset.form.submit',
            'Change password'
          ),
          variant: 'positive',
          disabled: isChanging,
          onClick: () => void (async () => {
            if (isChanging) return
            setIsChanging(true)
            try {
              setErrorMessage(null)
              await changePassword({
                variables: {
                  userId: user.id,
                  password: passwordInput,
                },
              })
              onClose?.()
              setPasswordInput('')
            } catch (error) {
              console.error('Failed to change password: ', error)
              setErrorMessage(t('settings.users.password_reset.error', 'Failed to change password'))
            } finally {
              setIsChanging(false)
            }
          })()
        },
      ]}
    >
      <div className="w-90">
        <TextField
          label={t('settings.users.password_reset.form.label', 'New password')}
          placeholder={t(
            'settings.users.password_reset.form.placeholder',
            'password'
          )}
          onChange={e => setPasswordInput(e.target.value)}
          type="password"
        />
        <MessageBox
          type="negative"
          message={errorMessage}
          show={!!errorMessage}
        />
      </div>
    </Modal>
  )
}

export default ChangePasswordModal
