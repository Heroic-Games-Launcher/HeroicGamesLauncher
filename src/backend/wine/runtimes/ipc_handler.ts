import { addHandler } from 'backend/ipc'
import { download, isInstalled } from './runtimes'

addHandler('downloadRuntime', async (e, runtime_name) => download(runtime_name))

addHandler('isRuntimeInstalled', async (e, runtime_name) =>
  isInstalled(runtime_name)
)
