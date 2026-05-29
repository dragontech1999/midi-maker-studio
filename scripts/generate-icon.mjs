import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'build', 'icon.svg')
const buildDir = path.join(root, 'build')

const sizes = [16, 32, 48, 64, 128, 256, 512]
const svg = fs.readFileSync(svgPath)

for (const size of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(buildDir, `icon-${size}.png`))
}

const png256 = fs.readFileSync(path.join(buildDir, 'icon-256.png'))
const ico = await pngToIco(png256)
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)
fs.copyFileSync(path.join(buildDir, 'icon-256.png'), path.join(buildDir, 'icon.png'))

console.log('Generated build/icon.ico and build/icon.png')
