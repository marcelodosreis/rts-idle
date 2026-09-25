import { prepareAssets } from './pipeline/prepare-assets.js'

const SOURCE_ROOT = process.argv[2] ?? 'tmp/tiny_swords'
const TARGET_ROOT = process.argv[3] ?? 'apps/web/public/assets'

const manifest = prepareAssets({ sourceRoot: SOURCE_ROOT, targetRoot: TARGET_ROOT })
const count = Object.keys(manifest.assets).length
console.log(`prepared ${count} assets from ${SOURCE_ROOT} → ${TARGET_ROOT}`)
