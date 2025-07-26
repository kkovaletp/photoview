import React from 'react'
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { Button } from './form/Input'

export type ModalAction = {
  key: string
  label: string
  variant?: 'negative' | 'positive' | 'default'
  onClick(event: React.MouseEvent<HTMLButtonElement>): void
}

export type ModalProps = {
  title: string
  description: React.ReactNode
  children?: React.ReactNode
  actions: ModalAction[]
  open: boolean
  onClose(): void
}

const Modal = ({
  title,
  description,
  children,
  actions,
  open,
  onClose,
}: ModalProps) => {
  const actionElms = actions.map(x => (
    <Button
      key={x.key}
      onClick={e => x.onClick(e)}
      variant={x.variant}
      background="white"
    >
      {x.label}
    </Button>
  ))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed z-40 inset-0 overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black opacity-30" />

      <div className="flex items-center justify-center min-h-screen">
        <DialogPanel className="fixed bg-white dark:bg-dark-bg max-w-[calc(100%-16px)] mx-auto rounded shadow-md border">
          <div className="p-4">
            <DialogTitle className="text-xl mb-1">{title}</DialogTitle>
            <Description className="text-sm mb-4">
              {description}
            </Description>

            {children}
          </div>

          <div className="bg-gray-50 p-2 dark:bg-[#31363d] flex gap-2 justify-end mt-4">
            {actionElms}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default Modal
