import React from 'react'
import WebviewControls from 'src/components/UI/WebviewControls'
import { Webview } from 'src/types'

export default function Wiki() {
  const webview = document.querySelector('webview') as Webview
  const wikiURL = 'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
  return (
    <div>
      <WebviewControls webview={webview} initURL={wikiURL} />
      <webview id="foo" src={wikiURL} style={{width:'100vw', height:'100vh'}}></webview>
    </div>
  )
}