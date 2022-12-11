import { Workarounds } from './spec'

export type WorkaroundsType = typeof Workarounds

export type Workaround = keyof typeof Workarounds

type Tail<T extends unknown[]> = T extends [unknown, ...infer Tail]
  ? Tail
  : never

type ParamsOf<
  Key extends Workaround,
  Operation extends 'install' | 'remove' | 'isInstalled'
> = Tail<Parameters<WorkaroundsType[Key][Operation]>>

export type InstallParams<Key extends Workaround> = ParamsOf<Key, 'install'>
export type RemoveParams<Key extends Workaround> = ParamsOf<Key, 'remove'>
export type IsInstalledParams<Key extends Workaround> = ParamsOf<
  Key,
  'isInstalled'
>

export type WorkaroundsList = Partial<{
  [key in Workaround]: Partial<{ dllList: string[]; version: string }>
}>
