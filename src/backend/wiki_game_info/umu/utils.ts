import axios from 'axios'
import { Runner } from 'common/types'
import { umuStore } from '../electronStore'
import { runnerMap } from 'backend/runners'

interface GameObject {
  title: string
  umu_id: string
}

export async function getUmuId(
  appName: string,
  runner: Runner
): Promise<string | null> {
  if (!runnerMap[runner]?.umu.isSupported) {
    return null
  }

  const store = runnerMap[runner].umu.storeName
  const key = `${runner}_${appName}`
  const cachedValue = umuStore.get(key)
  if (cachedValue) {
    return cachedValue
  }
  const response = await axios
    .get<GameObject[]>('https://umu.openwinecomponents.org/umu_api.php', {
      params: { codename: appName.toLowerCase(), store }
    })
    .catch(() => null)

  if (!response || response.status !== 200) {
    return null
  }
  if (response.data.length === 0) {
    umuStore.set(key, null)
    return null
  }
  const umuId = response.data[0].umu_id
  umuStore.set(key, umuId)
  return umuId
}
