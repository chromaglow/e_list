#!/usr/bin/env node
// Generate a cryptographically random 64-hex-char invite token
// Usage: node scripts/gen-invite-token.js
// Output: 64 lowercase hex characters (32 random bytes)
const { randomBytes } = require('crypto')
process.stdout.write(randomBytes(32).toString('hex') + '\n')
