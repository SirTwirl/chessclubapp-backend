const { test, describe } = require('node:test')
const assert = require('node:assert')
const User = require('../models/user')

const userAttributes = {
  email: 'student@example.com',
  passwordHash: 'password-hash',
  role: 'student',
  group: 'beginner'
}

describe('User amountDue', () => {
  test('defaults to zero for students', () => {
    const student = new User(userAttributes)

    assert.strictEqual(student.amountDue, 0)
    assert.strictEqual(student.validateSync(), undefined)
  })

  test('accepts a non-negative amount for students', () => {
    const student = new User({ ...userAttributes, amountDue: 125.5 })

    assert.strictEqual(student.validateSync(), undefined)
  })

  test('rejects a negative amount for students', () => {
    const student = new User({ ...userAttributes, amountDue: -1 })

    assert.ok(student.validateSync().errors.amountDue)
  })

  test('does not add the amount for non-students', () => {
    const coach = new User({
      email: 'coach@example.com',
      passwordHash: 'password-hash',
      role: 'coach'
    })

    assert.strictEqual(coach.amountDue, undefined)
    assert.strictEqual(coach.validateSync(), undefined)
  })

  test('rejects an amount for non-students', () => {
    const coach = new User({
      email: 'coach@example.com',
      passwordHash: 'password-hash',
      role: 'coach',
      amountDue: 100
    })

    assert.ok(coach.validateSync().errors.amountDue)
  })
})
