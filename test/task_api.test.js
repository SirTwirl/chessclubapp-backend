const { test, describe, beforeEach, after, mock } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const app = require('../app')
const config = require('../utils/config')
const helper = require('./test_helper')
const User = require('../models/user')
const Task = require('../models/task')

const api = supertest(app)

mock.method(config.cloudinary.uploader, 'upload', async () => {
  return {
    secure_url: 'https://res.cloudinary.com/test_demo/image/upload/v12345/chessclub/tasks/test_image.png'
  }
})

describe('Tasks API', () => {
  let coachToken, studentToken, otherStudentToken
  let coach, studentBeginner, studentIntermediate
  let initialTask

  beforeEach(async () => {
    await User.deleteMany({})
    await Task.deleteMany({})

    await User.insertMany(helper.initialUsers)

    coach = await User.findOne({ email: 'coach@example.com' })
    studentBeginner = await User.findOne({ email: 'studentbeginner@example.com' })
    studentIntermediate = await User.findOne({ email: 'studentintermediate@example.com' })

    coachToken = jwt.sign(
      { email: coach.email, id: coach._id, role: coach.role },
      config.SECRET
    )
    studentToken = jwt.sign(
      { email: studentBeginner.email, id: studentBeginner._id, role: studentBeginner.role },
      config.SECRET
    )
    otherStudentToken = jwt.sign(
      { email: studentIntermediate.email, id: studentIntermediate._id, role: studentIntermediate.role },
      config.SECRET
    )

    initialTask = new Task({
      title: 'Mate in 2 moves',
      description: 'Solve puzzle from worksheet #4',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      targetGroup: studentBeginner.group,
      assignedBy: coach._id
    })
    await initialTask.save()
  })

  describe('GET /api/tasks', () => {
    test('succeeds for logged-in student and returns tasks for their group', async () => {
      const response = await api
        .get('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].title, 'Mate in 2 moves')
      assert.strictEqual(response.body[0].targetGroup, studentBeginner.group)
    })

    test('fails with 401 Unauthorized if token is missing', async () => {
      await api.get('/api/tasks').expect(401)
    })

    test('filter ?active=true returns only non-expired tasks', async () => {
      const expiredTask = new Task({
        title: 'Old Task',
        description: 'Expired task description',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        targetGroup: studentBeginner.group,
        assignedBy: coach._id
      })
      await expiredTask.save()

      const response = await api
        .get('/api/tasks?active=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].title, 'Mate in 2 moves')
    })
  })

  describe('GET /api/tasks/:id', () => {
    test('succeeds when student requests a task assigned to their group', async () => {
      const response = await api
        .get(`/api/tasks/${initialTask._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.title, initialTask.title)
    })

    test('fails with 403 Forbidden when student requests task from another group', async () => {
      await api
        .get(`/api/tasks/${initialTask._id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .expect(403)
    })

    test('fails with 404 Not Found if task does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      await api
        .get(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })
  })

  describe('POST /api/tasks', () => {
    test('succeeds with status 201 when coach creates task with image', async () => {
      const newTask = {
        title: 'Tactical Combination',
        description: 'Find the deflection tactic',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        targetGroup: studentBeginner.group,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }

      const response = await api
        .post('/api/tasks')
        .set('Authorization', `Bearer ${coachToken}`)
        .send(newTask)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.title, newTask.title)
      assert.strictEqual(
        response.body.imageUrl,
        'https://res.cloudinary.com/test_demo/image/upload/v12345/chessclub/tasks/test_image.png'
      )

      const tasksInDb = await Task.find({})
      assert.strictEqual(tasksInDb.length, 2)
    })

    test('fails with 403 Forbidden when student tries to create task', async () => {
      const newTask = {
        title: 'Student Attempt',
        description: 'Test',
        dueDate: new Date().toISOString(),
        targetGroup: studentBeginner.group
      }

      await api
        .post('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(newTask)
        .expect(403)
    })

    test('fails with 400 Bad Request if required fields are missing', async () => {
      const invalidTask = {
        title: 'Missing description and date'
      }

      await api
        .post('/api/tasks')
        .set('Authorization', `Bearer ${coachToken}`)
        .send(invalidTask)
        .expect(400)
    })
  })

  after(async () => {
    await mongoose.connection.close()
  })
})