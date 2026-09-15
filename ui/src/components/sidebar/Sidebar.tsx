import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react'

export type SidebarOwner = symbol

export type UpdateSidebarFn = (
  content: ReactNode | null,
  owner?: SidebarOwner
) => void
export type SidebarPinnedFn = (pin: boolean) => void

interface SidebarContextType {
  updateSidebar: UpdateSidebarFn
  setPinned: SidebarPinnedFn
  content: ReactNode | null
  owner: SidebarOwner | null
  pinned: boolean
}

export const SidebarContext = createContext<SidebarContextType>({
  updateSidebar: (content, owner) => {
    console.warn(
      'SidebarContext: updateSidebar was called before initialized',
      content,
      owner
    )
  },
  setPinned: content => {
    console.warn(
      'SidebarContext: setPinned was called before initialized',
      content
    )
  },
  content: null,
  owner: null,
  pinned: false,
})
SidebarContext.displayName = 'SidebarContext'

type SidebarProviderProps = {
  children: ReactNode
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  const [state, setState] = useState<{
    content: ReactNode | null
    owner: SidebarOwner | null
    pinned: boolean
  }>({
    content: null,
    owner: null,
    pinned: false,
  })

  const updateSidebar = useCallback(
    (content: ReactNode | null, owner?: SidebarOwner) => {
      setState(state => {
        if (content === null) {
          if (owner !== undefined && state.owner !== owner) {
            return state
          }

          return { content: null, owner: null, pinned: false }
        }

        return {
          ...state,
          content,
          owner: owner ?? null,
        }
      })
    },
    []
  )

  const setPinned = useCallback((pinned: boolean) => {
    setState(state => ({ ...state, pinned }))
  }, [])

  const contextValue = useMemo(
    () => ({
      updateSidebar,
      setPinned,
      content: state.content,
      owner: state.owner,
      pinned: state.pinned,
    }),
    [updateSidebar, setPinned, state.content, state.owner, state.pinned]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = () => {
  const { content, pinned } = useContext(SidebarContext)

  useEffect(() => {
    const body = document.body

    if (content == null) {
      body.classList.remove('overflow-y-hidden', 'lg:overflow-y-auto')
    } else {
      body.classList.add('overflow-y-hidden', 'lg:overflow-y-auto')
    }

    return () => {
      body.classList.remove('overflow-y-hidden', 'lg:overflow-y-auto')
    }
  }, [content])

  return (
    <div
      data-sidebar
      className={`fixed top-18 bg-white dark:bg-dark-bg2 dark:border-dark-border2 bottom-0 w-full overflow-y-auto transform transition-transform motion-reduce:transition-none ${
        content == null && !pinned ? 'translate-x-full' : 'translate-x-0'
      } ${
        pinned ? 'lg:border-l' : 'lg:shadow-separator'
      } lg:w-105 lg:right-0 lg:top-0 lg:z-40`}
    >
      {content}
      <div className="h-24"></div>
    </div>
  )
}
