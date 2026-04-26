import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import Modal from '../../primitives/Modal'
import { TERMS_URL } from './AccessDeniedScreen'

const TERMS_ACCEPTED_KEY = 'ethical_use_terms_accepted'

const safeRead = (): boolean => {
    try {
        return globalThis.localStorage?.getItem(TERMS_ACCEPTED_KEY) === 'true'
    } catch {
        return false
    }
}

export const useTermsAccepted = () => {
    const [accepted, setAccepted] = useState<boolean>(safeRead)
    const [declined, setDeclined] = useState(false)
    const accept = () => {
        try {
            globalThis.localStorage?.setItem(TERMS_ACCEPTED_KEY, 'true')
        } catch {
            /* storage disabled / full — accept in-memory only */
        }
        setAccepted(true)
    }
    const decline = () => {
        setDeclined(true)
        // Best-effort tab close; silently ignored by most browsers for user-opened tabs
        window.close()
    }
    return { accepted, declined, accept, decline }
}

type Props = {
    open: boolean
    onAccept: () => void
    onDecline: () => void
}

const TermsOfUseModal = ({ open, onAccept, onDecline }: Props) => {
    const { t } = useTranslation()
    return (
        <Modal
            open={open}
            onClose={() => {
                /* intentionally non-dismissible — user must choose */
            }}
            title={t('terms_of_use.modal.title', 'Terms of Use (Mandatory)')}
            description={
                <span>
                    <Trans
                        i18nKey="terms_of_use.agreement_intro"
                        defaults="By accessing, using, or interacting with this product/service you explicitly agree to the <licenseLink>Ethical Use License</licenseLink>."
                        components={{
                            licenseLink: (
                                <a
                                    href={TERMS_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline"
                                >
                                    Ethical Use License
                                </a>
                            ),
                        }}
                    />
                </span>
            }
            actions={[
                {
                    key: 'decline',
                    label: t('terms_of_use.modal.action.decline', 'I Do Not Agree'),
                    variant: 'negative',
                    onClick: onDecline,
                },
                {
                    key: 'accept',
                    label: t('terms_of_use.modal.action.accept', 'I Agree'),
                    variant: 'positive',
                    onClick: onAccept,
                },
            ]}
        >
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-2">
                <li>
                    {t('terms_of_use.conditions.condemn_aggression',
                        "You unequivocally condemn Russia's military aggression against Ukraine")}
                </li>
                <li>
                    {t('terms_of_use.conditions.recognize_invasion',
                        'You recognize that Russia unlawfully invaded a sovereign state')}
                </li>
                <li>
                    <Trans
                        i18nKey="terms_of_use.conditions.terrorist_state"
                        defaults="You agree that <doc>Russia is a terrorist state</doc>."
                        components={{
                            doc: (
                                <a
                                    href="https://www.europarl.europa.eu/doceo/document/RC-9-2022-0482_EN.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline"
                                >
                                    Russia is a terrorist state
                                </a>
                            ),
                        }}
                    />
                </li>
                <li>
                    {t('terms_of_use.conditions.support_territorial_integrity',
                        "You fully support Ukraine's territorial integrity")}
                </li>
                <li>
                    {t('terms_of_use.conditions.reject_propaganda',
                        'You reject narratives perpetuated by Russian state propaganda')}
                </li>
                <li className="font-semibold text-red-600 dark:text-red-400">
                    {t('terms_of_use.conditions.forbidden_citizens',
                        'Citizens/residents of Russia, Belarus, Iran, and/or North Korea are strictly forbidden from using this product/service')}
                </li>
            </ul>
        </Modal>
    )
}

export default TermsOfUseModal
