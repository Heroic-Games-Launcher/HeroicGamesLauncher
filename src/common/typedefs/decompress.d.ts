type DecompressOptions = {
  plugins?: void[]
  strip?: number
  filter?: (file: string) => boolean
  map?: (file: string) => string
}

type DecompressedFile = {
  data: Buffer
  mode: number
  mtime: Date
  path: string
  type: string
}

declare module '@xhmikosr/decompress' {
  export default function decompress(
    input: string,
    output: string,
    opts?: DecompressOptions
  ): Promise<void>
}

declare module '@xhmikosr/decompress-targz'
declare module '@felipecrs/decompress-tarxz'
