// Launch the packaged GUI app in its built-in smoke mode (--fc-smoke-test) once
// per UI language, each with a disposable data directory, and verify the
// report: file:// IPC guard, preload bridge, every route renders, bundled YARA
// rules compile, no renderer console errors, and exit code 0.
//
// Usage: node scripts/package-ui-smoke-test.js <packaged executable> [report.json]
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { existsSync, mkdtempSync, readFileSync, writeFileSync } = require('node:fs')
const { rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')

const LANGUAGES = ['en', 'ar']

async function main() {
  assert(process.argv[2], 'Usage: node scripts/package-ui-smoke-test.js <packaged executable>')
  const executable = path.resolve(process.argv[2])
  const reportPath = process.argv[3] && path.resolve(process.argv[3])
  assert(existsSync(executable), `Packaged executable missing: ${executable}`)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_NO_ASAR
  delete env.NODE_PATH
  delete env.ELECTRON_RENDERER_URL

  const summary = []
  for (const language of LANGUAGES) {
    const dataDir = mkdtempSync(path.join(tmpdir(), `fc-ui-smoke-${language}-`))
    try {
      writeFileSync(
        path.join(dataDir, 'config.json'),
        JSON.stringify({ settings: { language }, onboardingComplete: true })
      )
      const resultFile = path.join(dataDir, 'smoke-result.json')
      const started = Date.now()
      const run = spawnSync(
        executable,
        [`--fc-data-dir=${dataDir}`, `--fc-smoke-test=${resultFile}`],
        {
          cwd: tmpdir(),
          env,
          encoding: 'utf8',
          timeout: 300_000,
          windowsHide: false,
          maxBuffer: 8 * 1024 * 1024
        }
      )
      assert.ifError(run.error)
      assert(
        existsSync(resultFile),
        `[${language}] no smoke report (exit ${run.status})\n${run.stdout}\n${run.stderr}`
      )
      const result = JSON.parse(readFileSync(resultFile, 'utf8'))
      const seconds = ((Date.now() - started) / 1000).toFixed(1)
      console.log(`\n=== UI smoke (${language}) exit=${run.status} in ${seconds}s ===`)
      console.log(JSON.stringify(result, null, 2))
      assert.deepEqual(result.failures, [], `[${language}] smoke failures`)
      assert.equal(result.ok, true)
      assert.equal(run.status, 0, `[${language}] exit code ${run.status}`)
      assert.equal(result.isPackaged, true)
      assert.equal(result.arch, process.arch)
      assert.equal(result.trustedFrame, true)
      assert.match(result.frameUrl, /^file:\/\/.*\/out\/renderer\/index\.html/)
      assert.equal(result.renderer.ipc.language, language)
      assert.equal(result.renderer.dir, language === 'ar' ? 'rtl' : 'ltr')
      assert.equal(result.renderer.language, language)
      assert(result.bundledRuleFiles > 0, 'No bundled YARA rule files')
      assert(result.renderer.yara.rulesLoaded > 0, 'YARA compiled no rules')
      assert.deepEqual(result.consoleErrors, [], `[${language}] renderer console errors`)
      summary.push({
        language,
        exitCode: run.status,
        seconds: Number(seconds),
        frameUrl: result.frameUrl,
        routes: result.renderer.routes.length,
        bridgeKeys: result.renderer.bridgeKeys,
        bundledRuleFiles: result.bundledRuleFiles,
        yaraRulesLoaded: result.renderer.yara.rulesLoaded,
        consoleErrors: result.consoleErrors.length
      })
    } finally {
      assert.equal(path.dirname(dataDir), path.resolve(tmpdir()))
      await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    }
  }
  if (reportPath) writeFileSync(reportPath, JSON.stringify(summary, null, 2))
  console.log('\nPackaged UI smoke passed:', JSON.stringify(summary))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
