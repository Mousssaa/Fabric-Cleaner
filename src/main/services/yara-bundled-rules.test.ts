import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { create } from '@litko/yara-x'

// The packaged app compiles resources/yara-rules/*.yar (see yara-rules-store.ts
// and electron-builder.yml extraResources). An empty or broken pack means the
// installers ship with no signatures, so guard it here.
const dir = join(__dirname, '../../../resources/yara-rules')
const files = readdirSync(dir).filter((f) => f.endsWith('.yar'))

describe('bundled YARA rule pack', () => {
  it('ships at least one rule file', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('compiles, carries the required metadata, and detects the EICAR test file', () => {
    const scanner = create()
    const source = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
    scanner.addRuleSource(source)
    for (const rule of source.matchAll(
      /^rule\s+(\w+)[\s\S]*?meta:([\s\S]*?)(?:strings|condition):/gm
    )) {
      expect(rule[2], rule[1]).toMatch(/detectionName\s*=\s*"[^"]+"/)
      expect(rule[2], rule[1]).toMatch(/severity\s*=\s*"(critical|high|medium|low)"/)
      expect(rule[2], rule[1]).toMatch(/details\s*=\s*"[^"]+"/)
    }
    const eicar = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`
    expect(scanner.scan(Buffer.from(eicar)).map((m) => m.ruleIdentifier)).toEqual([
      'EICAR_TestFile'
    ])
    expect(scanner.scan(Buffer.from('xmrig is mentioned in this README')).length).toBe(0)
    expect(scanner.scan(Buffer.from('plain clean data')).length).toBe(0)
  })
})
