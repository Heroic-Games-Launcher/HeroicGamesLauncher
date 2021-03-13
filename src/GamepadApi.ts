/**
 * Support for Gamepad navigation
 * Documentation for gamepadApi https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
 * Documentation for gamepad mapping https://w3c.github.io/gamepad/#remapping
 */

export interface GamepadApiInterface {
  turbo: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controller: any
  connect: () => void
  update: () => void
  buttons: string[]
  buttonsCache: string[]
  buttonsStatus: string[]
  axesStatus: number[]
  connected: boolean
  timestamp: number
}

const GamepadApi: GamepadApiInterface = {
  turbo: false,
  controller: {},
  connect,
  update,
  buttons: [],
  buttonsCache: [],
  buttonsStatus: [],
  axesStatus: [],
  connected: false,
  timestamp: performance.now(),
}

let num = 0
const fps = 60 // less FPS = more speed for navigation with axes and D-Pad   /!\ Don't go faster than light /!\
function connect() {
  GamepadApi.controller = navigator.getGamepads()[0]
  update()
  requestAnimationFrame(connect)
}
let interval = 0
function update() {
  const c = GamepadApi.controller
  const compareTime = c.timestamp !== GamepadApi.timestamp // used to compare timestamp and avoid 60+ functions calls per seconds

  // clear the buttons cache
  GamepadApi.buttonsCache = []
  // move the buttons status from the previous frame to the cache
  for (let k = 0; k < GamepadApi.buttonsStatus.length; k++) {
    GamepadApi.buttonsCache[k] = GamepadApi.buttonsStatus[k]
  }
  // clear the buttons status
  GamepadApi.buttonsStatus = []

  // loop through buttons and push the pressed ones to the array
  const pressed = []
  if (c.buttons) {
    for (let b = 0, t = c.buttons.length; b < t; b++) {
      if (c.buttons[b].pressed) {
        const ev = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
        // Bottom button in right cluster => Launch Game in library and Gamepage
        if (c.buttons[0].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          const selection = document.querySelector('[tabindex="0"]')
          const playBtn = document.querySelector<HTMLElement>('.is-success')
          playBtn
            ? (playBtn.dispatchEvent(ev), (GamepadApi.connected = false))
            : null
          if (selection) {
            selection
              .querySelector('.gameTitle > span > svg')
              ?.dispatchEvent(ev)
          }
        }
        // Left button in right cluster => gamepage
        if (c.buttons[2].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          const selection = document.querySelector('[tabindex="0"]')

          selection ? selection.children[0].dispatchEvent(ev) : null
        }
        //	Right button in right cluster => return to library
        if (c.buttons[1].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          document.querySelector('.returnLink')?.dispatchEvent(ev)
        }
        //Top button in right cluster => Change layout
        if (c.buttons[3].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          const switchBtn = document.querySelector(
            '.layoutSelection > .MuiSvgIcon-root:not(.selectedLayout) '
          )
          switchBtn ? (switchBtn.dispatchEvent(ev), (num = 0)) : null
        }
        //Top left front button => change filter
        if (c.buttons[4].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          filternavigation('left')
        }
        //	Top right front button => change filter
        if (c.buttons[5].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          filternavigation('right')
        }
        //	Left button in center cluster => select search input
        if (c.buttons[8].pressed && compareTime) {
          GamepadApi.timestamp = c.timestamp
          document.querySelector('[for="search"]')?.dispatchEvent(ev)
        }
        // D-pad Up
        if (c.buttons[12].pressed && compareTime) {
          if (++interval % fps == 0) focusElm('up')
        }
        //D-pad Down
        if (c.buttons[13].pressed && compareTime) {
          if (++interval % fps == 0) focusElm('down')
        }
        //D-pad left
        if (c.buttons[14].pressed && compareTime) {
          if (++interval % fps == 0) focusElm('left')
        }
        //Dpad Right
        if (c.buttons[15].pressed && compareTime) {
          if (++interval % fps == 0) focusElm('right')
        }
        pressed.push(c.buttons[b])
      }
    }
  }
  // loop through axes and push their values to the array
  const axes = []
  GamepadApi.axesStatus = []
  if (c.axes) {
    for (let a = 0, x = c.axes.length; a < x; a++) {
      axes.push(+c.axes[a].toFixed(2))
    }
  }
  // assign received values
  GamepadApi.axesStatus = axes
  GamepadApi.buttonsStatus = pressed

  // 	Horizontal axis for left stick (Right pos)
  if (axes[0] === 1) {
    if (++interval % fps == 0) focusElm('right')
  }
  // 	Horizontal axis for left stick (Left pos)
  if (axes[0] === -1) {
    if (++interval % fps == 0) focusElm('left')
  }
  // Vertical axis for left stick (Up pos)
  if (axes[1] === -1) {
    if (++interval % fps == 0) focusElm('up')
  }
  // Vertical axis for left stick (Down pos)
  if (axes[1] === 1 && compareTime) {
    if (++interval % fps == 0) focusElm('down')
  }
  // Vertical axis for right stick (Down pos)
  if (axes[3] === 1) {
    window.scroll({
      top: window.pageYOffset + 5,
      left: 0,
      behavior: 'auto',
    })
  }
  // Vertical axis for right stick (Up pos)
  if (axes[3] === -1) {
    window.scroll({
      top: window.pageYOffset - 5,
      left: 0,
      behavior: 'auto',
    })
  }
}

const focusElm = (thumbStickAxe: string) => {
  const elem = document.querySelectorAll<HTMLElement>(
    '.gameCard, .gameListItem'
  )
  const grid = document.querySelector('.gameList')
  let gridColumnCount = 1
  if (elem) {
    if (grid) {
      const gridComputedStyle = window.getComputedStyle(grid)
      gridColumnCount = gridComputedStyle
        .getPropertyValue('grid-template-columns')
        .split(' ').length
    }

    const gameCard = Array.from(elem).some((e) => e.className === 'gameCard')
    switch (thumbStickAxe) {
      case 'up':
        gameCard && grid
          ? num - gridColumnCount < 0
            ? (num = elem.length - 1)
            : (num -= gridColumnCount)
          : num - 1 < 0
          ? (num = elem.length - 1)
          : (num -= 1)
        break
      case 'down':
        gameCard && grid
          ? num + gridColumnCount > elem.length - 1
            ? (num = 0)
            : (num += gridColumnCount)
          : num + 1 > elem.length - 1
          ? (num = 0)
          : (num += 1)
        break
      case 'left':
        gameCard ? (num === 0 ? (num = elem.length - 1) : (num -= 1)) : null
        break
      case 'right':
        gameCard ? (num === elem.length - 1 ? (num = 0) : (num += 1)) : null
        break
      default:
        break
    }
    for (let i = 0; i < elem.length; i++) {
      elem[i].tabIndex = -1
      elem[num].tabIndex = 0
      elem[num].focus()
    }
  }
}

let filterNum = 0
const filternavigation = (bump: string) => {
  const elem = document.querySelectorAll(
    '.selectFilter > span:not(.filter-title) '
  )
  const ev = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  })

  switch (bump) {
    case 'right':
      filterNum + 1 > elem.length - 1 ? (filterNum = 0) : (filterNum += 1)
      break
    case 'left':
      filterNum - 1 < 0 ? (filterNum = elem.length - 1) : (filterNum -= 1)
      break
    default:
      break
  }
  for (let i = 0; i < elem.length; i++) {
    elem[filterNum].dispatchEvent(ev)
  }
}

export default GamepadApi
