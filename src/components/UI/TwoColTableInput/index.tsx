import React, { ReactNode, useContext, useEffect, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { faArrowUp } from '@fortawesome/free-solid-svg-icons'
import EditIcon from '@mui/icons-material/Edit'
import classnames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

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
  validation?: (key: string, value: string) => [string, string]
  connector?: string
}

const EMPTY_INPUTS = { key: '', value: '' }

export function TableInput({
  label,
  htmlId,
  header,
  rows,
  fullFills = { key: true, value: true },
  onChange,
  inputPlaceHolder = EMPTY_INPUTS,
  warning,
  afterInput,
  validation,
  connector = ''
}: Props) {
  const { isRTL } = useContext(ContextProvider)
  const { t } = useTranslation()
  const [rowData, setRowData] = useState<ColumnProps[]>(rows)
  const [valueInputs, setValueInputs] = useState<ColumnProps>(EMPTY_INPUTS)
  const [originalInputs, setOriginalInputs] =
    useState<ColumnProps>(EMPTY_INPUTS)
  const [dirtyInputs, setDirtyInputs] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [valueError, setValueError] = useState('')

  useEffect(() => {
    setDirtyInputs(
      valueInputs.key !== originalInputs.key ||
        valueInputs.value !== originalInputs.value
    )

    if (
      // if there's a connector, try to split the key
      connector &&
      valueInputs.key.includes(connector) &&
      !valueInputs.value
    ) {
      const [key, value] = valueInputs.key.split(connector)
      setValueInputs({ key: key, value: value })
    } else {
      // else, validate input
      if (validation) {
        const [keyError, valueError] = validation(
          valueInputs.key,
          valueInputs.value
        )
        setKeyError(keyError)
        setValueError(valueError)
      }
    }
  }, [valueInputs])

  function addRow(row: ColumnProps) {
    if (keyError) {
      return
    }

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
    setValueInputs(EMPTY_INPUTS)
    setOriginalInputs(EMPTY_INPUTS)
    setDirtyInputs(false)
  }

  function removeRow(row: ColumnProps) {
    const index = rowData.findIndex((entry) => entry === row)
    rowData.splice(index, 1)
    setRowData([...rowData])
    onChange(rowData)
  }

  function editRow(row: ColumnProps) {
    setValueInputs({ key: row.key, value: row.value })
    setOriginalInputs({ key: row.key, value: row.value })
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
                  <td></td>
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
                extraClass={keyError ? 'error' : ''}
                onChange={(event) => {
                  setValueInputs({ ...valueInputs, key: event.target.value })
                }}
              />
            </td>
            <td>{connector}</td>
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
          {(keyError || valueError) && (
            <tr className="error">
              <td colSpan={3}>{keyError || valueError}</td>
            </tr>
          )}
          {dirtyInputs && !keyError && !valueError && valueInputs.key && (
            <tr className="dirty">
              <td colSpan={3}>
                <span>
                  {t(
                    'two_col_table.save_hint',
                    'Changes in this table are not saved automatically. Click the + button'
                  )}
                </span>
                <FontAwesomeIcon icon={faArrowUp} />
              </td>
            </tr>
          )}
        </tfoot>
      </table>
      {valueInputs.value && warning}
      {afterInput}
    </div>
  )
}
