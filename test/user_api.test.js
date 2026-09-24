const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const api = supertest(app)
const config = require('../utils/config')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const { initialUsers } = require('./test_helper')

let token = ''

beforeEach(async () => {
  await User.deleteMany({})
  const seededUsers = await User.insertMany(initialUsers)

  const coach = seededUsers.find(u => u.role === 'coach')
  token = jwt.sign(
    { email: coach.email, id: coach._id, role: coach.role },
    config.SECRET
  )
})

describe('GET /api/users', () => {
    test('returns all users as json', async () => {
        const response = await api
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)
        
        assert.strictEqual(response.body.length, initialUsers.length)
    })
    test('returns users from beginner group', async () => {
        const response = await api
        .get('/api/users?group=beginner')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentbeginner@example.com')
    })
    test('returns users from intermediate group', async () => {
        const response = await api
        .get('/api/users?group=intermediate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentintermediate@example.com')
    })
    test('returns users from advanced group', async () => {
        const response = await api
        .get('/api/users?group=advanced')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'studentadvanced@example.com')
    })

    test('return all coaches', async () => {
        const response = await api
        .get('/api/users/coaches')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'coach@example.com')
    })

    test('return all parents', async () => {
        const response = await api
        .get('/api/users/parents')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        assert.strictEqual(response.body.length, 1)
        assert.strictEqual(response.body[0].email, 'parent@example.com')
    })

    test('fails with 401 Unauthorized if token is missing', async () => {
    await api
      .get('/api/users')
      .expect(401)
  })

  test('fails with 403 Forbidden if user is student', async () => {
    const student = (await User.find({ role: 'student' }))[0]
    const studentToken = jwt.sign(
      { email: student.email, id: student._id, role: student.role },
      config.SECRET
    )

    await api
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403)
  })
})

after(async () => {
  await mongoose.connection.close()
})