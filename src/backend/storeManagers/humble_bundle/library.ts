import { HumbleBundleUser } from './user'

async function loadGamesInAccount() {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return
  }

  console.log('refetching games humble')
}

export async function refresh(): Promise<void> {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return
  }
  loadGamesInAccount()
}
