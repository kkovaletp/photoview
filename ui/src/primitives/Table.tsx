import styled from 'styled-components'

export const Table = styled.table.attrs({
  className: 'border dark:border-dark-border border-separate rounded',
})`
  border-spacing: 0;

  & td:not(:last-child),
  & th:not(:last-child) {
    border-right: 1px solid;
    border-color: inherit;
  }

  & tr:first-child td {
    border-top: 1px solid;
    border-color: inherit;
  }

  & td {
    border-bottom: 1px solid;
    border-color: inherit;
  }
`

export const TableHeader = styled.thead.attrs({
  className: 'text-left',
})``

export const TableBody = styled.tbody.attrs({ className: '' })``

export const TableFooter = styled.tfoot.attrs({ className: '' })``

export const TableRow = styled.tr.attrs({ className: '' })``

export const TableCell = styled.td.attrs({
  className: 'py-2 px-2 align-top dark:bg-[#2a2f35]',
})``

export const TableHeaderCell = styled.th.attrs({
  className:
    'bg-gray-50 dark:bg-dark-bg2 py-2 px-2 align-top font-semibold',
})``

export const TableScrollWrapper = styled.div.attrs({
  className: 'block overflow-x-auto whitespace-nowrap',
})``
