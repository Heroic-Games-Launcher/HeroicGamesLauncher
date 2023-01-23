const dialog = jest.requireActual('../dialog')

dialog.showDialogBoxModalAuto = jest.fn()
dialog.notify = jest.fn()

module.exports = dialog
export {}
