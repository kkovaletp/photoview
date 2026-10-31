import { clsx } from 'clsx'
import { SelectHTMLAttributes, ChangeEvent } from 'react'
import styled from 'styled-components'

const DropdownStyledSelect = styled.select`
  appearance: none;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9px' height='5px' viewBox='0 0 9 5'%3E%3Cpolygon fill='%23D8D8D8' points='0 0 8.36137659 0 4.1806883 4.1806883'%3E%3C/polygon%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center right 10px;
`

export type DropdownItem<Value extends string = string> = {
  value: Value
  label: string
}

type DropdownProps<Value extends string = string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value'
> & {
  items: readonly DropdownItem<Value>[]
  selected?: Value
  value?: Value | ''
  setSelected: (value: Value) => void
  className?: string
  placeholder?: string
}

function Dropdown<Value extends string = string>({
  items,
  selected,
  value,
  setSelected,
  className,
  placeholder,
  onChange: onNativeChange,
  ...otherProps
}: DropdownProps<Value>) {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.currentTarget.value
    const selectedItem = items.find(item => item.value === selectedValue)

    if (selectedItem !== undefined) {
      setSelected(selectedItem.value)
    }

    onNativeChange?.(event)
  }

  const options = items.map(({ value, label }) => (
    <option key={value} value={value}>
      {label}
    </option>
  ))

  return (
    <DropdownStyledSelect
      {...otherProps}
      className={clsx(
        'bg-gray-50 px-2 py-0.5 pr-6 rounded border border-gray-200 focus:outline-none focus:border-blue-300 text-[#222] hover:bg-gray-100 disabled:hover:bg-gray-50 disabled:text-gray-500 disabled:cursor-default',
        'dark:bg-dark-input-bg dark:border-dark-input-border dark:text-dark-input-text dark:focus:border-blue-300',
        className
      )}
      value={value ?? selected ?? ''}
      onChange={onChange}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options}
    </DropdownStyledSelect>
  )
}

export default Dropdown
