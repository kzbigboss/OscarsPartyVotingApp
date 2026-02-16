import { chromium } from 'playwright'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    'host-pin': { type: 'string' },
    guests: { type: 'string', default: '10' },
    headed: { type: 'boolean', default: false },
  },
})

if (!values.url || !values['host-pin']) {
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--headed]')
  process.exit(1)
}

const config = {
  url: values.url,
  hostPin: values['host-pin'],
  numGuests: parseInt(values.guests, 10),
  headed: values.headed,
}

console.log(`Load test: ${config.numGuests} guests against ${config.url}`)

const browser = await chromium.launch({ headless: !config.headed })
// TODO: orchestration phases
await browser.close()
console.log('Done.')
