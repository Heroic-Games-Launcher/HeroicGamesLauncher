import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

let virtualKeyboard: Keyboard | null = null
let targetInput: HTMLInputElement | null = null
let shiftActive = false
let capsActive = false

function currentElement<T extends HTMLElement>() {
  return document.querySelector<T>(':focus')
}

function keyboardWrapper() {
  return document.querySelector<HTMLDialogElement>('.simple-keyboard-wrapper')
}

function updateModifierIndicators() {
  document
    .querySelectorAll<HTMLElement>('.hg-button[data-skbtn="{shift}"]')
    .forEach((el) => el.classList.toggle('hg-shift-active', shiftActive))
  document
    .querySelector<HTMLElement>('.hg-button[data-skbtn="{lock}"]')
    ?.classList.toggle('hg-shift-active', capsActive)
}

function focusKeyboard() {
  const firstButton = document.querySelector<HTMLElement>(
    '.hg-button[data-skbtn="h"]'
  )
  firstButton?.focus()
}

function applyModifiers(char: string) {
  if (!/[a-z]/i.test(char)) return char
  const upper = shiftActive !== capsActive
  return upper ? char.toUpperCase() : char.toLowerCase()
}

function typeInInput(button: string) {
  if (!targetInput) return

  if (button.length === 1) {
    targetInput.value = targetInput.value + applyModifiers(button)
    if (shiftActive) {
      shiftActive = false
      updateModifierIndicators()
    }
  } else if (button === '{bksp}') {
    if (targetInput.value.length > 0) {
      targetInput.value = targetInput.value.slice(0, -1)
    }
  } else if (button === '{space}') {
    targetInput.value = targetInput.value + ' '
  } else if (button === '{enter}') {
    // let the focused field's own handler decide what "submit" means
    // (e.g. selecting a settings search result)
    targetInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      })
    )
  } else if (button === '{shift}') {
    shiftActive = !shiftActive
    updateModifierIndicators()
    return
  } else if (button === '{lock}') {
    capsActive = !capsActive
    updateModifierIndicators()
    return
  }
  targetInput.dispatchEvent(new Event('input'))
}

function makeKeyboardTopLayer() {
  const wrapper = keyboardWrapper()
  if (!wrapper || wrapper.open) return
  wrapper.showModal()
}

function closeKeyboardTopLayer() {
  const wrapper = keyboardWrapper()
  if (!wrapper?.open) return
  wrapper.close()
}

export const VirtualKeyboardController = {
  initOrFocus: () => {
    const el = currentElement<HTMLInputElement>()
    if (!el) return

    targetInput = el

    if (!virtualKeyboard) {
      virtualKeyboard = new Keyboard({
        onKeyPress: (button: string) => typeInInput(button),
        onRender: () => focusKeyboard()
      })
      makeKeyboardTopLayer()
    } else {
      // the native <dialog> can be closed with Esc without going through
      // `destroy()`, so reopen it instead of leaving the pad without a keyboard
      makeKeyboardTopLayer()
      focusKeyboard()
    }
  },
  isButtonFocused: () => {
    const el = currentElement()
    if (!el) return false

    return el.classList.contains('hg-button')
  },
  isActive: () => virtualKeyboard !== null && !!keyboardWrapper()?.open,
  destroy: () => {
    if (virtualKeyboard) virtualKeyboard.destroy()
    closeKeyboardTopLayer()
    virtualKeyboard = null
    shiftActive = false
    capsActive = false
    targetInput?.focus()
  },
  backspace: () => {
    typeInInput('{bksp}')
  },
  space: () => {
    typeInInput(' ')
  },
  typeCharacter: (char: string) => {
    typeInInput(char)
  }
}
