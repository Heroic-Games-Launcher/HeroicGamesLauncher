declare module '@xhmikosr/decompress' {
  import { DecompressOptions, File } from '@xhmikosr/decompress'

  export default function decompress(
    input: string,
    output: string,
    opts?: DecompressOptions
  ): Promise<File[]>
}

declare module '@xhmikosr/decompress-targz' {
  import { DecompressPlugin } from '@xhmikosr/decompress'

  const plugin: DecompressPlugin
  export default plugin
}

declare module '@felipecrs/decompress-tarxz' {
  import { DecompressPlugin } from '@xhmikosr/decompress'

  const plugin: DecompressPlugin
  export default plugin
}
