import React from 'react'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import { BuildItem } from 'common/types/gog'

interface BuildSelectorProps {
  gameBuilds: BuildItem[]
  selectedBuild?: string
  setSelectedBuild: (build?: string) => void
}

export default function BuildSelector({
  gameBuilds,
  selectedBuild,
  setSelectedBuild
}: BuildSelectorProps) {
  const { i18n, t } = useTranslation('gamepage')

  const getFormattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.languages)
  }

  return (
    <>
      <ToggleSwitch
        title={`${t(
          'game.builds.toggle',
          'Keep the game at specific version'
        )}`}
        htmlId="buildsSelectorToggle"
        value={!!selectedBuild}
        handleChange={() => {
          if (selectedBuild) {
            setSelectedBuild(undefined)
          } else {
            setSelectedBuild(gameBuilds[0].build_id)
          }
        }}
      />

      {!!selectedBuild && !!gameBuilds.length && (
        <SelectField
          label={`${t('game.builds.buildsSelector', 'Select Game Version')}`}
          htmlId="buildsSelectorField"
          value={selectedBuild}
          disabled={gameBuilds.length <= 1}
          onChange={(e) => setSelectedBuild(e.target.value)}
        >
          {gameBuilds.map((build) => (
            <option key={`build-${build.build_id}`} value={build.build_id}>
              <>
                {t('game.builds.version', 'Version')} {build.version_name} -{' '}
                {getFormattedDate(build.date_published)}
              </>
            </option>
          ))}
        </SelectField>
      )}
    </>
  )
}
