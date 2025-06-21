import { access, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { t } from 'i18next'

import { type MinimalGameInfo, SerializedLibraryInfo } from './schemas'

import { Path } from '../schemas'
import { logError, LogPrefix } from '../logger/logger'
import { getDiskInfo } from '../utils/filesystem'

import type { PathLike } from 'fs'
import type { LibraryInfo } from './types'

const exists = async (path: PathLike) =>
  access(path).then(
    () => true,
    () => false
  )

export default class Library {
  readonly path: Path
  readonly removable: boolean

  constructor(path: Path, removable: boolean) {
    this.path = path
    this.removable = removable
  }

  public async ensureInfo() {
    if (await exists(this.infoPath)) return
    await this.writeInfo(await this.defaultInfo()).catch((e) => {
      logError(
        [`Failed to write default library info for "${this.path}":`, e],
        LogPrefix.Backend
      )
    })
  }

  public async readInfo(): Promise<LibraryInfo | false> {
    let serializedInfo: SerializedLibraryInfo
    try {
      serializedInfo = SerializedLibraryInfo.parse(
        JSON.parse(await readFile(this.infoPath, 'utf-8'))
      )
    } catch (e) {
      logError(
        ['Failed to read library info for path', `'${this.path}':`, e],
        LogPrefix.Backend
      )
      return false
    }

    return {
      ...serializedInfo,
      ...(await getDiskInfo(this.infoPath)),
      removable: this.removable
    }
  }

  public async addGame(info: MinimalGameInfo): Promise<boolean> {
    const currentInfo = await this.readInfo()
    if (!currentInfo) return false

    currentInfo.games.push(info)

    await this.writeInfo(currentInfo)
    return true
  }

  public async addMany(infos: MinimalGameInfo[]): Promise<boolean> {
    const currentInfo = await this.readInfo()
    if (!currentInfo) return false

    currentInfo.games.push(...infos)

    await this.writeInfo(currentInfo)
    return true
  }

  public async setName(name: string): Promise<boolean> {
    const currentInfo = await this.readInfo()
    if (!currentInfo) return false

    currentInfo.name = name

    await this.writeInfo(currentInfo)
    return true
  }

  private get infoPath(): Path {
    return Path.parse(join(this.path, 'heroicLibraryInfo.json'))
  }

  private async writeInfo(info: SerializedLibraryInfo) {
    // TypeScript deliberately allows objects to contain more properties than
    // they annotate in the type, to make things like spread operators easier
    // We don't want to serialize these extra properties however, so strip them
    // out with an extra schema validation
    const strippedInfo = SerializedLibraryInfo.parse(info)

    await writeFile(this.infoPath, JSON.stringify(strippedInfo, undefined, 2))
  }

  private async defaultInfo(): Promise<SerializedLibraryInfo> {
    const { mountPoint, label } = await getDiskInfo(this.path)
    return {
      name: t(
        'library.defaultName',
        'Library on {{diskLabel}} ({{mountPoint}})',
        {
          diskLabel: label ?? 'Local Drive',
          mountPoint,
          interpolation: {
            escapeValue: false
          }
        }
      ),
      games: []
    }
  }
}
