export const ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn()
};

export const remote = {
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn()
  }
};
