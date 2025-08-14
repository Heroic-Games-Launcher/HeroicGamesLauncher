import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { useAwaited } from 'frontend/hooks/useAwaited'

const UseDGPU = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const systemInfo = useAwaited(window.api.systemInfo.get)

  const [useDGPU, setUseDGPU] = useSetting('nvidiaPrime', false)

  if (!isLinux || !systemInfo || systemInfo.GPUs.length === 1) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="usedgpu"
        value={useDGPU}
        handleChange={() => setUseDGPU(!useDGPU)}
        title={t(
          'setting.primerun.description',
          'Force-use dedicated graphics card'
        )}
      />

      <InfoIcon
        text={t(
          'help.primerun',
          'Sets PRIME-related environment variables to force the use of your dedicated GPU. Might cause issues with titles using DXVK/VKD3D (most Windows games)'
        )}
      />
    </div>
  )
}

export default UseDGPU
