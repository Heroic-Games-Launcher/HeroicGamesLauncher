import { Rectangle } from 'electron/common';

export abstract class IBrowserViewWrapper {
    abstract readonly initialURL: string
    abstract readonly canGoBack: boolean
    abstract readonly canGoForward: boolean
    abstract goBack(): void
    abstract goForward(): void
    abstract reload(): void
    abstract readonly isLoading: boolean
    // Always reflects the BrowserView's current URL, not the initial URL
    // Setting it to a different value will redirect the BrowserView there
    abstract URL: string
    // Getting this property will get the current bounds of the webview
    // Setting it will set new bounds for the BrowserView
    abstract bounds: Rectangle
}
