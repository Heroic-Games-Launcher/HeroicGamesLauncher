import { SelectField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { size } from 'frontend/helpers'
import { SteamInstallLibrary } from 'common/types/steam'

interface SteamLibrarySelectorProps {
  libraries: SteamInstallLibrary[]
  selectedPath: string
  onChange: (path: string) => void
}

/**
 * Drive/library picker for installing a Steam game. Steam installs into a
 * library folder (one per drive), so instead of a free-form folder browser we
 * let the user choose one of the library folders Aurelia reports, annotated
 * with each drive's free space.
 */
export default function SteamLibrarySelector({
  libraries,
  selectedPath,
  onChange
}: SteamLibrarySelectorProps) {
  const { t } = useTranslation('gamepage')
  const label = t('install.steam-path', 'Install Path (Steam library)')

  if (!libraries.length) {
    return (
      <SelectField
        label={label}
        htmlId="steamLibrarySelector"
        value=""
        disabled
        onChange={() => undefined}
      >
        <MenuItem value="">
          {t(
            'install.steam-no-libraries',
            'No Steam library folders found — add a drive in Steam first.'
          )}
        </MenuItem>
      </SelectField>
    )
  }

  // Guard against a value that isn't (yet) one of the options, which MUI warns
  // about — fall back to the first library.
  const value = libraries.some((lib) => lib.path === selectedPath)
    ? selectedPath
    : libraries[0].path

  return (
    <SelectField
      label={label}
      htmlId="steamLibrarySelector"
      value={value}
      disabled={libraries.length <= 1}
      onChange={(e) => onChange(e.target.value)}
    >
      {libraries.map((lib) => (
        <MenuItem key={lib.path} value={lib.path}>
          {lib.free_bytes !== null
            ? `${lib.path}  (${size(lib.free_bytes)} ${t(
                'install.free',
                'free'
              )})`
            : lib.path}
        </MenuItem>
      ))}
    </SelectField>
  )
}
