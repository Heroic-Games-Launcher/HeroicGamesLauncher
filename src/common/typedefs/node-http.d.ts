import 'node:http'

declare module 'node:http' {
  // Electron 43 supports these APIs; the project's Node 22 types omit them.
  interface AgentOptions {
    proxyEnv?: NodeJS.ProcessEnv
  }
  function setGlobalProxyFromEnv(proxyEnv?: NodeJS.ProcessEnv): () => void
}
