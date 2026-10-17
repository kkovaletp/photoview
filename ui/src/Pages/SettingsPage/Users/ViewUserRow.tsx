import { Trans, useTranslation } from 'react-i18next'
import Checkbox from '../../../primitives/form/Checkbox'
import { Button } from '../../../primitives/form/Input'
import Modal from '../../../primitives/Modal'
import { TableCell, TableRow } from '../../../primitives/Table'
import ChangePasswordModal from './UserChangePassword'
import { UserRowChildProps } from './UserRow'

const ViewUserRow = ({
  user,
  setState,
  scanUser,
  deleteUser,
  setChangePassword,
  setConfirmDelete,
  scanUserCalled,
  showChangePassword,
  showConfirmDelete,
}: UserRowChildProps) => {
  const { t } = useTranslation()
  const paths = (
    <ul>
      {user.rootAlbums.map(album => (
        <li key={album.id}>{album.filePath}</li>
      ))}
    </ul>
  )

  return (
    <TableRow>
      <TableCell>{user.username}</TableCell>
      <TableCell>{paths}</TableCell>
      <TableCell>
        <Checkbox label="Admin" disabled checked={user.admin} />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            onClick={() => {
              setState(state => {
                const oldState = { ...state }
                delete oldState.oldState
                return { ...state, editing: true, oldState }
              })
            }}
          >
            {t('settings.users.table.row.action.edit', 'Edit')}
          </Button>
          <Button
            disabled={scanUserCalled}
            onClick={() => scanUser({ variables: { userId: user.id } })}
          >
            {t('settings.users.table.row.action.scan', 'Scan')}
          </Button>
          <Button onClick={() => setChangePassword(true)}>
            {t(
              'settings.users.table.row.action.change_password',
              'Change password'
            )}
          </Button>
          <ChangePasswordModal
            user={user}
            open={showChangePassword}
            onClose={() => setChangePassword(false)}
          />
          <Button
            variant="negative"
            onClick={() => {
              setConfirmDelete(true)
            }}
          >
            {t('settings.users.table.row.action.delete', 'Delete')}
          </Button>
          <Modal
            open={showConfirmDelete}
            onClose={() => setConfirmDelete(false)}
            title={t('settings.users.confirm_delete_user.title', 'Delete user')}
            actions={[
              {
                key: 'cancel',
                label: t('general.action.cancel', 'Cancel'),
                onClick: () => setConfirmDelete(false),
              },
              {
                key: 'delete',
                label: t(
                  'settings.users.confirm_delete_user.action',
                  'Delete {{user}}',
                  { user: user.username }
                ),
                onClick: () => {
                  setConfirmDelete(false)
                  deleteUser({
                    variables: {
                      id: user.id,
                    },
                  })
                },
                variant: 'negative',
              },
            ]}
            description={
              <Trans
                t={t}
                i18nKey="settings.users.confirm_delete_user.description"
                values={{ username: user.username }}
                components={{ line: <span className="block" />, bold: <b /> }}
              >
                <span className="block">
                  {`Are you sure, you want to delete `}
                  {/* TODO: How to fix the following error here?
                  Error: <Trans> child {user.username} at src/Pages/SettingsPage/Users/UserChangePassword.tsx:46:33 won't match at runtime: react-i18next inlines the value, but extraction produces an empty "<1></1>" placeholder. Use {{username: user.username}} (double braces) for interpolation.
                  If I replace the `{user.username}` with `{{ username: user.username }}`, VS Code returns the following error:
                  Object literal may only specify known properties, and 'username' does not exist in type 'Iterable<ReactNode> | Iterable<ReactI18NextChildren> | Promise<AwaitedReactNode> | ReactElement<...> | ReactPortal'.
                  index.d.ts(185, 5): The expected type comes from property 'children' which is declared here on type 'DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>' */}
                  <b>{user.username}</b>?
                </span>
                <span className="block">{`This action cannot be undone`}</span>
              </Trans>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export default ViewUserRow
