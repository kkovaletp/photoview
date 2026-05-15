import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import { TERMS_URL } from './AccessDeniedScreen'

const DIALOG_ID = 'ethical-use-dialog'

const EthicalUseFlagBadge = () => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [dialogPos, setDialogPos] = useState({ top: 0, left: 0 })
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    const handleToggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDialogPos({
                top: rect.bottom + 8,
                // Clamp so the 400 px (w-100) dialog doesn't overflow the right viewport edge
                left: Math.min(rect.left, window.innerWidth - 400 - 16),
            })
        }
        setOpen(prev => !prev)
    }

    // Close on outside click or escape key
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        if (open) {
            document.addEventListener('mousedown', handler)
            document.addEventListener('keydown', onKey)
        }
        return () => {
            document.removeEventListener('mousedown', handler)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                title={t('terms_of_use.badge.button_title', 'Terms of Use (Mandatory)')}
                aria-label={t('terms_of_use.badge.button_aria_label', 'View Terms of Use')}
                aria-expanded={open}
                aria-controls={DIALOG_ID}
                className="text-2xl leading-none cursor-pointer hover:scale-110 active:scale-95 transition-transform
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
                🇺🇦
            </button>

            {open && createPortal(
                <div
                    ref={dialogRef}
                    id={DIALOG_ID}
                    role="dialog"
                    aria-modal="false"
                    aria-label={t('terms_of_use.badge.dialog_aria_label', 'Terms of Use')}
                    style={{ top: dialogPos.top, left: dialogPos.left }}
                    className="fixed w-100 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#31363d]
                    border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-4 text-sm z-50"
                >
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            🇺🇦 {t('terms_of_use.badge.button_title', 'Terms of Use (Mandatory)')}
                        </h3>
                        <button
                            onClick={() => setOpen(false)}
                            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                            leading-none cursor-pointer"
                            aria-label={t('general.action.close', 'Close')}
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
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
                        {' '}
                        {t('terms_of_use.badge.key_conditions_suffix', 'Key conditions:')}
                    </p>
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
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
                        <li className="text-red-500 dark:text-red-400 font-medium">
                            {t('terms_of_use.conditions.forbidden_citizens',
                                'Citizens/residents of Russia, Belarus, Iran, and/or North Korea are strictly forbidden from using this product/service')}
                        </li>
                    </ul>
                </div>,
                document.body
            )}
        </>
    )
}

export default EthicalUseFlagBadge
