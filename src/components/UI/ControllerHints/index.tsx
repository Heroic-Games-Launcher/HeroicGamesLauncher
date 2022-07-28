import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import './index.css'

export default function ControllerHints() {
  const [controller, setController] = useState('')
  const [layout, setLayout] = useState('xbox')
  const [mainActionHint, setMainActionHint] = useState('')
  const [altActionHint, setAltActionHint] = useState('') // context menu
  const [altActionHint2, setAltActionHint2] = useState('') // secondary action
  const [backActionHint, setBackActionHint] = useState('')
  const [backActionFallback, setBackActionFallback] = useState('')

  const location = useLocation()

  // set hints for an element
  const setHintsFor = (target: HTMLElement) => {
    const classes = target.classList

    let main = 'Activate'
    let alt = ''
    let alt2 = ''
    let back = ''

    if (target.closest('.gameCard')) {
      // focusing a card or an icon inside card
      alt = 'Context menu'
      if (classes.contains('updateIcon')) {
        main = 'Update game'
      } else if (classes.contains('settingsIcon')) {
        main = 'Game settings'
      } else if (classes.contains('playIcon')) {
        main = 'Play game'
      } else if (classes.contains('downIcon')) {
        main = 'Install game'
      } else {
        alt2 = 'Game details'
        main = 'Play game'
      }
    } else if (target.id === 'search') {
      // focusing the search bar
      main = 'Open virtual keyboard'
    } else if (target.closest('.MuiMenu-list')) {
      // focusing a context menu on a card
      main = 'Activate'
      alt = 'Close context menu'
    } else if (classes.contains('hg-button')) {
      // focusing a virtual keyboard element
      main = 'Activate'
      back = 'Close keyboard'
      alt = 'Activate'
      alt2 = 'Backspace'
    }

    setMainActionHint(main)
    setAltActionHint(alt)
    setAltActionHint2(alt2)
    setBackActionHint(back)
  }

  // proxy method to set hints depending on what's focused
  const setHints = (target: HTMLElement | null | typeof globalThis) => {
    // sometimes focus can be null or the window object
    if (!target || target === globalThis) {
      setMainActionHint('')
      setAltActionHint('')
      setAltActionHint2('')
      setBackActionHint('')
      return
    }

    setHintsFor(target as HTMLElement)
  }

  // listen to `controller-changed` custom events to set the controller brand
  // listen to `focus` events to detect the current focused element
  useEffect(() => {
    const onControllerChanged = (e: CustomEvent<{ controllerId: string }>) => {
      setController(e.detail.controllerId)
    }
    window.addEventListener('controller-changed', onControllerChanged)

    const onFocusChanged = (e: FocusEvent) => {
      const tgt = !e.target ? null : (e.target as HTMLElement)
      setHints(tgt)
    }

    window.addEventListener('focus', onFocusChanged, true)

    return () => {
      window.removeEventListener('controller-changed', onControllerChanged)
      window.removeEventListener('focus', onFocusChanged)
    }
  }, [])

  useEffect(() => {
    // check if there's any page to go back
    if (history.state.idx === 0) {
      setBackActionFallback('')
    } else {
      setBackActionFallback('Back')
    }

    // check focused element after a page change
    setHints(document.querySelector(':focus') as HTMLElement)
  }, [location])

  useEffect(() => {
    // set the brand for the images to use
    if (controller.match(/sony|0ce6|PS3|PLAYSTATION|0268|'2563.*0523/i)) {
      setLayout('ps')
    } else {
      setLayout('xbox')
    }
  }, [controller])

  // empty if no controller activated
  if (controller === '') {
    return <></>
  }

  return (
    <div className={`controller-hints ${layout}`}>
      <div className="hint">
        <i className="buttonImage main-action" />
        {mainActionHint || 'None'}
      </div>
      <div className="hint">
        <i className="buttonImage back" />
        {backActionHint || backActionFallback || 'None'}
      </div>
      <div className="hint">
        <i className="buttonImage alt-action" />
        {altActionHint || 'None'}
      </div>
      <div className="hint">
        <i className="buttonImage alt-action2" />
        {altActionHint2 || 'None'}
      </div>
      <div className="hint">
        <i className="buttonImage d-pad" />
        <i className="buttonImage left-stick" />
        Move cursor
      </div>
      <div className="hint">
        <i className="buttonImage right-stick" />
        Scroll
      </div>
      <span>{controller}</span>
    </div>
  )
}
