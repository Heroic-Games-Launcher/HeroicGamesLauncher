import './index.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { Gauge } from 'lucide-react'
import { Icon, SelectField, Tooltip } from 'frontend/components/UI'

// 1 MB/s in kbit/s
const KBIT_PER_MB = 8000
const PRESETS_MB = [1, 2, 5, 10, 25, 50, 100]

export default function DownloadLimit() {
  const { t } = useTranslation()
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

  const unit = t('download-manager.label.unit', 'MB/s')
  const presets = PRESETS_MB.map((mb) => mb * KBIT_PER_MB)
  // keep custom CLI values selectable
  if (limit && !presets.includes(limit)) {
    presets.push(limit)
    presets.sort((a, b) => a - b)
  }

  const label = t('download-manager.limit.label', 'Download limit')

  return (
    <Tooltip content={label}>
      <div className="DownloadLimit">
        <Icon glyph={Gauge} size="sm" />
        <SelectField
          htmlId="steam_download_limit"
          value={limit === undefined ? '' : String(limit)}
          onChange={(event) => void handleChange(event)}
          disabled={limit === undefined || saving}
          extraClass="DownloadLimit__select"
        >
          <MenuItem value="0">
            {t('download-manager.limit.unlimited', 'Unlimited')}
          </MenuItem>
          {presets.map((kbit) => (
            <MenuItem key={kbit} value={String(kbit)}>
              {`${Math.round((kbit / KBIT_PER_MB) * 100) / 100} ${unit}`}
            </MenuItem>
          ))}
        </SelectField>
      </div>
    </Tooltip>
  )
}
