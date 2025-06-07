import { addHandler } from '../ipc'
import { Path } from '../schemas'

import LibraryManager from './index'

import type { LibraryInfo } from './types'

addHandler('libraries__getAll', async () => {
  const libraries = LibraryManager.get().getAll()

  const infoRecordEntries = await Promise.all(
    libraries.map(
      async (library): Promise<[string, LibraryInfo | false]> => [
        library.path,
        await library.readInfo()
      ]
    )
  )
  return Object.fromEntries(infoRecordEntries)
})

addHandler('libraries__add', async (e, path, name) =>
  LibraryManager.get()
    .add(Path.parse(path), name)
    .then((ret) => !!ret)
)

addHandler('libraries__rename', async (e, path, newName) =>
  LibraryManager.get().rename(Path.parse(path), newName)
)

addHandler('libraries__delete', async (e, path) =>
  LibraryManager.get().delete(Path.parse(path))
)
