import { join } from 'path'

import { userDataPath } from 'backend/constants/paths'

const sideloadStorePath = join(userDataPath, 'sideload_apps')
export const sideloadLibraryPath = join(sideloadStorePath, 'library.json')
