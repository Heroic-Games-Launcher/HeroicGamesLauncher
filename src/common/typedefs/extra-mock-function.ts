/* eslint-disable @typescript-eslint/no-namespace */
import type { PartialDeep } from 'type-fest'

// FIXME: This file is required because we add functionality to some objects
//        with Jest mocks. Ideally tests using these functions would do
//        their tasks using regular functions defined in the module they're
//        using. Mocks are intended to make existing functionality work inside
//        test, they're not supposed to add new functionality

declare global {
  namespace Electron {
    interface BrowserWindow {
      /** NOTE: Test-only property, not present normally */
      options: Electron.BrowserWindowConstructorOptions
    }

    namespace BrowserWindow {
      /** NOTE: Test-only function, not present normally */
      function setAllWindows(windows: PartialDeep<BrowserWindow>[]): void
    }

    interface Tray {
      /** NOTE: Test-only function, not present normally */
      menu: Electron.MenuItemConstructorOptions[]
    }
  }
}

declare module 'backend/config' {
  namespace GlobalConfig {
    /** NOTE: Test-only function, not present normally */
    const setConfigValue: (key: string, value: unknown) => void
  }
}

export {}
