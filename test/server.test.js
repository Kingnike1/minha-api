const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeQuery, validateQuery } = require('../server');

test('normalizeQuery trims and collapses whitespace', () => {
  assert.equal(normalizeQuery('  The   Matrix  '), 'The Matrix');
});

test('normalizeQuery rejects non-string values as empty', () => {
  assert.equal(normalizeQuery(undefined), '');
  assert.equal(normalizeQuery(123), '');
});

test('validateQuery accepts values between 2 and 120 chars', () => {
  assert.equal(validateQuery(' Up '), 'Up');
});

test('validateQuery rejects too-short values', () => {
  assert.throws(() => validateQuery('A'), /entre 2 e 120 caracteres/);
});

test('validateQuery rejects too-long values', () => {
  assert.throws(() => validateQuery('A'.repeat(121)), /entre 2 e 120 caracteres/);
});
