import React, { ReactNode, useContext, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import EditIcon from '@mui/icons-material/Edit'
import classnames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

export interface ColumnProps {
  key: string
  value: string
}

interface FullFillProps {
  key: boolean
  value: boolean
}

interface Props {
  label: string
  htmlId: string
  header: ColumnProps
  rows: ColumnProps[]
  fullFills?: FullFillProps
  onChange: (values: ColumnProps[]) => void
  inputPlaceHolder?: ColumnProps
  warning?: ReactNode
  afterInput?: ReactNode
}

export function TableInput({
  label,
  htmlId,
  header,
  rows,
  fullFills = { key: true, value: true },
  onChange,
  inputPlaceHolder = { key: '', value: '' },
  warning,
  afterInput
}: Props) {
  const { isRTL } = useContext(ContextProvider)
  const [rowData, setRowData] = useState<ColumnProps[]>(rows)
  const [valueInputs, setValueInputs] = useState<ColumnProps>({
    key: '',
    value: ''
  })

  function addRow(row: ColumnProps) {
    if (!row) {
      return
    } else if (
      (!row.key && fullFills?.key) ||
      (!row.value && fullFills?.value)
    ) {
      return
    }

    // update already added envs
    const index = rowData.findIndex(
      (entry: ColumnProps) => entry.key === row.key
    )
    if (index >= 0) {
      rowData[index].value = row.value
    } else {
      rowData.push(row)
    }
    setRowData([...rowData])
    onChange(rowData)
    setValueInputs({ key: '', value: '' })
  }

  function removeRow(row: ColumnProps) {
    const index = rowData.findIndex((entry) => entry === row)
    rowData.splice(index, 1)
    setRowData([...rowData])
    onChange(rowData)
  }

  function editRow(row: ColumnProps) {
    setValueInputs({ key: row.key, value: row.value })
  }

  return (
    <div
      className={classnames(`tableFieldWrapper Field`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <table>
        <tbody>
          <tr>
            <th>{header.key}</th>
            <th>{header.value}</th>
            <th></th>
          </tr>
          {!!rowData.length &&
            rowData.map((row: ColumnProps, key) => {
              return (
                <tr key={key}>
                  <td>
                    <span>{row.key}</span>
                  </td>
                  <td>
                    <span>{row.value}</span>
                  </td>
                  <td>
                    <SvgButton onClick={() => editRow(row)}>
                      <EditIcon
                        style={{ color: 'var(--accent)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                    <SvgButton onClick={() => removeRow(row)}>
                      <RemoveCircleIcon
                        style={{ color: 'var(--danger)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                  </td>
                </tr>
              )
            })}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <TextInputField
                label={header.key}
                value={valueInputs.key}
                htmlId={`${header.key}-key`}
                placeholder={inputPlaceHolder.key}
                onChange={(event) => {
                  setValueInputs({ ...valueInputs, key: event.target.value })
                }}
              />
            </td>
            <td>
              <TextInputField
                label={header.value}
                value={valueInputs.value}
                htmlId={`${header.value}-key`}
                placeholder={inputPlaceHolder.value}
                onChange={(event) => {
                  setValueInputs({ ...valueInputs, value: event.target.value })
                }}
              />
            </td>
            <td>
              <SvgButton
                onClick={() => addRow(valueInputs)}
                className={`is-primary`}
              >
                <AddBoxIcon
                  style={{ color: 'var(--success)' }}
                  fontSize="large"
                />
              </SvgButton>
            </td>
          </tr>
        </tfoot>
      </table>
      {valueInputs.value && warning}
      {afterInput}
    </div>
  )
}
