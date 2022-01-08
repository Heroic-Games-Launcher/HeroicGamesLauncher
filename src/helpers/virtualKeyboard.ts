import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

let virtualKeyboard: Keyboard | null = null

function currentElement() {
  return document.querySelector(':focus') as HTMLElement
}

function searchInput() {
  return document.querySelector('.searchInput') as HTMLInputElement
}

function focusKeyboard() {
  const firstButton = document.querySelector(
    '.hg-button[data-skbtn="h"]'
  ) as HTMLElement
  firstButton?.focus()
}

function typeInSearchInput(button: string) {
  const input = searchInput()
  if (!input) return

  if (button.length === 1) {
    input.value = input.value + button
  } else if (button === '{bksp}') {
    if (input.value.length > 0) {
      input.value = input.value.slice(0, -1)
    }
  }
  input.dispatchEvent(new Event('change'))
}

export const VirtualKeyboardController = {
  initOrFocus: () => {
    if (!virtualKeyboard) {
      virtualKeyboard = new Keyboard({
        onKeyPress: (button: string) => typeInSearchInput(button),
        onRender: () => focusKeyboard()
      })
    } else {
      focusKeyboard()
    }
  },
  isButtonFocused: () => {
    return currentElement().classList.contains('hg-button')
  },
  isActive: () => virtualKeyboard !== null,
  destroy: () => {
    if (virtualKeyboard) virtualKeyboard.destroy()
    virtualKeyboard = null
    searchInput()?.focus()
  },
  backspace: () => {
    typeInSearchInput('{bksp}')
  }
}
