import axios from 'axios'
import { Runner } from 'common/types'
import { ulwglStore } from '../electronStore'

interface GameObject {
  title: string
  ulwgl_id: string
}
const storeMapping: { [key in Runner]?: string } = {
  gog: 'gog',
  legendary: 'egs',
  nile: 'amazon'
}

export async function getUlwglId(
  appName: string,
  runner: Runner
): Promise<string | null> {
  const store = storeMapping[runner]
  if (!store) {
    return null
  }
  const key = `${runner}_${appName}`
  const cachedValue = ulwglStore.get(key)
  if (cachedValue) {
    return cachedValue
  }
  const response = await axios
    .get<GameObject[]>('https://ulwgl.openwinecomponents.org/ulwgl_api.php', {
      params: { codename: appName.toLowerCase(), store }
    })
    .catch(() => null)

  if (!response || response.status !== 200) {
    return null
  }
  if (response.data.length === 0) {
    ulwglStore.set(key, null)
    return null
  }
  const ulwglId = response.data[0].ulwgl_id
  ulwglStore.set(key, ulwglId)
  return ulwglId
}
