import React, { ReactNode, useContext, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import classnames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

interface Props<ArgType> {
  label: string
  htmlId: string
  header: ArgType
  rows: ArgType[]
  onChange: (values: ArgType[]) => void
  inputPlaceHolder?: ArgType
  afterInput?: ReactNode
}

export function TableInput<ArgType>({
  label,
  htmlId,
  header,
  rows,
  onChange,
  inputPlaceHolder,
  afterInput
}: Props<ArgType>) {
  const { isRTL } = useContext(ContextProvider)
  const [rowData, setRowData] = useState<ArgType[]>(rows)
  const [valueInputs, setValueInputs] = useState<ArgType>()

  function addRow(row: ArgType) {
    if(row && Object.values(row).every((value) => value ?? false))
    {
      rowData.push(row)
      setRowData([...rowData])
      onChange(rowData)
      setValueInputs(undefined)
    }
  }

  function removeRow(row: ArgType) {
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
            {!!Object.values(header).length &&
              Object.values(header).map((entry: string, key) => {
                return <th key={key}>{entry}</th>
              })}
            <th></th>
          </tr>
          {!!rowData.length &&
            rowData.map((row: ArgType, key) => {
              return (
                <tr key={key}>
                  {!!Object.values(row).length &&
                    Object.values(row).map((value: string, key) => {
                        return <td key={key}>{value}</td>
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
        {!!Object.values(header).length &&
          Object.values(header).map((entry: string, key) => {
            return (
              <TextInputField
                key={key}
                {...{
                  label: `${entry}:`,
                  value: valueInputs ? Object.values(valueInputs).at(key) : '',
                  htmlId: 'otherOptionsInput',
                  placeholder: inputPlaceHolder ? Object.values(inputPlaceHolder).at(key) : '',
                  onChange: (event) => {
                    const tmp = valueInputs ?? {} as ArgType
                    tmp[entry] = event.target.value
                    setValueInputs({...tmp})
                  }
                }}
              />
            )
          })}
        <SvgButton
          onClick={() => addRow(valueInputs ?? {} as ArgType)}
          className={`is-primary`}
        >
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
