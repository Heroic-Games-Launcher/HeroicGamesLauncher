import { ChangeEvent, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Chip,
  SelectField,
  SettingsCard,
  TextInputField,
  ToggleSwitch,
  UpdateComponent
} from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { MenuItem } from '@mui/material'
import {
  Gauge,
  MonitorCog,
  SlidersHorizontal,
  TerminalSquare
} from 'lucide-react'

const GAMESCOPE_DOCS_URL = 'https://github.com/ValveSoftware/gamescope#options'

const GAME_RESOLUTION_PRESETS = [
  { label: '480p', width: 854, height: 480 },
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '1440p', width: 2560, height: 1440 },
  { label: '4K', width: 3840, height: 2160 }
]

const UPSCALE_RESOLUTION_PRESETS = [
  { label: '1080p', width: 1920, height: 1080 },
  { label: '1440p', width: 2560, height: 1440 },
  { label: '4K', width: 3840, height: 2160 },
  { label: '8K', width: 7680, height: 4320 }
]

const Gamescope = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [gamescope, setGamescope] = useSetting('gamescope', {
    enableUpscaling: false,
    enableLimiter: false,
    enableForceGrabCursor: false,
    enableHDR: false,
    enableAdaptiveSync: false,
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
  const [monitorResolution, setMonitorResolution] = useState<{
    width: number
    height: number
  } | null>(null)
  const wasUpscalingEnabled = useRef(gamescope.enableUpscaling)

  const [additionalOptions, setAdditionalOptions] = useState(
    gamescope.additionalOptions ?? ''
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

  useEffect(() => {
    const justEnabled =
      gamescope.enableUpscaling && !wasUpscalingEnabled.current
    wasUpscalingEnabled.current = gamescope.enableUpscaling
    if (!justEnabled) return
    if (gamescope.upscaleWidth || gamescope.upscaleHeight) return
    void window.api
      .getPrimaryDisplay()
      .then((display) => {
        if (!display.width || !display.height) return
        setMonitorResolution({
          width: display.width,
          height: display.height
        })
        setGamescope({
          ...gamescope,
          upscaleWidth: String(display.width),
          upscaleHeight: String(display.height)
        })
      })
      .catch(() => undefined)
  }, [gamescope, setGamescope])

  const setGameResolution = (width: number, height: number) => {
    setGamescope({
      ...gamescope,
      gameWidth: String(width),
      gameHeight: String(height)
    })
  }

  const setUpscaleResolution = (width: number, height: number) => {
    setGamescope({
      ...gamescope,
      upscaleWidth: String(width),
      upscaleHeight: String(height)
    })
  }

  const detectResolution = async () => {
    try {
      const display = await window.api.getPrimaryDisplay()
      if (!display.width || !display.height) return
      setMonitorResolution({
        width: display.width,
        height: display.height
      })
      setGamescope({
        ...gamescope,
        upscaleWidth: String(display.width),
        upscaleHeight: String(display.height)
      })
    } catch {
      // keep the current values when detection fails
    }
  }

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
      <Alert variant="error">
        {window.isFlatpak
          ? t(
              'setting.gamescope.warningFlatpak',
              "We could not find a compatible version of gamescope. Install gamescope's flatpak package with runtime {{runtimeVersion}} and restart Heroic.",
              { runtimeVersion: window.flatpakRuntimeVersion }
            )
          : t(
              'setting.gamescope.missingMsg',
              'We could not find gamescope on the PATH. Install it or add it to the PATH.'
            )}
      </Alert>
    )
  }

  const upscaleMethods = [
    { name: 'AMD FidelityFX™ Super Resolution 1.0 (FSR)', value: 'fsr' },
    {
      name: t('options.gamescope.nis', 'NVIDIA image scale (NIS)'),
      value: 'nis'
    },
    {
      name: t('options.gamescope.interger', 'Interger Upscale'),
      value: 'integer'
    },
    { name: t('options.gamescope.stretch', 'Stretch image'), value: 'stretch' }
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
      <SettingsCard
        glyph={MonitorCog}
        title={t('settings.section.gamescopeUpscaling', 'Upscaling')}
      >
        <ToggleSwitch
          htmlId="gamescopeUpscaleToggle"
          value={gamescope.enableUpscaling || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableUpscaling: !gamescope.enableUpscaling
            })
          }
          title={t('setting.gamescope.enableUpscaling', 'Enables upscaling')}
          description={t(
            'setting.gamescope.enableUpscaling-description',
            'Scale the game below native resolution and upscale it'
          )}
        />
        {gamescope.enableUpscaling && (
          <>
            <SelectField
              label={t('options.gamescope.upscaleMethod', 'Upscale method')}
              htmlId="upscaleMethod"
              info={t(
                'help.gamescope.upscaleMethod',
                'The upscaling method gamescope should use.'
              )}
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
            <div className="rowWithAction">
              <div className="row">
                <TextInputField
                  label={t('options.gamescope.gameWidth', 'Game width')}
                  htmlId="gameWidth"
                  placeholder=""
                  maxLength={4}
                  value={gamescope.gameWidth}
                  info={t(
                    'help.gamescope.gameWidth',
                    'The width resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                  onChange={(newValue) => {
                    setGamescope({
                      ...gamescope,
                      gameWidth: setResolution(newValue) ?? gamescope.gameWidth
                    })
                  }}
                />
                <TextInputField
                  label={t('options.gamescope.gameHeight', 'Game height')}
                  htmlId="gameHeight"
                  placeholder=""
                  maxLength={4}
                  value={gamescope.gameHeight}
                  info={t(
                    'help.gamescope.gameHeight',
                    'The height resolution used by the game. A 16:9 aspect ratio is assumed by gamescope.'
                  )}
                  onChange={(newValue) => {
                    setGamescope({
                      ...gamescope,
                      gameHeight:
                        setResolution(newValue) ?? gamescope.gameHeight
                    })
                  }}
                />
              </div>
              <div className="presetChips">
                {GAME_RESOLUTION_PRESETS.map((preset) => (
                  <Chip
                    key={preset.label}
                    active={
                      gamescope.gameWidth === String(preset.width) &&
                      gamescope.gameHeight === String(preset.height)
                    }
                    onClick={() =>
                      setGameResolution(preset.width, preset.height)
                    }
                  >
                    {preset.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="rowWithAction">
              <div className="row">
                <TextInputField
                  label={t('options.gamescope.upscaleWidth', 'Upscale width')}
                  htmlId="upscaleWidth"
                  placeholder=""
                  maxLength={4}
                  value={gamescope.upscaleWidth}
                  info={t(
                    'help.gamescope.upscaleWidth',
                    'The width resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                  onChange={(newValue) => {
                    setGamescope({
                      ...gamescope,
                      upscaleWidth:
                        setResolution(newValue) ?? gamescope.upscaleWidth
                    })
                  }}
                />
                <TextInputField
                  label={t('options.gamescope.upscaleHeight', 'Upscale height')}
                  htmlId="upscaleHeight"
                  placeholder=""
                  maxLength={4}
                  value={gamescope.upscaleHeight}
                  info={t(
                    'help.gamescope.upscaleHeight',
                    'The height resolution used by gamescope. A 16:9 aspect ratio is assumed.'
                  )}
                  onChange={(newValue) => {
                    setGamescope({
                      ...gamescope,
                      upscaleHeight:
                        setResolution(newValue) ?? gamescope.upscaleHeight
                    })
                  }}
                />
              </div>
              <div className="presetChips">
                <Chip
                  active={
                    !!monitorResolution &&
                    gamescope.upscaleWidth ===
                      String(monitorResolution.width) &&
                    gamescope.upscaleHeight === String(monitorResolution.height)
                  }
                  title={
                    monitorResolution
                      ? `${monitorResolution.width}x${monitorResolution.height}`
                      : undefined
                  }
                  onClick={() => void detectResolution()}
                >
                  {t('options.gamescope.monitorResolution', 'Monitor')}
                </Chip>
                {UPSCALE_RESOLUTION_PRESETS.map((preset) => (
                  <Chip
                    key={preset.label}
                    active={
                      gamescope.upscaleWidth === String(preset.width) &&
                      gamescope.upscaleHeight === String(preset.height)
                    }
                    onClick={() =>
                      setUpscaleResolution(preset.width, preset.height)
                    }
                  >
                    {preset.label}
                  </Chip>
                ))}
              </div>
            </div>
            <SelectField
              label={t('options.gamescope.windowType', 'Window type')}
              htmlId="windowType"
              info={t(
                'help.gamescope.windowType',
                'How gamescope displays the game window.'
              )}
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
      </SettingsCard>

      <SettingsCard
        glyph={Gauge}
        title={t('settings.section.gamescopeLimiter', 'Frame limiter')}
      >
        <ToggleSwitch
          htmlId="gamescopeLimiterToggle"
          value={gamescope.enableLimiter || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableLimiter: !gamescope.enableLimiter
            })
          }
          title={t('setting.gamescope.enableLimiter', 'Enable FPS limiter')}
          description={t(
            'setting.gamescope.enableLimiter-description',
            'Cap the frame rate through gamescope'
          )}
        />
        {gamescope.enableLimiter && (
          <div className="row">
            <TextInputField
              label={t('options.gamescope.fpsLimiter', 'FPS limiter')}
              htmlId="fpsLimiter"
              placeholder=""
              maxLength={3}
              value={gamescope.fpsLimiter}
              info={t(
                'help.gamescope.fpsLimiter',
                'The frame rate limit gamescope should limit per second.'
              )}
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
                'FPS limiter (no focus)'
              )}
              htmlId="fpsLimiterNoFocus"
              placeholder=""
              maxLength={3}
              value={gamescope.fpsLimiterNoFocus}
              info={t(
                'help.gamescope.fpsLimiterNoFocus',
                'The frame rate limit gamescope should limit per second if the game is not focused.'
              )}
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
      </SettingsCard>

      <SettingsCard
        glyph={SlidersHorizontal}
        title={t('settings.section.gamescopeDisplay', 'Display')}
      >
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
            'Enable force grab cursor'
          )}
          info={t(
            'help.gamescope.forceGrabCursor',
            'Always use relative mouse mode instead of flipping dependent on cursor visibility. (useful for when applications keep losing focus)'
          )}
        />
        <ToggleSwitch
          htmlId="gamescopeHDRToggle"
          value={gamescope.enableHDR || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableHDR: !gamescope.enableHDR
            })
          }
          title={t('setting.gamescope.enableHDR', 'Enable HDR')}
          info={t(
            'help.gamescope.hdr',
            'Ask gamescope to enable HDR output. The display, compositor and game must support HDR.'
          )}
        />
        <ToggleSwitch
          htmlId="gamescopeAdaptiveSyncToggle"
          value={gamescope.enableAdaptiveSync || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              enableAdaptiveSync: !gamescope.enableAdaptiveSync
            })
          }
          title={t(
            'setting.gamescope.enableAdaptiveSync',
            'Enable adaptive sync (VRR)'
          )}
          info={t(
            'help.gamescope.adaptiveSync',
            'Enable variable refresh rate for the game window when supported by the display.'
          )}
        />
      </SettingsCard>

      <SettingsCard
        glyph={TerminalSquare}
        title={t(
          'settings.section.gamescopeAdditionalOptions',
          'Additional options'
        )}
      >
        <TextInputField
          label={t('options.gamescope.additionalOptions', 'Additional options')}
          htmlId="additionalOptions"
          placeholder=""
          value={additionalOptions}
          info={t(
            'help.gamescope.additionalOptions',
            'Additional commandline flags to pass into gamescope.'
          )}
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
        <Alert variant="warning">
          {t(
            'setting.gamescope.additionalOptionsWarning',
            'Options are passed to gamescope as-is. Invalid or unsupported flags can prevent the game from launching.'
          )}{' '}
          <a
            className="underlined"
            href=""
            onClick={(event) => {
              event.preventDefault()
              void window.api.openExternalUrl(GAMESCOPE_DOCS_URL)
            }}
          >
            {t(
              'setting.gamescope.additionalOptionsDocs',
              'Check the gamescope documentation'
            )}
          </a>
        </Alert>
      </SettingsCard>
    </div>
  )
}

export default Gamescope
