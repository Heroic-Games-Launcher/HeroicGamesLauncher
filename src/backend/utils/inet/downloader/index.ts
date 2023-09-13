import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { writeFile, stat, readFile } from 'fs/promises'
import { app } from 'electron'

type JSONValue = string | number | unknown[] | { [key: string]: JSONValue }

const MINUTES = 60
const HOURS = MINUTES * 60
const DAYS = HOURS * 24

interface CommonDownloadOptions<
  Type extends AxiosRequestConfig['responseType']
> {
  // If the response should also be written to a file, set this to the desired file path
  writeToFile?: Parameters<typeof stat>[0]
  // This will change how the function behaves if the file already exists
  // Instead of overwriting it, it'll instead return its contents if it's not
  // older than the specified number of seconds
  // This can be used to easily cache data that doesn't change often
  // NOTE: This does nothing if `writeToFile` isn't provided
  maxCache?: number
  axiosConfig?: Omit<AxiosRequestConfig, 'responseType'> & {
    responseType: Type
  }
}

type TextDownloadOptions = CommonDownloadOptions<'text'>
type ArrayBufferDownloadOptions = CommonDownloadOptions<'arraybuffer'>
type JsonDownloadOptions = CommonDownloadOptions<undefined | 'json'>
type DownloadOptions =
  | TextDownloadOptions
  | ArrayBufferDownloadOptions
  | JsonDownloadOptions

async function downloadFile(
  url: string,
  options: TextDownloadOptions
): Promise<string | AxiosError>
async function downloadFile(
  url: string,
  options: ArrayBufferDownloadOptions
): Promise<Buffer | AxiosError>
async function downloadFile(
  url: string,
  options?: JsonDownloadOptions
): Promise<JSONValue | AxiosError>
async function downloadFile(
  url: string,
  options: DownloadOptions = {}
): Promise<string | Buffer | JSONValue | AxiosError> {
  if (options.maxCache && options.writeToFile) {
    const stats = await stat(options.writeToFile).catch(() => null)
    if (stats) {
      if (stats.birthtime.valueOf() + options.maxCache * 1000 >= Date.now()) {
        console.log('Returning cached value for', url)
        switch (options.axiosConfig?.responseType) {
          case 'text':
            return readFile(options.writeToFile, 'utf-8')
          case 'arraybuffer':
            return readFile(options.writeToFile)
          default:
            return JSON.parse(
              await readFile(options.writeToFile, 'utf-8')
            ) as JSONValue
        }
      }
    }
  }

  const response = await axios
    .get(url, {
      ...options.axiosConfig,
      headers: {
        'User-Agent': `HeroicGamesLauncher/${app.getVersion()}`,
        ...options.axiosConfig?.headers
      }
    })
    .catch((error) => error as AxiosError)
  if (axios.isAxiosError(response)) return response
  // Axios' types aren't *that* well-defined, the types here are really everything `data` can be
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: string | Buffer | JSONValue = response.data

  if (options.writeToFile) {
    let toWrite: string | Buffer = ''
    switch (options.axiosConfig?.responseType) {
      case 'text':
        if (typeof data === 'string') toWrite = data
        break
      case 'arraybuffer':
        if (Buffer.isBuffer(data)) toWrite = data
        break
      default:
        toWrite = JSON.stringify(data)
    }
    await writeFile(options.writeToFile, toWrite)
  }

  return data
}

export { downloadFile, DAYS }
