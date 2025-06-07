import { join } from 'path'

import Library from './library'

import { TypeCheckedStoreBackend } from '../electron_store'
import { userHome } from '../constants/paths'
import { Path } from '../schemas'
import { sendFrontendMessage } from '../ipc'

export default class LibraryManager {
  static #instance: LibraryManager
  #librariesStore: TypeCheckedStoreBackend<'librariesStore'>
  #libraryMap: Map<Path, Library> = new Map()

  public static get() {
    this.#instance ??= new LibraryManager()
    return this.#instance
  }

  public async init() {
    return Promise.all(
      this.#libraryMap.values().map((library) => library.ensureInfo())
    )
  }

  constructor() {
    this.#librariesStore = new TypeCheckedStoreBackend('librariesStore', {
      cwd: 'store',
      name: 'libraries'
    })

    for (const path of LibraryManager.getDefaultLibraryPaths())
      this.#libraryMap.set(path, new Library(path, false))

    for (const path of this.#librariesStore.get('libraryPaths', []))
      this.#libraryMap.set(path, new Library(path, true))
  }

  public getAll(): Library[] {
    return [...this.#libraryMap.values()]
  }

  public async add(pathToAdd: Path, name?: string): Promise<Library | false> {
    if (this.#libraryMap.has(pathToAdd)) return false

    const newLibrary = new Library(pathToAdd, true)
    await newLibrary.ensureInfo()

    if (name) await newLibrary.setName(name)

    this.#librariesStore.set('libraryPaths', [
      ...this.#librariesStore.get('libraryPaths', []),
      pathToAdd
    ])

    this.#libraryMap.set(pathToAdd, newLibrary)
    sendFrontendMessage('pushLibrary', [pathToAdd, await newLibrary.readInfo()])

    return newLibrary
  }

  public async rename(path: Path, newName: string): Promise<boolean> {
    const library = this.#libraryMap.get(path)
    if (!library) return false

    const success = await library.setName(newName)
    if (!success) return false

    sendFrontendMessage('pushLibrary', [path, await library.readInfo()])

    return true
  }

  public async delete(path: Path): Promise<boolean> {
    const libraryToDelete = this.#libraryMap.get(path)
    if (!libraryToDelete) return false
    if (!libraryToDelete.removable) return false

    const info = await libraryToDelete.readInfo()

    // Refuse to delete a library containing games
    if (info && info.games.length) return false

    const currentLibraries = this.#librariesStore.get('libraryPaths', [])
    const hasLibrary = currentLibraries.includes(path)
    if (!hasLibrary) return false

    this.#librariesStore.set(
      'libraryPaths',
      currentLibraries.filter((p) => p !== path)
    )
    this.#libraryMap.delete(path)

    sendFrontendMessage('removeLibrary', path)

    return true
  }

  private static getDefaultLibraryPaths(): Path[] {
    const defaultPaths: Path[] = []

    defaultPaths.push(Path.parse(join(userHome, 'Games', 'Heroic')))

    // TODO: Perhaps auto-add libraries for any external drives?

    return defaultPaths
  }
}
