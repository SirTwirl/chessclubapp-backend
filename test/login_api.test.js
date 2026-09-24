const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const api = supertest(app)
const User = require('../models/user')
const helper = require('./test_helper')

describe('login endpoint', () => {
  beforeEach(async () => {
    await User.deleteMany({})
    await User.insertMany(helper.initialUsers)
  })

  test('succeeds with valid credentials and returns token + role', async () => {
    const loginDetails = {
      email: helper.initialUsers[0].email,
      password: 'adminpassword'
    }

    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(typeof response.body.token, 'string')
    assert.strictEqual(response.body.email, loginDetails.email)
    assert.strictEqual(response.body.role, helper.initialUsers[0].role)
  })

  test('fails with 401 and invalid email or password when password is wrong', async () => {
    const loginDetails = {
      email: helper.initialUsers[0].email,
      password: 'wrongpassword'
    }

    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, 'invalid email or password')
  })

  test('fails with 401 when user does not exist', async () => {
    const loginDetails = {
      email: 'nonexistent@example.com',
      password: 'somepassword'
    }

    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)

    assert.strictEqual(response.body.error, 'invalid email or password')
  })

  after(async () => {
    await mongoose.connection.close()
  })
})