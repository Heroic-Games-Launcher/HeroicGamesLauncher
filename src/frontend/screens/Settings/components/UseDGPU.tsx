import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const UseDGPU = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [useDGPU, setUseDGPU] = useSetting('nvidiaPrime', false)

  if (!isLinux) {
    return <></>
  }

  async function toggleUseDGPU() {
    if (!useDGPU) {
      const numOfGpus = await window.api.getNumOfGpus()
      if (numOfGpus === 1) {
        showDialogModal({
          title: t(
            'setting.primerun.confirmation.title',
            'Only 1 GPU detected'
          ),
          message: t(
            'setting.primerun.confirmation.message',
            'Only one graphics card was detected in this system. Please note that this option is intended for multi-GPU systems with headless GPUs (like laptops). On single-GPU systems, the GPU is automatically used & enabling this option can cause issues. Do you really want to enable this option?'
          ),
          buttons: [
            { text: t('box.yes'), onClick: () => setUseDGPU(true) },
            { text: t('box.no') }
          ],
          type: 'MESSAGE'
        })
        return
      }
    }
    setUseDGPU(!useDGPU)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="usedgpu"
        value={useDGPU}
        handleChange={toggleUseDGPU}
        title={t('setting.primerun.description', 'Use Dedicated Graphics Card')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.primerun',
          'Use dedicated graphics card to render game on multi-GPU systems. Only needed on gaming laptops or desktops that use a headless GPU for rendering (NVIDIA Optimus, AMD CrossFire)'
        )}
      />
    </div>
  )
}

export default UseDGPU
