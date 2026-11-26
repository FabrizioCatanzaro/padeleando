import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWhatsapp, localWhatsapp, dialCode } from '../src/utils/phone.js'

test('WhatsApp argentino: suma el 54 y el 9, saca el 0 y el 15', () => {
  assert.equal(buildWhatsapp('AR', '11 3344 5555'), '+5491133445555')
  assert.equal(buildWhatsapp('AR', '011 15 3344-5555'), '+5491133445555')
  assert.equal(buildWhatsapp('AR', '9 11 3344 5555'), '+5491133445555')
  assert.equal(buildWhatsapp('AR', '351 15 444 5555'), '+5493514445555')
  assert.equal(buildWhatsapp('AR', '54 9 11 3344 5555'), '+5491133445555')
  assert.equal(buildWhatsapp('AR', '+598 99 123 456'), '+59899123456')
  assert.equal(buildWhatsapp('AR', ''), '')
})

test('WhatsApp de otros países y vuelta al número local', () => {
  assert.equal(dialCode('UY'), '598')
  assert.equal(buildWhatsapp('UY', '099 123 456'), '+59899123456')
  assert.equal(buildWhatsapp('ES', '612 345 678'), '+34612345678')
  assert.equal(localWhatsapp('AR', '+5491133445555'), '1133445555')
  assert.equal(localWhatsapp('UY', '+59899123456'), '99123456')
  assert.equal(localWhatsapp('AR', '+59899123456'), '+59899123456')
})
