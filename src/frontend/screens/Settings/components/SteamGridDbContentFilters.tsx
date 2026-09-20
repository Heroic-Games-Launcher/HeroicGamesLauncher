import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import { SGDBContentFilter, sgdbContentFilters } from 'common/types'

const noFilters: SGDBContentFilter[] = []

const SteamGridDbContentFilters = () => {
  const { t } = useTranslation()
  const [filters, setFilters] = useSetting(
    'steamGridDbContentFilters',
    noFilters
  )

  const labels: Record<SGDBContentFilter, string> = {
    nsfw: t('settings.steamgriddb.filters.nsfw', 'Show adult artwork'),
    humor: t(
      'settings.steamgriddb.filters.humor',
      'Show humorous or joke artwork'
    ),
    epilepsy: t(
      'settings.steamgriddb.filters.epilepsy',
      'Show potentially seizure-inducing artwork'
    )
  }

  const toggle = (filter: SGDBContentFilter) => {
    setFilters(
      filters.includes(filter)
        ? filters.filter((entry) => entry !== filter)
        : [...filters, filter]
    )
  }

  return (
    <>
      <h4 className="settingSubheader">
        {t('settings.steamgriddb.filters.title', 'SteamGridDB content filters')}
      </h4>
      {sgdbContentFilters.map((filter) => (
        <div className="toggleRow" key={filter}>
          <ToggleSwitch
            htmlId={`steamGridDbContentFilter-${filter}`}
            value={filters.includes(filter)}
            handleChange={() => toggle(filter)}
            title={labels[filter]}
          />
        </div>
      ))}
    </>
  )
}

export default SteamGridDbContentFilters
