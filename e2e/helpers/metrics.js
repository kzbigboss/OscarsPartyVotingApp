export class Metrics {
  constructor() {
    this.timings = {}     // { phaseName: durationMs }
    this.latencies = {}   // { metricName: [ms, ms, ...] }
    this.assertions = { passed: 0, failed: 0, failures: [] }
  }

  startPhase(name) {
    this._phaseStart = Date.now()
    this._phaseName = name
  }

  endPhase() {
    if (this._phaseName) {
      this.timings[this._phaseName] = Date.now() - this._phaseStart
    }
  }

  recordLatency(name, ms) {
    if (!this.latencies[name]) this.latencies[name] = []
    this.latencies[name].push(ms)
  }

  assert(description, condition) {
    if (condition) {
      this.assertions.passed++
    } else {
      this.assertions.failed++
      this.assertions.failures.push(description)
    }
  }

  _stats(values) {
    if (!values.length) return { avg: 0, p50: 0, p95: 0, max: 0 }
    const sorted = [...values].sort((a, b) => a - b)
    const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const max = sorted[sorted.length - 1]
    return { avg, p50, p95, max }
  }

  report() {
    const totalMs = Object.values(this.timings).reduce((s, v) => s + v, 0)
    const totalSec = (totalMs / 1000).toFixed(1)

    console.log('\n=== Load Test Results ===')
    console.log(`Duration: ${totalSec}s\n`)

    console.log('Phase Timing:')
    for (const [name, ms] of Object.entries(this.timings)) {
      console.log(`  ${name.padEnd(30)} ${(ms / 1000).toFixed(1)}s`)
    }

    if (Object.keys(this.latencies).length) {
      console.log('\nLatency (ms):')
      console.log('                        avg     p50     p95     max')
      for (const [name, values] of Object.entries(this.latencies)) {
        const s = this._stats(values)
        console.log(
          `  ${name.padEnd(20)} ${String(s.avg).padStart(5)}   ${String(s.p50).padStart(5)}   ${String(s.p95).padStart(5)}   ${String(s.max).padStart(5)}`
        )
      }
    }

    console.log(`\nAssertions: ${this.assertions.passed} passed, ${this.assertions.failed} failed`)
    if (this.assertions.failures.length) {
      console.log('Failures:')
      for (const f of this.assertions.failures) {
        console.log(`  - ${f}`)
      }
    }

    return this.assertions.failed === 0
  }
}
