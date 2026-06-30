import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const sourceDir = path.join(rootDir, 'src')

const filesToCheck = [
  'src/server.js',
  'src/config/env.js',
  'src/config/logger.js',
  'src/http/app.js',
  'src/http/auth-middleware.js',
  'src/services/laravel-callback-client.js',
  'src/services/whatsapp-gateway-service.js',
  'src/utils/date.js',
  'src/utils/phone-number.js'
]

const optionalRootFiles = [
  'package-lock.json',
  '.env.example',
  '.env.hostinger.example',
  'HOSTINGER_NODE_APP.md',
  'README.md'
]

function runNodeCheck(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], {
      cwd: rootDir,
      stdio: 'inherit'
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Syntax check failed for ${file}.`))
    })
  })
}

async function exists(file) {
  try {
    await fs.access(file, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function writeProductionPackage() {
  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse((await fs.readFile(packageJsonPath, 'utf8')).replace(/^\uFEFF/, ''))

  packageJson.scripts = {
    start: 'node src/server.js'
  }

  delete packageJson.devDependencies

  await fs.writeFile(
    path.join(distDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8'
  )
}

async function copyOptionalRootFiles() {
  await Promise.all(optionalRootFiles.map(async (file) => {
    const source = path.join(rootDir, file)

    if (await exists(source)) {
      await fs.copyFile(source, path.join(distDir, file))
    }
  }))
}

for (const file of filesToCheck) {
  await runNodeCheck(file)
}

await fs.rm(distDir, { recursive: true, force: true })
await fs.mkdir(distDir, { recursive: true })
await fs.cp(sourceDir, path.join(distDir, 'src'), { recursive: true })
await writeProductionPackage()
await copyOptionalRootFiles()

console.log('Build complete. Upload anggrek-astuti-whatsapp/dist to Hostinger Node.js app root.')




