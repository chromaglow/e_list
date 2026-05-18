#!/usr/bin/env node
// scripts/gen-hash.js — generates a bcrypt cost-12 hash for ADMIN_PASSWORD_HASH
'use strict'

const bcrypt = require('bcryptjs')

const password = process.argv[2]
if (!password) {
  process.stderr.write('Usage: node scripts/gen-hash.js <password>\n')
  process.exit(1)
}

bcrypt.hash(password, 12).then(hash => {
  process.stdout.write(hash + '\n')
})
