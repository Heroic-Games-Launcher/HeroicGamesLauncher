import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { PositiveInteger } from 'common/schemas'

const LegendaryTimeout = () => {
  const { t } = useTranslation()
  const [legendaryTimeout, setLegendaryTimeout] = useSetting(
    'legendaryTimeout',
    PositiveInteger.parse(10)
  )
  const [tempValue, setTempValue] = useState<string>(`${legendaryTimeout}`)
  const [invalidInput, setInvalidInput] = useState<boolean>(false)

  const validateAndSetTimeout = useCallback(
    (timeoutStr: string) => {
      setTempValue(timeoutStr)
      const validation = PositiveInteger.safeParse(Number(timeoutStr))
      setInvalidInput(!validation.success)
      if (!validation.success) return
      setLegendaryTimeout(validation.data)
    },
    [setLegendaryTimeout]
  )

  return (
    <TextInputField
      htmlId="legendary_timeout"
      label={t(
        'setting.legendaryTimeout',
        'Legendary/Epic Timeout (default is 10 seconds)'
      )}
      onChange={validateAndSetTimeout}
      value={tempValue}
      warning={
        invalidInput ? (
          <span className="warning">
            {t('setting.invalidInputError', 'Invalid input provided')}
          </span>
        ) : null
      }
    />
  )
}

export default LegendaryTimeout
