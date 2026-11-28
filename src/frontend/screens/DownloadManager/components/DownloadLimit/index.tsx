import './index.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { Gauge } from 'lucide-react'
import { Icon, SelectField, Tooltip } from 'frontend/components/UI'
import { useDisplayUnits } from 'frontend/state/DisplayUnits'
import { PRESETS_KBIT, equivalentText, rateText } from './limitText'

export default function DownloadLimit() {
  const { t } = useTranslation()
  const units = useDisplayUnits((state) => state.units)
  const [limit, setLimit] = useState<number>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void window.api.getSteamDownloadLimit().then((kbit) => {
      if (active) setLimit(kbit)
    })
    return () => {
      active = false
    }
  }, [])

  const handleChange = async (event: SelectChangeEvent) => {
    const previous = limit
    const next = Number(event.target.value)
    setLimit(next)
    setSaving(true)
    try {
      setLimit(await window.api.setSteamDownloadLimit(next))
    } catch (error) {
      console.error('Failed to set Steam download limit', error)
      setLimit(previous)
    } finally {
      setSaving(false)
    }
  }

  const presets = [...PRESETS_KBIT]
  // keep custom CLI values selectable
  if (limit && !presets.includes(limit)) {
    presets.push(limit)
    presets.sort((a, b) => a - b)
  }

  const label = t('download-manager.limit.label', 'Download limit')
  const unlimitedLabel = t('download-manager.limit.unlimited', 'Unlimited')
  const limitText = (kbit: number) =>
    t('download-manager.limit.short', 'Limit {{value}}', {
      value: rateText(kbit)
    })

  const tooltip = limit
    ? t(
        'download-manager.limit.tooltip',
        'Download limit: {{limit}} (≈ {{speed}})',
        {
          limit: rateText(limit),
          speed: equivalentText(limit, units)
        }
      )
    : label

  return (
    <Tooltip content={tooltip}>
      <div className="DownloadLimit">
        <SelectField
          htmlId="steam_download_limit"
          value={limit === undefined ? '' : String(limit)}
          onChange={(event) => void handleChange(event)}
          disabled={limit === undefined || saving}
          ariaLabel={label}
          extraClass="DownloadLimit__select"
          startIcon={<Icon glyph={Gauge} size="sm" />}
        >
          <MenuItem value="0">{unlimitedLabel}</MenuItem>
          {presets.map((kbit) => (
            <MenuItem key={kbit} value={String(kbit)}>
              {limitText(kbit)}
            </MenuItem>
          ))}
        </SelectField>
      </div>
    </Tooltip>
  )
}
