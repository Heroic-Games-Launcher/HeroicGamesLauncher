// Handle back/forward mouse clicks inside webview
// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
document.addEventListener('mouseup', (ev) => {
  switch (ev.button) {
    case 3:
      if (history.length > 1) {
        history.back()
        ev.preventDefault()
      }
      break
    case 4:
      history.forward()
      ev.preventDefault()
      break
  }
})
