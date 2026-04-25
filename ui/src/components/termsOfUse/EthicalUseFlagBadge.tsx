import { useState, useRef, useEffect } from 'react'

const TERMS_URL = import.meta.env.BASE_URL + 'ethical-use-license.html'

const EthicalUseFlagBadge = () => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                onClick={() => setOpen(prev => !prev)}
                title="Terms of Use (Mandatory)"
                aria-label="View Terms of Use"
                aria-expanded={open}
                className="text-2xl leading-none cursor-pointer hover:scale-110 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
                🇺🇦
            </button>

            {open && (
                <dialog
                    aria-label="Terms of Use"
                    className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[`#31363d`] border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-4 text-sm z-50"
                >
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            🇺🇦 Terms of Use (Mandatory)
                        </h3>
                        <button
                            onClick={() => setOpen(false)}
                            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 leading-none cursor-pointer"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                        By accessing or sharing this service, you agree to the{' '}
                        <a
                            href={TERMS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline"
                        >
                            Ethical Use License
                        </a>{/* */}
                        . Key conditions:
                    </p>
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>You condemn Russia's military aggression against Ukraine</li>
                        <li>You recognize Ukraine as a sovereign, independent state</li>
                        <li>You support Ukraine's full territorial integrity</li>
                        <li>You reject Russian state propaganda</li>
                        <li className="text-red-500 dark:text-red-400 font-medium">
                            Forbidden for citizens/residents of Russia, Belarus, Iran, or North Korea
                        </li>
                    </ul>
                </dialog>
            )}
        </div>
    )
}

export default EthicalUseFlagBadge
