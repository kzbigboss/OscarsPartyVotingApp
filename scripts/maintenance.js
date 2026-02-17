#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVICE_ACCOUNT_PATH = resolve(__dirname, '..', 'service-account-key.json')

function main() {
  const action = process.argv[2]

  if (action !== 'on' && action !== 'off') {
    console.error('Usage: node scripts/maintenance.js <on|off>')
    process.exit(1)
  }

  let serviceAccount
  try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
  } catch (err) {
    console.error(`Error reading service account key at ${SERVICE_ACCOUNT_PATH}`)
    console.error(err.message)
    process.exit(1)
  }

  const enabled = action === 'on'

  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  db.doc('config/maintenance')
    .set({ enabled }, { merge: true })
    .then(() => {
      console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}.`)
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error writing to Firestore:', err.message)
      process.exit(1)
    })
}

main()
