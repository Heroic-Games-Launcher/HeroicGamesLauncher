import React, { ChangeEvent, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SelectField,
  TextInputField,
  ToggleSwitch
} from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const Gamescope = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [gamescope, setGamescope] = useSetting('gamescope', {
    enabled: false,
    integerScaling: false,
    windowType: 'fullscreen',
    gameWidth: '',
    gameHeight: '',
    upscaleHeight: '',
    upscaleWidth: '',
    fpsLimiter: '',
    fpsLimiterNoFocus: ''
  })

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

  return (
    <div>
      {/* Enable*/}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeToggle"
          value={gamescope.enabled || false}
          handleChange={() =>
            setGamescope({ ...gamescope, enabled: !gamescope.enabled })
          }
          title={t('setting.gamescope.enable', 'Enable')}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t('help.gamescope.enable', 'Enable Gamescope')}
        />
      </div>
      {/* Integer Scaling*/}
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="gamescopeIntToggle"
          disabled={!gamescope.enabled}
          value={gamescope.integerScaling || false}
          handleChange={() =>
            setGamescope({
              ...gamescope,
              integerScaling: !gamescope.integerScaling
            })
          }
          title={t('setting.gamescope.integerScaling', 'Use integer scaling')}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t('help.gamescope.integerScaling', 'Use integer scaling')}
        />
      </div>
      {/* Window Type*/}
      <SelectField
        disabled={!gamescope.enabled}
        label={'Window Type'}
        htmlId="windowType"
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          setGamescope({ ...gamescope, windowType: event.currentTarget.value })
        }
        value={gamescope.windowType}
      >
        {['fullscreen', 'borderless'].map((opt, i) => (
          <option key={i}>{opt}</option>
        ))}
      </SelectField>
      {/* Game Res*/}
      <div className="toggleRow">
        <TextInputField
          disabled={!gamescope.enabled}
          label={t('options.gamescope.gameWidth', 'Game Width')}
          htmlId="gameWidth"
          placeholder=""
          maxLength={4}
          value={gamescope.gameWidth}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              gameWidth:
                setResolution(event.currentTarget.value) ?? gamescope.gameWidth
            })
          }}
        />
        <div style={{ marginRight: 10 }}></div>

        <TextInputField
          disabled={!gamescope.enabled}
          label={t('options.gamescope.gameHeight', 'Game Height')}
          htmlId="gameHeight"
          placeholder=""
          maxLength={4}
          value={gamescope.gameHeight}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              gameHeight:
                setResolution(event.currentTarget.value) ?? gamescope.gameHeight
            })
          }}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t(
            'help.gamescope.gameResolution',
            'The native resolution the game can run on. E.g. your monitor pixel width and height.'
          )}
        />
      </div>
      {/* Upscale Res*/}
      <div className="toggleRow">
        <TextInputField
          disabled={!gamescope.enabled}
          label={t('options.gamescope.upscaleWidth', 'Upscale Width')}
          htmlId="upscaleWidth"
          placeholder=""
          maxLength={4}
          value={gamescope.upscaleWidth}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              upscaleWidth:
                setResolution(event.currentTarget.value) ??
                gamescope.upscaleWidth
            })
          }}
        />
        <div style={{ marginRight: 10 }}></div>

        <TextInputField
          disabled={!gamescope.enabled}
          label={t('options.gamescope.upscaleHeight', 'Upscale Height')}
          htmlId="upscaleHeight"
          placeholder=""
          maxLength={4}
          value={gamescope.upscaleHeight}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              upscaleHeight:
                setResolution(event.currentTarget.value) ??
                gamescope.upscaleHeight
            })
          }}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t(
            'help.gamescope.upscaleResolution',
            'The resolution gamescope should upscale to.'
          )}
        />
      </div>
      {/* FPS Limiters*/}
      <div className="toggleRow">
        <TextInputField
          disabled={!gamescope.enabled}
          label={t('options.gamescope.fpsLimiter', 'FPS Limiter')}
          htmlId="fpsLimiter"
          placeholder=""
          maxLength={3}
          value={gamescope.fpsLimiter}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              fpsLimiter:
                setResolution(event.currentTarget.value) ?? gamescope.fpsLimiter
            })
          }}
        />
        <div style={{ marginRight: 10 }}></div>

        <TextInputField
          disabled={!gamescope.enabled}
          label={t(
            'options.gamescope.fpsLimiterNoFocus',
            'FPS Limiter (No Focus)'
          )}
          htmlId="fpsLimiterNoFocus"
          placeholder=""
          maxLength={3}
          value={gamescope.fpsLimiterNoFocus}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setGamescope({
              ...gamescope,
              fpsLimiterNoFocus:
                setResolution(event.currentTarget.value) ??
                gamescope.fpsLimiterNoFocus
            })
          }}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t(
            'help.gamescope.fpsLimiter',
            'The amount of frames gamescope should limit to. E.g. 60'
          )}
        />
      </div>
    </div>
  )
}

export default Gamescope
