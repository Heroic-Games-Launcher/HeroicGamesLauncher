import { ReactNode, useContext, useEffect, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { faArrowUp } from '@fortawesome/free-solid-svg-icons'
import EditIcon from '@mui/icons-material/Edit'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
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
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [originalInputs, setOriginalInputs] =
    useState<ColumnProps>(EMPTY_INPUTS)
  const [dirtyInputs, setDirtyInputs] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [valueError, setValueError] = useState('')

  useEffect(() => {
    setDirtyInputs(
      newVarName !== originalInputs.key || newVarValue !== originalInputs.value
    )

    if (
      // if there's a connector, try to split the key
      connector &&
      newVarValue.includes(connector) &&
      !newVarValue
    ) {
      const [key, value] = newVarValue.split(connector)
      setNewVarName(key)
      setNewVarValue(value)
    } else {
      // else, validate input
      if (validation) {
        const [keyError, valueError] = validation(newVarName, newVarValue)
        setKeyError(keyError)
        setValueError(valueError)
      }
    }
  }, [newVarName, newVarValue])

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
    setNewVarName('')
    setNewVarValue('')
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
    setNewVarName(row.key)
    setNewVarValue(row.value)
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
                value={newVarName}
                htmlId={`${header.key}-key`}
                placeholder={inputPlaceHolder.key}
                extraClass={keyError ? 'error' : ''}
                onChange={(newValue) => setNewVarName(newValue)}
              />
            </td>
            <td>{connector}</td>
            <td>
              <TextInputField
                label={header.value}
                value={newVarValue}
                htmlId={`${header.value}-key`}
                placeholder={inputPlaceHolder.value}
                onChange={(newValue) => setNewVarValue(newValue)}
              />
            </td>
            <td>
              <SvgButton
                onClick={() => addRow({ key: newVarName, value: newVarValue })}
                className={`is-primary`}
              >
                <AddBoxIcon
                  style={{ color: 'var(--success)' }}
                  fontSize="large"
                />
              </SvgButton>
            </td>
          </tr>
          <tr className="error">
            <td colSpan={3}>{keyError || valueError}</td>
          </tr>
          <tr className="dirty">
            <td colSpan={3}>
              {dirtyInputs && !keyError && !valueError && newVarName && (
                <>
                  <span>
                    {t(
                      'two_col_table.save_hint',
                      'Changes in this table are not saved automatically. Click the + button'
                    )}
                  </span>
                  <FontAwesomeIcon icon={faArrowUp} />
                </>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
      {newVarValue && warning}
      {afterInput}
    </div>
  )
}
