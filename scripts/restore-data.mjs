import { gunzipSync } from 'node:zlib'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const archiveDir = join(projectRoot, 'data-archive')
const outputPath = join(
  projectRoot,
  'netlify',
  'functions',
  'data',
  'seoul-festivals.json',
)

const partNames = (await readdir(archiveDir))
  .filter((name) => name.startsWith('seoul-festivals.json.gz.b64.part-'))
  .sort()

if (partNames.length === 0) {
  throw new Error('Festival data archive parts were not found.')
}

const encodedParts = await Promise.all(
  partNames.map((name) => readFile(join(archiveDir, name), 'utf8')),
)
const compressed = Buffer.from(encodedParts.join(''), 'base64')
const restored = gunzipSync(compressed)
const parsed = JSON.parse(restored.toString('utf8'))

if (!Array.isArray(parsed.items) || parsed.items.length !== parsed.total) {
  throw new Error('Restored festival data failed its item-count check.')
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, restored)
console.log(`Restored ${parsed.items.length} festival records to ${outputPath}`)
