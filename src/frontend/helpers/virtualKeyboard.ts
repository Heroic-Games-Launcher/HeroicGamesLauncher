import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

let virtualKeyboard: Keyboard | null = null

function currentElement() {
  return document.querySelector<HTMLElement>(':focus')
}

function searchInput() {
  // only change this if you change the id of the input element
  // in frontend/components/UI/SearchBar/index.tsx
  return document.querySelector<HTMLInputElement>('#search')
}

function focusKeyboard() {
  const firstButton = document.querySelector<HTMLElement>(
    '.hg-button[data-skbtn="h"]'
  )
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
  } else if (button === '{space}') {
    input.value = input.value + ' '
  }
  input.dispatchEvent(new Event('input'))
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
    const el = currentElement()
    if (!el) return false

    return el.classList.contains('hg-button')
  },
  isActive: () => virtualKeyboard !== null,
  destroy: () => {
    if (virtualKeyboard) virtualKeyboard.destroy()
    virtualKeyboard = null
    searchInput()?.focus()
  },
  backspace: () => {
    typeInSearchInput('{bksp}')
  },
  space: () => {
    typeInSearchInput(' ')
  }
}
