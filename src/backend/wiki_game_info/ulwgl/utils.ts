import axios from 'axios'
import { Runner } from 'common/types'

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
  const response = await axios.get<GameObject[]>(
    'https://ulwgl.openwinecomponents.org/ulwgl_api.php',
    { params: { codename: appName.toLowerCase(), store } }
  )
  if (response.data.length === 0) {
    return null
  }
  return response.data[0].ulwgl_id
}
