export const ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn()
};

export const remote = {
  browserWindow: jest.fn(),
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn()
  }
};
