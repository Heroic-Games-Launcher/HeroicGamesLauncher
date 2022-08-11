import { tmpdir } from 'os'

export const dialog = {
  showErrorBox: jest.fn(),
  showMessageBox: jest.fn()
}

export const app = {
  getPath: jest.fn().mockReturnValue(tmpdir())
}

export class Notification {
  public show() {
    return
  }
}
