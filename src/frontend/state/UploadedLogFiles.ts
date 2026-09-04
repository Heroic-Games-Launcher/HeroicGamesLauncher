import { create } from 'zustand'

import type { UploadedLogData } from 'common/types'

const useUploadedLogFiles = create<Record<string, UploadedLogData>>()(
  () => ({})
)

window.api
  .getUploadedLogFiles()
  .then((logFiles) => useUploadedLogFiles.setState(logFiles))

window.api.logFileUploadedSlot((url, data) =>
  useUploadedLogFiles.setState({ [url]: data })
)

window.api.logFileUploadDeletedSlot((url) => {
  const currentLogFiles = useUploadedLogFiles.getState()
  delete currentLogFiles[url]
  useUploadedLogFiles.setState({ ...currentLogFiles }, true)
})

export default useUploadedLogFiles
