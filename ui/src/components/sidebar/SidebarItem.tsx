type SidebarItemProps = {
  name: string
  value: string
}

const SidebarItem = ({ name, value }: SidebarItemProps) => (
  <div className="flex items-baseline mb-1">
    <div
      className="w-27.5 shrink-0 font-semibold text-sm text-gray-500 dark:text-gray-400 text-right pr-2 truncate"
      title={name}
    >
      {name}
    </div>
    <div
      className="flex-1 text-base wrap-break-word min-w-0"
      style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
    >
      {value}
    </div>
  </div>
)

export default SidebarItem
