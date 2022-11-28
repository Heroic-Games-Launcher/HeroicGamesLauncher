export default abstract class GameStore {
  abstract auth(): Promise<void>
  abstract get name(): string
}
