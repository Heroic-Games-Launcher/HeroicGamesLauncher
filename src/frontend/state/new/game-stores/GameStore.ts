export default abstract class GameStore {
  abstract auth(authCode: string): Promise<void>
  abstract get name(): string
}
