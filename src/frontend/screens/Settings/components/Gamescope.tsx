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
import { MenuItem } from '@mui/material'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const Gamescope = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [gamescope, setGamescope] = useSetting('gamescope', {
    enableUpscaling: false,
    enableLimiter: false,
    enableForceGrabCursor: false,
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
        {window.isFlatpak
          ? t(
              'setting.gamescope.missingMsgFlatpak',
              "We could not find a compatible version of Gamescope. Install Gamescope's flatpak package with runtime 24.08 and restart Heroic."
            )
          : t(
              'setting.gamescope.missingMsg',
              'We could not find gamescope on the PATH. Install it or add it to the PATH.'
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
              <InfoIcon
                text={t(
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
                <InfoIcon
                  text={t(
                    'help.gamescope.gameWidth',
                    'The width resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                />
              }
              onChange={(newValue) => {
                setGamescope({
                  ...gamescope,
                  gameWidth: setResolution(newValue) ?? gamescope.gameWidth
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
                <InfoIcon
                  text={t(
                    'help.gamescope.gameHeight',
                    'The height resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                />
              }
              onChange={(newValue) => {
                setGamescope({
                  ...gamescope,
                  gameHeight: setResolution(newValue) ?? gamescope.gameHeight
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
                <InfoIcon
                  text={t(
                    'help.gamescope.upscaleWidth',
                    'The width resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                />
              }
              onChange={(newValue) => {
                setGamescope({
                  ...gamescope,
                  upscaleWidth:
                    setResolution(newValue) ?? gamescope.upscaleWidth
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
                <InfoIcon
                  text={t(
                    'help.gamescope.upscaleHeight',
                    'The height resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                />
              }
              onChange={(newValue) => {
                setGamescope({
                  ...gamescope,
                  upscaleHeight:
                    setResolution(newValue) ?? gamescope.upscaleHeight
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
              <InfoIcon
                text={t(
                  'help.gamescope.fpsLimiter',
                  'The frame rate limit gamescope should limit per second.'
                )}
              />
            }
            onChange={(newValue) => {
              setGamescope({
                ...gamescope,
                fpsLimiter: setResolution(newValue) ?? gamescope.fpsLimiter
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
              <InfoIcon
                text={t(
                  'help.gamescope.fpsLimiterNoFocus',
                  'The frame rate limit gamescope should limit per second if the game is not focused.'
                )}
              />
            }
            onChange={(newValue) => {
              setGamescope({
                ...gamescope,
                fpsLimiterNoFocus:
                  setResolution(newValue) ?? gamescope.fpsLimiterNoFocus
              })
            }}
          />
        </div>
      )}
      {/* Enable Force Grab Cursor*/}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeForceGrabCursorToggle"
          value={gamescope.enableForceGrabCursor || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableForceGrabCursor: !gamescope.enableForceGrabCursor
            })
          }
          title={t(
            'setting.gamescope.enableForceGrabCursor',
            'Enable Force Grab Cursor'
          )}
        />
        <InfoIcon
          text={t(
            'help.gamescope.forceGrabCursor',
            'Always use relative mouse mode instead of flipping dependent on cursor visibility. (Useful for when applications keep losing focus)'
          )}
        />
      </div>
      {/* Additional Options */}
      <TextInputField
        label={t('options.gamescope.additionalOptions', 'Additional Options')}
        htmlId="additionalOptions"
        placeholder=""
        value={additionalOptions}
        afterInput={
          <InfoIcon
            text={t(
              'help.gamescope.additionalOptions',
              'Additional commandline flags to pass into gamescope.'
            )}
          />
        }
        onChange={(newValue) => {
          setAdditionalOptions(newValue)
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
