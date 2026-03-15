import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const WIKI_URL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/NVIDIA-Optimus-and-AMD-CrossFire-GPUs'

const NvidiaPrime = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [nvidiaPrime, setNvidiaPrime] = useSetting('nvidiaPrime', false)

  if (!isLinux) {
    return <></>
  }

  async function toggleNvidiaPrime() {
    if (!nvidiaPrime) {
      const { GPUs } = await window.api.systemInfo.get()
      if (GPUs.length === 1) {
        showDialogModal({
          title: t(
            'setting.nvidiaprime.confirmation.title',
            'Only 1 GPU detected'
          ),
          message: t(
            'setting.nvidiaprime.confirmation.message',
            'Only one graphics card was detected in this system. Please note that this option is intended for multi-GPU systems with headless GPUs (like laptops). On single-GPU systems, the GPU is automatically used & enabling this option can cause issues. Do you really want to enable this option?'
          ),
          buttons: [
            { text: t('box.yes'), onClick: () => setNvidiaPrime(true) },
            { text: t('box.no') }
          ],
          type: 'MESSAGE'
        })
        return
      }
    }
    setNvidiaPrime(!nvidiaPrime)
  }

  return (
    <div className="toggleWithInfo">
      <ToggleSwitch
        htmlId="nvidiaPrime"
        value={nvidiaPrime}
        handleChange={toggleNvidiaPrime}
        title={t(
          'setting.nvidiaprime.description',
          'Force use of NVIDIA Optimus or AMD CrossFire dGPU. ONLY use this for OpenGL games.'
        )}
      />

      <InfoBox text={t('infobox.help')}>
        {t(
          'help.nvidiaprime.details',
          'Use dedicated graphics card to render game on multi-GPU systems. Only needed on gaming laptops or desktops that use a headless GPU for rendering (NVIDIA Optimus, AMD CrossFire)'
        )}

        <br />
        <br />
        <a
          className="underlined"
          href=""
          onClick={(event) => {
            event.preventDefault()
            window.api.openExternalUrl(WIKI_URL)
          }}
        >
          {t(
            'help.nvidiaprime.link',
            'Check the list of GPUs and more information in our wiki'
          )}
        </a>
      </InfoBox>
    </div>
  )
}

export default NvidiaPrime
