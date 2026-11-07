import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

// i18next picks a CLDR plural suffix per language (Arabic: zero, one, two, few,
// many, other). A missing form is not filled from "_other" in the same
// language: i18next falls back to English, so Arabic users saw English strings
// for counts such as 3 or 11. Every pluralized Arabic key needs every form.
const LANGUAGES = ['ar']

function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}) {
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object') flatten(child, path, out)
    else out[path] = child
  }
  return out
}

describe.each(LANGUAGES)('%s plural forms', (language) => {
  const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories
  const dir = join(__dirname, language)

  it.each(readdirSync(dir).filter((f) => f.endsWith('.json')))('%s is complete', (file) => {
    const keys = flatten(JSON.parse(readFileSync(join(dir, file), 'utf8')))
    const missing: string[] = []
    for (const key of Object.keys(keys)) {
      if (!key.endsWith('_other')) continue
      const base = key.slice(0, -'_other'.length)
      for (const category of categories) {
        if (!(`${base}_${category}` in keys)) missing.push(`${base}_${category}`)
      }
    }
    expect(missing).toEqual([])
  })
})
