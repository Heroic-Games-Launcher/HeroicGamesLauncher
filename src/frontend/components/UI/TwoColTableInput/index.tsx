import { ReactNode, useContext, useEffect, useState } from 'react'
import SvgButton from '../SvgButton'
import TextInputField from '../TextInputField'
import { Plus } from 'lucide-react'
import Button from '../Button'
import InfoTooltip from '../InfoTooltip'
import Icon from '../Icon'
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
  info?: ReactNode
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
  info,
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
      newVarName.includes(connector) &&
      !newVarValue
    ) {
      const [key, value] = newVarName.split(connector)
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
        isRTL,
        'tableFieldWrapper--noConnector': !connector
      })}
    >
      {label && (
        <label className="settingsSectionTitle" htmlFor={htmlId}>
          {label}
          {info && <InfoTooltip content={info} label={label} />}
        </label>
      )}
      {!!rowData.length && (
        <ul className="tableFieldWrapper__rows">
          {rowData.map((row: ColumnProps, key) => (
            <li key={key} className="tableFieldWrapper__row">
              <span className="tableFieldWrapper__key">{row.key}</span>
              {connector && (
                <span className="tableFieldWrapper__connector">
                  {connector}
                </span>
              )}
              <span className="tableFieldWrapper__value">{row.value}</span>
              <span className="tableFieldWrapper__rowActions">
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
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="tableFieldWrapper__add">
        <TextInputField
          label={header.key}
          value={newVarName}
          htmlId={`${header.key}-key`}
          placeholder={inputPlaceHolder.key}
          extraClass={keyError ? 'error' : ''}
          onChange={(newValue) => setNewVarName(newValue)}
        />
        {connector && (
          <span className="tableFieldWrapper__connector">{connector}</span>
        )}
        <TextInputField
          label={header.value}
          value={newVarValue}
          htmlId={`${header.value}-key`}
          placeholder={inputPlaceHolder.value}
          onChange={(newValue) => setNewVarValue(newValue)}
        />
        <Button
          variant="ghost"
          aria-label={t('two_col_table.add', 'Add')}
          title={t('two_col_table.add', 'Add')}
          onClick={() => addRow({ key: newVarName, value: newVarValue })}
          icon={<Icon glyph={Plus} size="lg" strokeWidth={2.25} />}
        />
      </div>

      {(keyError || valueError) && (
        <p className="tableFieldWrapper__error">{keyError || valueError}</p>
      )}

      {dirtyInputs && !keyError && !valueError && newVarName && (
        <p className="tableFieldWrapper__hint">
          {t(
            'two_col_table.save_hint',
            'Changes in this table are not saved automatically. Click the + button'
          )}
          <FontAwesomeIcon icon={faArrowUp} />
        </p>
      )}

      {newVarValue && warning}
      {afterInput}
    </div>
  )
}
