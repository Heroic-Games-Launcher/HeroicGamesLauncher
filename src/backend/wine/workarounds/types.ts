import { Workarounds } from './spec'

export type WorkaroundsType = typeof Workarounds

export type Workaround = keyof typeof Workarounds

type Tail<T extends unknown[]> = T extends [unknown, ...infer Tail]
  ? Tail
  : never

type ParamsOf<
  Key extends Workaround,
  Operation extends keyof WorkaroundImplementation
> = Tail<Parameters<WorkaroundsType[Key][Operation]>>

export type InstallParams<Key extends Workaround> = ParamsOf<Key, 'install'>
export type RemoveParams<Key extends Workaround> = ParamsOf<Key, 'remove'>
export type IsInstalledParams<Key extends Workaround> = ParamsOf<
  Key,
  'isInstalled'
>
export type UpdateParams<Key extends Workaround> = ParamsOf<Key, 'update'>

export type WorkaroundsList = Partial<{
  [key in Workaround]: Partial<{ dllList: string[]; version: string }>
}>

export interface WorkaroundImplementation {
  install: (...args: never[]) => boolean | Promise<boolean>
  remove: (...args: never[]) => boolean | Promise<boolean>
  isInstalled: (...args: never[]) => boolean | Promise<boolean>
  update: (...args: never[]) => boolean | Promise<boolean>
}
