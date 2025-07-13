import { TypeCheckedStoreBackend } from 'backend/electron_store'

const configStore = new TypeCheckedStoreBackend('humbleConfigStore', {
  cwd: 'humble_bumdle_store'
})

export { configStore }
