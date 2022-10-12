import './index.css'

import React, { useContext } from 'react'

import WinePrefix from './WinePrefix'
import PreferSystemLibs from './PreferSystemLibs'
import EnableFSR from './EnableFSR'
import ResizableBar from './ResizableBar'
import EnableEsync from './EnableEsync'
import EnableFsync from './EnableFsync'
import CrossoverBottle from './CrossoverBottle'
import WineVersionSelector from './WineVersionSelector'
import CustomWineProton from './CustomWineProton'
import ContextProvider from 'frontend/state/ContextProvider'

export default function WineSettings() {
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  return (
    <>
      <h3 className="settingSubheader">{isLinux ? 'Wine' : 'Crossover'}</h3>

      <WinePrefix />

      <CustomWineProton />

      <WineVersionSelector />

      <CrossoverBottle />

      <PreferSystemLibs />

      <EnableFSR />

      <ResizableBar />

      <EnableEsync />

      <EnableFsync />
    </>
  )
}
