import React, { useContext } from 'react'

import CloseIcon from './icons/closeSidebarIcon.svg?react'
import PinIconOutline from './icons/pinSidebarIconOutline.svg?react'
import PinIconFilled from './icons/pinSidebarIconFilled.svg?react'
import { SidebarContext } from './Sidebar'

type SidebarHeaderProps = {
  title: string
}

const SidebarHeader = ({ title }: SidebarHeaderProps) => {
  const { updateSidebar, setPinned, pinned } = useContext(SidebarContext)

  const PinIcon = pinned ? PinIconFilled : PinIconOutline

  return (
    <div className="m-2 flex items-center">
      <button
        className={`${pinned ? 'lg:hidden' : ''}`}
        title="Close sidebar"
        onClick={() => updateSidebar(null)}
      >
        <CloseIcon className="m-2 text-[#1F2021] dark:text-[#abadaf]" />
      </button>
      <span className="grow -mt-1 ml-2">{title}</span>
      <button
        className="hidden lg:block"
        title="Pin sidebar"
        onClick={() => setPinned(!pinned)}
      >
        <PinIcon className="m-2 text-[#1F2021] dark:text-[#abadaf]" />
      </button>
    </div>
  )
}

export default SidebarHeader
