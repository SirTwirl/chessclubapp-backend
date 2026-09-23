const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const api = supertest(app)
const User = require('../models/user')
const { initialUsers } = require('./test_helper')

beforeEach(async () => {
    await User.deleteMany({})
    await User.insertMany(initialUsers)
})

describe('GET /api/users', () => {
    test('returns all users as json', async () => {
        const response = await api
            .get('/api/users')
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(response.body.length, initialUsers.length)
    })
    test('returns users from beginner group', async () => {
        const response = await api
        .get('/api/users?group=beginner')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentbeginner@example.com')
    })
    test('returns users from intermediate group', async () => {
        const response = await api
        .get('/api/users?group=intermediate')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentintermediate@example.com')
    })
    test('returns users from advanced group', async () => {
        const response = await api
        .get('/api/users?group=advanced')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentadvanced@example.com')
    })

    test('return all coaches'), async () => {
        const response = await api
        .get('/api/users/coaches')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'coach@example.com')
    }

    test('return all parents', async () => {
        const response = await api
        .get('/api/users/parents')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'parent@example.com')
    })
})

after(async () => {
  await mongoose.connection.close()
})