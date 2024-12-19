import React, { ChangeEvent, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SelectField,
  TextInputField,
  ToggleSwitch,
  UpdateComponent
} from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { MenuItem } from '@mui/material'

const Gamescope = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [gamescope, setGamescope] = useSetting('gamescope', {
    enableUpscaling: false,
    enableLimiter: false,
    windowType: 'fullscreen',
    gameWidth: '',
    gameHeight: '',
    upscaleHeight: '',
    upscaleWidth: '',
    upscaleMethod: 'fsr',
    fpsLimiter: '',
    fpsLimiterNoFocus: '',
    additionalOptions: ''
  })
  const [fetching, setFetching] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)

  const [additionalOptions, setAdditionalOptions] = useState(
    gamescope.additionalOptions
  )

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

  function setResolution(value: string): string | undefined {
    const re = /^[0-9\b]+$/

    if (value === '' || re.test(value)) {
      return value
    }

    return undefined
  }

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
  ]

  const windowTypes = [
    {
      name: t('options.gamescope.fullscreen', 'Fullscreen'),
      value: 'fullscreen'
    },
    {
      name: t('options.gamescope.borderless', 'Borderless'),
      value: 'borderless'
    },
    {
      name: t('options.gamescope.windowed', 'Windowed'),
      value: 'windowed'
    }
  ]

  return (
    <div className="gamescopeSettings">
      {/* Enable Upscale */}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeUpscaleToggle"
          value={gamescope.enableUpscaling || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableUpscaling: !gamescope.enableUpscaling
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
            onChange={(event) =>
              setGamescope({
                ...gamescope,
                upscaleMethod: event.target.value
              })
            }
            value={gamescope.upscaleMethod}
          >
            {upscaleMethods.map((el) => (
              <MenuItem value={el.value} key={el.value}>
                {el.name}
              </MenuItem>
            ))}
          </SelectField>
          {/* Game Res */}
          <div className="row">
            <TextInputField
              label={t('options.gamescope.gameWidth', 'Game Width')}
              htmlId="gameWidth"
              placeholder=""
              maxLength={4}
              value={gamescope.gameWidth}
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
                  gameWidth:
                    setResolution(event.currentTarget.value) ??
                    gamescope.gameWidth
                })
              }}
            />

            <TextInputField
              label={t('options.gamescope.gameHeight', 'Game Height')}
              htmlId="gameHeight"
              placeholder=""
              maxLength={4}
              value={gamescope.gameHeight}
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
                  gameHeight:
                    setResolution(event.currentTarget.value) ??
                    gamescope.gameHeight
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
              value={gamescope.upscaleWidth}
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
                  upscaleWidth:
                    setResolution(event.currentTarget.value) ??
                    gamescope.upscaleWidth
                })
              }}
            />

            <TextInputField
              label={t('options.gamescope.upscaleHeight', 'Upscale Height')}
              htmlId="upscaleHeight"
              placeholder=""
              maxLength={4}
              value={gamescope.upscaleHeight}
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
                  upscaleHeight:
                    setResolution(event.currentTarget.value) ??
                    gamescope.upscaleHeight
                })
              }}
            />
          </div>
          {/* Window Type */}
          <SelectField
            label={'Window Type'}
            htmlId="windowType"
            onChange={(event) =>
              setGamescope({
                ...gamescope,
                windowType: event.target.value
              })
            }
            value={gamescope.windowType}
          >
            {windowTypes.map((el) => (
              <MenuItem value={el.value} key={el.value}>
                {el.name}
              </MenuItem>
            ))}
          </SelectField>
        </>
      )}
      {/* Enable Limiter*/}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeLimiterToggle"
          value={gamescope.enableLimiter || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableLimiter: !gamescope.enableLimiter
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
            value={gamescope.fpsLimiter}
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
                fpsLimiter:
                  setResolution(event.currentTarget.value) ??
                  gamescope.fpsLimiter
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
            value={gamescope.fpsLimiterNoFocus}
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
                fpsLimiterNoFocus:
                  setResolution(event.currentTarget.value) ??
                  gamescope.fpsLimiterNoFocus
              })
            }}
          />
        </div>
      )}
      {/* Additional Options */}
      <TextInputField
        label={t('options.gamescope.additionalOptions', 'Additional Options')}
        htmlId="additionalOptions"
        placeholder=""
        value={additionalOptions}
        afterInput={
          <FontAwesomeIcon
            className="helpIcon"
            icon={faCircleInfo}
            title={t(
              'help.gamescope.additionalOptions',
              'Additional commandline flags to pass into gamescope.'
            )}
          />
        }
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setAdditionalOptions(event.currentTarget.value)
        }}
        onBlur={(event: ChangeEvent<HTMLInputElement>) =>
          setGamescope({
            ...gamescope,
            additionalOptions: event.currentTarget.value
          })
        }
      />
    </div>
  )
}

export default Gamescope
