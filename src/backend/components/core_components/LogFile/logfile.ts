import { appendFile, writeFile } from 'fs/promises'

export default class LogFile {
  public readonly file_path: string

  public constructor(file_path: string) {
    this.file_path = file_path
  }

  public async logMessage(message: string): Promise<void> {
    await appendFile(this.file_path, message.trimEnd() + '\n')
  }

  public async clear(): Promise<void> {
    await writeFile(this.file_path, '')
  }
}
