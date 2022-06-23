import React, { useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import './index.css'

interface TableInputRow {
  values: string[]
}

interface Props {
  header: string[]
  rows: TableInputRow[]
  onChange: (values: TableInputRow[]) => void
  inputPlaceHolder?: string[]
}

export function TableInput({
  header,
  rows,
  onChange,
  inputPlaceHolder
}: Props) {
  const [rowData, setRowData] = useState<TableInputRow[]>(rows)
  const [valueInputs, setValueInputs] = useState<string[]>([])

  function addRow(row: TableInputRow) {
    if (row.values.every((value) => value ?? false)) {
      setRowData([...rowData, row])
      onChange(rowData)
    }
  }

  function removeRow(row: TableInputRow) {
    const index = rowData.findIndex((entry) => entry === row)
    rowData.splice(index, 1)
    setRowData([...rowData])
    onChange(rowData)
  }

  return (
    <div className='TableInputDiv'>
      <table>
        <tbody>
          <tr>
            {!!header.length &&
              header.map((entry: string, key) => {
                return <th key={key}>{entry}</th>
              })}
            <th></th>
          </tr>
          {!!rowData.length &&
            rowData.map((row: TableInputRow, key) => {
              return (
                <tr key={key}>
                  {!!row.values.length &&
                    row.values.map((value: string, key) => {
                      if (key < header.length) {
                        return <td key={key}>{value}</td>
                      }
                      return
                    })}
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
      <div className='TableInputDiv'>
        {!!header.length &&
          header.map((entry: string, key) => {
            return (
              <TextInputField
                key={key}
                {...{
                  label: `${entry}:`,
                  value: valueInputs.at(key) ?? '',
                  htmlId: 'otherOptionsInput',
                  placeholder: inputPlaceHolder?.at(key) ?? '',
                  onChange: (event) => {
                    valueInputs[key] = event.target.value
                    setValueInputs([...valueInputs])
                  }
                }}
              />
            )
          })}
        <SvgButton
          onClick={() => addRow({ values: [...valueInputs] })}
          className={`is-primary`}
        >
          <AddBoxIcon
            data-testid="addWinePath"
            style={{ color: 'var(--success)', cursor: 'pointer' }}
            fontSize="large"
          />
        </SvgButton>
      </div>
    </div>
  )
}
