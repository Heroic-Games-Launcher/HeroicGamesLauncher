import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  SelectField,
  TextInputField,
  ToggleSwitch,
  UpdateComponent
} from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@mui/material'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'

const Gamescope = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [
    gamescope,
    setGamescope,
    gamescopeConfigFetched,
    isSetToDefault,
    resetToDefault
  ] = useSharedConfig('gamescope')
  const [fetching, setFetching] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setFetching(true)
    window.api
      .hasExecutable('gamescope')
      .then((installed) => {
        setIsInstalled(installed)
        setFetching(false)
      })
      .catch(() => {
        setIsInstalled(false)
        setFetching(false)
      })
  }, [])

  const parseInputString = useCallback(
    (value: string): number | null =>
      isFinite(Number(value)) ? Number(value) : null,
    []
  )

  if (!gamescopeConfigFetched) return <></>

  if (!isLinux) {
    return <></>
  }

  if (fetching) {
    return (
      <UpdateComponent
        message={t(
          'settings.gamescope.searchMsg',
          'Searching for gamescope executable.'
        )}
      />
    )
  }

  if (!isInstalled) {
    return (
      <div style={{ color: 'red' }}>
        {t(
          'setting.gamescope.missingMsg',
          'We could not found gamescope on the PATH. Install it or add it to the PATH.'
        )}
      </div>
    )
  }

  const upscaleMethods = [
    { name: 'AMD FidelityFX™ Super Resolution 1.0 (FSR)', value: 'fsr' },
    {
      name: t('options.gamescope.nis', 'NVIDIA Image Scale (NIS)'),
      value: 'nis'
    },
    {
      name: t('options.gamescope.interger', 'Interger Upscale'),
      value: 'integer'
    },
    { name: t('options.gamescope.stretch', 'Stretch Image'), value: 'stretch' }
  ] as const

  const windowTypes = [
    {
      name: t('options.gamescope.fullscreen', 'Fullscreen'),
      value: 'fullscreen'
    },
    {
      name: t('options.gamescope.borderless', 'Borderless'),
      value: 'borderless'
    }
  ] as const

  return (
    <div className="gamescopeSettings">
      {!isSetToDefault && (
        <Button
          onClick={resetToDefault}
          startIcon={<SettingsBackupRestoreIcon />}
        >
          {t('button.reset-to-default', 'Reset to default')}
        </Button>
      )}
      {/* Enable Upscale */}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeUpscaleToggle"
          value={gamescope.enableUpscaling}
          handleChange={async () =>
            setGamescope({
              ...gamescope,
              enableUpscaling: !gamescope.enableUpscaling,
              gameWidth: null,
              gameHeight: null,
              upscaleWidth: null,
              upscaleHeight: null,
              upscaleMethod: null
            })
          }
          title={t('setting.gamescope.enableUpscaling', 'Enables Upscaling')}
        />
      </div>
      {/* Upscale Settings */}
      {gamescope.enableUpscaling && (
        <>
          {/* Upscale Method */}
          <SelectField
            label={'Upscale Method'}
            htmlId="upscaleMethod"
            afterSelect={
              <FontAwesomeIcon
                className="helpIcon"
                icon={faCircleInfo}
                title={t(
                  'help.gamescope.upscaleMethod',
                  'The upscaling method gamescope should use.'
                )}
              />
            }
            onChange={async (event: ChangeEvent<HTMLSelectElement>) =>
              setGamescope({
                ...gamescope,
                upscaleMethod: event.currentTarget
                  .value as (typeof upscaleMethods)[number]['value']
              })
            }
            value={gamescope.upscaleMethod ?? ''}
          >
            {upscaleMethods.map((el) => (
              <option value={el.value} key={el.value}>
                {el.name}
              </option>
            ))}
          </SelectField>
          {/* Game Res */}
          <div className="row">
            <TextInputField
              label={t('options.gamescope.gameWidth', 'Game Width')}
              htmlId="gameWidth"
              placeholder=""
              maxLength={4}
              value={(gamescope.gameWidth ?? '').toString()}
              afterInput={
                <FontAwesomeIcon
                  className="helpIcon"
                  icon={faCircleInfo}
                  title={t(
                    'help.gamescope.gameWidth',
                    'The width resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                />
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setGamescope({
                  ...gamescope,
                  gameWidth: parseInputString(event.target.value)
                })
              }}
            />

            <TextInputField
              label={t('options.gamescope.gameHeight', 'Game Height')}
              htmlId="gameHeight"
              placeholder=""
              maxLength={4}
              value={(gamescope.gameHeight ?? '').toString()}
              afterInput={
                <FontAwesomeIcon
                  className="helpIcon"
                  icon={faCircleInfo}
                  title={t(
                    'help.gamescope.gameHeight',
                    'The height resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                />
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setGamescope({
                  ...gamescope,
                  gameHeight: parseInputString(event.target.value)
                })
              }}
            />
          </div>
          {/* Upscale Res */}
          <div className="row">
            <TextInputField
              label={t('options.gamescope.upscaleWidth', 'Upscale Width')}
              htmlId="upscaleWidth"
              placeholder=""
              maxLength={4}
              value={(gamescope.upscaleWidth ?? '').toString()}
              afterInput={
                <FontAwesomeIcon
                  className="helpIcon"
                  icon={faCircleInfo}
                  title={t(
                    'help.gamescope.upscaleWidth',
                    'The width resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                />
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setGamescope({
                  ...gamescope,
                  upscaleWidth: parseInputString(event.target.value)
                })
              }}
            />

            <TextInputField
              label={t('options.gamescope.upscaleHeight', 'Upscale Height')}
              htmlId="upscaleHeight"
              placeholder=""
              maxLength={4}
              value={(gamescope.upscaleHeight ?? '').toString()}
              afterInput={
                <FontAwesomeIcon
                  className="helpIcon"
                  icon={faCircleInfo}
                  title={t(
                    'help.gamescope.upscaleHeight',
                    'The height resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                />
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setGamescope({
                  ...gamescope,
                  upscaleHeight: parseInputString(event.target.value)
                })
              }}
            />
          </div>
          {/* Window Type */}
          <SelectField
            label={'Window Type'}
            htmlId="windowType"
            onChange={async (event: ChangeEvent<HTMLSelectElement>) =>
              setGamescope({
                ...gamescope,
                windowType: event.currentTarget
                  .value as (typeof windowTypes)[number]['value']
              })
            }
            value={gamescope.windowType ?? ''}
          >
            {windowTypes.map((el) => (
              <option value={el.value} key={el.value}>
                {el.name}
              </option>
            ))}
          </SelectField>
        </>
      )}
      {/* Enable Limiter*/}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeLimiterToggle"
          value={gamescope.enableLimiter || false}
          handleChange={async () =>
            setGamescope({
              ...gamescope,
              enableLimiter: !gamescope.enableLimiter,
              fpsLimiter: null,
              fpsLimiterNoFocus: null
            })
          }
          title={t('setting.gamescope.enableLimiter', 'Enable FPS Limiter')}
        />
      </div>
      {/* FPS Limiter Settings */}
      {gamescope.enableLimiter && (
        <div className="row">
          <TextInputField
            label={t('options.gamescope.fpsLimiter', 'FPS Limiter')}
            htmlId="fpsLimiter"
            placeholder=""
            maxLength={3}
            value={(gamescope.fpsLimiter ?? '').toString()}
            afterInput={
              <FontAwesomeIcon
                className="helpIcon"
                icon={faCircleInfo}
                title={t(
                  'help.gamescope.fpsLimiter',
                  'The frame rate limit gamescope should limit per second.'
                )}
              />
            }
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setGamescope({
                ...gamescope,
                fpsLimiter: parseInputString(event.target.value)
              })
            }}
          />

          <TextInputField
            label={t(
              'options.gamescope.fpsLimiterNoFocus',
              'FPS Limiter (No Focus)'
            )}
            htmlId="fpsLimiterNoFocus"
            placeholder=""
            maxLength={3}
            value={(gamescope.fpsLimiterNoFocus ?? '').toString()}
            afterInput={
              <FontAwesomeIcon
                className="helpIcon"
                icon={faCircleInfo}
                title={t(
                  'help.gamescope.fpsLimiterNoFocus',
                  'The frame rate limit gamescope should limit per second if the game is not focused.'
                )}
              />
            }
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setGamescope({
                ...gamescope,
                fpsLimiterNoFocus: parseInputString(event.target.value)
              })
            }}
          />
        </div>
      )}
    </div>
  )
}

export default Gamescope
