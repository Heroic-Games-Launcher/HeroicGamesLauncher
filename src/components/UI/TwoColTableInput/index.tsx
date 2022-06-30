import React, { ReactNode, useContext, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
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

    rowData.push(row)
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

  return (
    <div
      className={classnames(`textInputFieldWrapper Field`, {
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
                  <td>{row.key}</td>
                  <td>{row.value}</td>
                  <td>
                    <SvgButton onClick={() => removeRow(row)}>
                      <RemoveCircleIcon
                        data-testid="removeWinePath"
                        style={{
                          color: 'var(--danger)',
                          cursor: 'pointer'
                        }}
                        fontSize="large"
                      />
                    </SvgButton>
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
      <div className="TableInputDiv">
        <TextInputField
          label={`${header.key}:`}
          value={valueInputs.key}
          htmlId={''}
          placeholder={inputPlaceHolder.key}
          onChange={(event) => {
            setValueInputs({ ...valueInputs, key: event.target.value })
          }}
        />
        <TextInputField
          label={`${header.value}:`}
          value={valueInputs.value}
          htmlId={''}
          placeholder={inputPlaceHolder.value}
          onChange={(event) => {
            setValueInputs({ ...valueInputs, value: event.target.value })
          }}
        />
        <SvgButton onClick={() => addRow(valueInputs)} className={`is-primary`}>
          <AddBoxIcon
            data-testid="addWinePath"
            style={{ color: 'var(--success)', cursor: 'pointer' }}
            fontSize="large"
          />
        </SvgButton>
      </div>
      {afterInput}
    </div>
  )
}
