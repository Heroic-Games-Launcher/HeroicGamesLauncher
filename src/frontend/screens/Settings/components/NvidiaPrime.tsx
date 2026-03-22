import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const WIKI_URL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/NVIDIA-Optimus-and-AMD-CrossFire-GPUs'

const NvidiaPrime = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [nvidiaPrime, setNvidiaPrime] = useSetting('nvidiaPrime', false)
  const [numberOfGPUs, setNumberOfGPUs] = useState<number>(0)

  useEffect(() => {
    void window.api.systemInfo
      .get()
      .then((result) => setNumberOfGPUs(result.GPUs.length))
  }, [])

  if (!isLinux || numberOfGPUs < 2) {
    return <></>
  }

  return (
    <div className="toggleWithInfo">
      <ToggleSwitch
        htmlId="nvidiaPrime"
        value={nvidiaPrime}
        handleChange={() => setNvidiaPrime(!nvidiaPrime)}
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
