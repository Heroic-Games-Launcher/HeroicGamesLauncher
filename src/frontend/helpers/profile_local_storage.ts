// Wrapper around the window's localStorage to prefix the profile name to all keys
export class ProfileLocalStorage {
  private profileSuffix

  public constructor(profile: string) {
    this.profileSuffix = profile === 'default' ? '' : `${profile}-`
  }

  public removeItem(key: string) {
    return window.localStorage.removeItem(`${this.profileSuffix}${key}`)
  }

  public getItem(key: string) {
    return window.localStorage.getItem(`${this.profileSuffix}${key}`)
  }

  public setItem(key: string, value: string) {
    window.localStorage.setItem(`${this.profileSuffix}${key}`, value)
  }
}
