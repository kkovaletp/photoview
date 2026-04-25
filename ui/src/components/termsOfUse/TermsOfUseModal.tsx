import { useState } from 'react'
import Modal from '../../primitives/Modal'

const TERMS_ACCEPTED_KEY = 'ethical_use_terms_accepted'

const TERMS_URL = import.meta.env.BASE_URL + 'ethical-use-license.html'

export const useTermsAccepted = () => {
    const [accepted, setAccepted] = useState<boolean>(
        () => localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true'
    )
    const accept = () => {
        localStorage.setItem(TERMS_ACCEPTED_KEY, 'true')
        setAccepted(true)
    }
    return { accepted, accept }
}

type Props = {
    open: boolean
    onAccept: () => void
}

const TermsOfUseModal = ({ open, onAccept }: Props) => {
    return (
        <Modal
            open={open}
            onClose={() => {
                /* intentionally non-dismissible — user must choose */
            }}
            title="🇺🇦 Terms of Use (Mandatory)"
            description={
                <span>
                    By accessing, using, or interacting with this service you explicitly
                    agree to the{' '}
                    <a
                        href={TERMS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                    >
                        Ethical Use License
                    </a>{/* */}
                    .
                </span>
            }
            actions={[
                {
                    key: 'decline',
                    label: 'I Do Not Agree — Stop Using',
                    variant: 'negative',
                    onClick: () => {
                        globalThis.location.href = TERMS_URL
                    },
                },
                {
                    key: 'accept',
                    label: 'I Agree',
                    variant: 'positive',
                    onClick: onAccept,
                },
            ]}
        >
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-2">
                <li>You unequivocally condemn Russia's military aggression against Ukraine</li>
                <li>You recognize that Russia unlawfully invaded a sovereign state</li>
                <li>
                    You agree that{' '}
                    <a
                        href="https://www.europarl.europa.eu/doceo/document/RC-9-2022-0482_EN.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                    >
                        Russia is a terrorist state
                    </a>
                </li>
                <li>You fully support Ukraine's territorial integrity</li>
                <li>You reject narratives perpetuated by Russian state propaganda</li>
                <li className="font-semibold text-red-600 dark:text-red-400">
                    Citizens/residents of Russia, Belarus, Iran, or North Korea are
                    strictly forbidden from using this product/service
                </li>
            </ul>
        </Modal>
    )
}

export default TermsOfUseModal
