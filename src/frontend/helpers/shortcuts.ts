export const initShortcuts = () => {
  document.addEventListener('keydown', (e) => {
    // Ctrl+F or Cmd+F, focus search bar
    if ((e.ctrlKey || e.metaKey) && e.key.toLocaleLowerCase() === 'f') {
      document.getElementById('search')?.focus()
    }
  })
}
