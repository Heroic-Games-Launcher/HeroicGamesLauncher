import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

let virtualKeyboard: Keyboard | null = null
let targetInput: HTMLInputElement | null = null

function currentElement<T extends HTMLElement>() {
  return document.querySelector<T>(':focus')
}

function focusKeyboard() {
  const firstButton = document.querySelector<HTMLElement>(
    '.hg-button[data-skbtn="h"]'
  )
  firstButton?.focus()
}

function typeInInput(button: string) {
  if (!targetInput) return

  if (button.length === 1) {
    targetInput.value = targetInput.value + button
  } else if (button === '{bksp}') {
    if (targetInput.value.length > 0) {
      targetInput.value = targetInput.value.slice(0, -1)
    }
  } else if (button === '{space}') {
    targetInput.value = targetInput.value + ' '
  }
  targetInput.dispatchEvent(new Event('input'))
}

function makeKeyboardTopLayer() {
  const wrapper = document.querySelector<HTMLDialogElement>(
    '.simple-keyboard-wrapper'
  )
  wrapper?.showModal()
}

function closeKeyboardTopLayer() {
  const wrapper = document.querySelector<HTMLDialogElement>(
    '.simple-keyboard-wrapper'
  )
  wrapper?.close()
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
      focusKeyboard()
    }
  },
  isButtonFocused: () => {
    const el = currentElement()
    if (!el) return false

    return el.classList.contains('hg-button')
  },
  isActive: () => virtualKeyboard !== null,
  destroy: () => {
    if (virtualKeyboard) virtualKeyboard.destroy()
    closeKeyboardTopLayer()
    virtualKeyboard = null
    targetInput?.focus()
  },
  backspace: () => {
    typeInInput('{bksp}')
  },
  space: () => {
    typeInInput(' ')
  }
}
