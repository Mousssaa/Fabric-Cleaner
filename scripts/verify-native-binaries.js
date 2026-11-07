// Verify that a packaged app only ships native code for its target OS and CPU:
// the main executable and every .node addon in app.asar.unpacked must be a
// Windows PE x64 (win32) or Mach-O x86_64 (darwin) binary, never a Linux ELF.
//
// Usage: node scripts/verify-native-binaries.js <executable> <resources dir> <win32|darwin> <x64>
const assert = require('node:assert/strict')
const { closeSync, openSync, readSync, readdirSync, statSync } = require('node:fs')
const path = require('node:path')

function head(file, length, position = 0) {
  const fd = openSync(file, 'r')
  try {
    const buffer = Buffer.alloc(length)
    readSync(fd, buffer, 0, length, position)
    return buffer
  } finally {
    closeSync(fd)
  }
}

function describe(file) {
  const b = head(file, 4096)
  if (b.readUInt32BE(0) === 0x7f454c46) return { format: 'elf' }
  if (b[0] === 0x4d && b[1] === 0x5a) {
    const pe = b.readUInt32LE(0x3c)
    const sig = head(file, 6, pe)
    assert.equal(sig.readUInt32LE(0), 0x00004550, `${file}: bad PE signature`)
    const machine = sig.readUInt16LE(4)
    const arch =
      { 0x8664: 'x64', 0xaa64: 'arm64', 0x14c: 'ia32' }[machine] || `0x${machine.toString(16)}`
    return { format: 'pe', archs: [arch] }
  }
  const cpu = (type) =>
    ({ 0x01000007: 'x64', 0x0100000c: 'arm64' })[type >>> 0] || `0x${(type >>> 0).toString(16)}`
  if (b.readUInt32LE(0) === 0xfeedfacf) return { format: 'macho', archs: [cpu(b.readInt32LE(4))] }
  if (b.readUInt32BE(0) === 0xcafebabe) {
    const count = b.readUInt32BE(4)
    const archs = []
    for (let i = 0; i < count; i++) archs.push(cpu(b.readInt32BE(8 + i * 20)))
    return { format: 'macho', archs }
  }
  return { format: 'unknown' }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile() && entry.name.endsWith('.node')) out.push(full)
  }
  return out
}

const [executable, resources, platform, arch] = process.argv.slice(2)
assert(
  executable && resources && platform && arch,
  'Usage: <executable> <resources> <platform> <arch>'
)
const expectedFormat = { win32: 'pe', darwin: 'macho' }[platform]
assert(expectedFormat, `Unsupported platform ${platform}`)

const unpacked = path.join(resources, 'app.asar.unpacked')
assert(statSync(unpacked).isDirectory(), `Missing ${unpacked}`)
const addons = walk(unpacked)
for (const required of ['better_sqlite3.node', 'yara-x']) {
  assert(
    addons.some((file) => file.includes(required)),
    `No ${required} native addon in app.asar.unpacked`
  )
}
const rows = []
for (const file of [path.resolve(executable), ...addons]) {
  const info = describe(file)
  rows.push(`${info.format} ${(info.archs || []).join('+')}  ${path.relative(process.cwd(), file)}`)
  assert.equal(info.format, expectedFormat, `${file} is ${info.format}, expected ${expectedFormat}`)
  assert(info.archs.includes(arch), `${file} targets ${info.archs}, expected ${arch}`)
}
console.log(rows.join('\n'))
console.log(`All ${rows.length} binaries are ${platform}-${arch}`)
