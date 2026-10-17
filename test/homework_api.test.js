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
const HomeworkAnswer = require('../models/homeworkAnswer')

const api = supertest(app)

mock.method(config.cloudinary.uploader, 'upload', async () => {
  return {
    secure_url: 'https://res.cloudinary.com/test_demo/image/upload/v12345/chessclub/answers/solution_image.png'
  }
})

describe('Homework Answers API', () => {
  let coachToken, studentToken, otherStudentToken, parentToken
  let coach, studentBeginner, studentIntermediate, parent
  let initialTask

  beforeEach(async () => {
    await User.deleteMany({})
    await Task.deleteMany({})
    await HomeworkAnswer.deleteMany({})

    await User.insertMany(helper.initialUsers)

    coach = await User.findOne({ email: 'coach@example.com' })
    studentBeginner = await User.findOne({ email: 'studentbeginner@example.com' })
    studentIntermediate = await User.findOne({ email: 'studentintermediate@example.com' })
    parent = await User.findOne({ email: 'parent@example.com' })

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
    parentToken = jwt.sign(
      { email: parent.email, id: parent._id, role: parent.role },
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

  describe('POST /api/tasks/:id/answers', () => {
    test('succeeds with status 201 when student submits a valid text answer', async () => {
      const submission = {
        content: '1. Qh7+ Kxh7 2. Rh3#'
      }

      const response = await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submission)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.content, submission.content)
      assert.strictEqual(response.body.task.toString(), initialTask._id.toString())
      assert.strictEqual(response.body.student.email, studentBeginner.email)

      const answersInDb = await helper.answersInDb()
      assert.strictEqual(answersInDb.length, 1)
      assert.strictEqual(answersInDb[0].content, submission.content)
    })

    test('succeeds with status 201 when student submits an answer with image', async () => {
      const submission = {
        content: 'Rozwiązanie na załączonym zdjęciu',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }

      const response = await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submission)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.content, submission.content)
      assert.strictEqual(
        response.body.imageUrl,
        'https://res.cloudinary.com/test_demo/image/upload/v12345/chessclub/answers/solution_image.png'
      )
    })

    test('fails with 401 Unauthorized if token is missing', async () => {
      const submission = { content: '1. e4 e5' }
      await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .send(submission)
        .expect(401)
    })

    test('fails with 403 Forbidden when a coach tries to submit homework', async () => {
      const submission = { content: 'Coach answer' }
      await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(submission)
        .expect(403)
    })

    test('fails with 403 Forbidden when student submits for task of another group', async () => {
      const submission = { content: '1. Nf3 d5' }
      const response = await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send(submission)
        .expect(403)

      assert.match(response.body.error, /not for your group/i)
    })

    test('fails with 404 Not Found if task does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const submission = { content: '1. d4 d5' }

      await api
        .post(`/api/tasks/${nonExistentId}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submission)
        .expect(404)
    })

    test('fails with 400 Bad Request if both content and image are missing', async () => {
      const emptySubmission = {}

      await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(emptySubmission)
        .expect(400)
    })

    test('fails with 400 Bad Request when student attempts duplicate submission for the same task', async () => {
      const firstSubmission = { content: 'First solution: 1. Qh7#' }
      await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(firstSubmission)
        .expect(201)

      const duplicateSubmission = { content: 'Second solution attempt' }
      await api
        .post(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(duplicateSubmission)
        .expect(400)
    })
  })

  describe('GET /api/tasks/:id/answers', () => {
    beforeEach(async () => {
      const answer = new HomeworkAnswer({
        task: initialTask._id,
        student: studentBeginner._id,
        content: '1. Qh7+ Kxh7 2. Rh3#'
      })
      await answer.save()
    })

    test('student can retrieve their own submitted answer', async () => {
      const response = await api
        .get(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].content, '1. Qh7+ Kxh7 2. Rh3#')
    })

    test('coach can view all answers submitted for the task', async () => {
      const response = await api
        .get(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].student.email, studentBeginner.email)
    })

    test('parent can view answers of their child', async () => {
      const response = await api
        .get(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].student.email, studentBeginner.email)
    })

    test('fails with 403 when student from another group requests answers', async () => {
      await api
        .get(`/api/tasks/${initialTask._id}/answers`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .expect(403)
    })
  })

  after(async () => {
    await mongoose.connection.close()
  })
})
