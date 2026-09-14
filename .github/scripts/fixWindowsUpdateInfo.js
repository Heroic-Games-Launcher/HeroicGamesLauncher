const { spawnSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { appBuilderPath } = require('app-builder-bin')

const [x64YmlPath, arm64YmlPath, distDir] = process.argv.slice(2)

function readLines(file) {
  return fs.readFileSync(file, 'utf-8').split('\n')
}

function filesBlock(lines) {
  const start = lines.indexOf('files:')
  let end = start + 1
  while (end < lines.length && lines[end].startsWith('  ')) end++
  return { start, end }
}

function hashFile(file) {
  return crypto
    .createHash('sha512')
    .update(fs.readFileSync(file))
    .digest('base64')
}

const x64Lines = readLines(x64YmlPath)
const arm64Lines = readLines(arm64YmlPath)
const x64Block = filesBlock(x64Lines)
const arm64Block = filesBlock(arm64Lines)

const mergedLines = [
  ...x64Lines.slice(0, x64Block.end),
  ...arm64Lines.slice(arm64Block.start + 1, arm64Block.end),
  ...x64Lines.slice(x64Block.end)
]

for (const file of fs.readdirSync(distDir)) {
  if (!file.endsWith('.exe.blockmap')) continue
  const exePath = path.join(distDir, file.replace(/\.blockmap$/, ''))
  const result = spawnSync(
    appBuilderPath,
    ['blockmap', '--input', exePath, '--output', path.join(distDir, file)],
    { stdio: ['ignore', 'pipe', 'inherit'] }
  )
  if (result.status !== 0) {
    console.error(`Failed to regenerate blockmap for ${exePath}`)
    process.exit(1)
  }
}

let currentFile = null
const output = mergedLines.map((line) => {
  const url = line.match(/^(\s*)- url: (.+)$/)
  if (url) {
    currentFile = path.join(distDir, url[2].trim())
    return line
  }
  const topPath = line.match(/^path: (.+)$/)
  if (topPath) {
    currentFile = path.join(distDir, topPath[1].trim())
    return line
  }
  const kv = line.match(/^(\s*)(sha512|size|blockMapSize): .+$/)
  if (!kv || !currentFile) return line
  if (kv[2] === 'sha512') return `${kv[1]}sha512: ${hashFile(currentFile)}`
  if (kv[2] === 'size') return `${kv[1]}size: ${fs.statSync(currentFile).size}`
  return `${kv[1]}blockMapSize: ${fs.statSync(`${currentFile}.blockmap`).size}`
})

fs.writeFileSync(path.join(distDir, 'latest.yml'), output.join('\n'))
fs.rmSync(x64YmlPath)
fs.rmSync(arm64YmlPath)
console.log(fs.readFileSync(path.join(distDir, 'latest.yml'), 'utf-8'))
