const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const app = require('../app')
const config = require('../utils/config')
const helper = require('./test_helper')
const User = require('../models/user')
const Attendance = require('../models/attendance')

const api = supertest(app)

describe('Attendance API', () => {
  let studentToken, otherStudentToken, parentToken, coachToken
  let studentBeginner, studentIntermediate, parent, coach

  beforeEach(async () => {
    await User.deleteMany({})
    await Attendance.deleteMany({})

    await User.insertMany(helper.initialUsers)

    studentBeginner = await User.findOne({ email: 'studentbeginner@example.com' })
    studentIntermediate = await User.findOne({ email: 'studentintermediate@example.com' })
    parent = await User.findOne({ email: 'parent@example.com' })
    coach = await User.findOne({ email: 'coach@example.com' })

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
    coachToken = jwt.sign(
      { email: coach.email, id: coach._id, role: coach.role },
      config.SECRET
    )

    await new Attendance({
      student: studentBeginner._id,
      date: new Date('2026-09-20'),
      status: 'present'
    }).save()
  })

  describe('GET /api/attendances/me', () => {
    test('succeeds for logged-in student', async () => {
      const response = await api
        .get('/api/attendances/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].status, 'present')
    })

    test('fails with 401 Unauthorized if token is missing', async () => {
      await api.get('/api/attendances/me').expect(401)
    })
  })

  describe('GET /api/attendances/user/:userId', () => {
    test('succeeds when student requests their own attendances', async () => {
      const response = await api
        .get(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
    })

    test('succeeds when coach requests student attendances', async () => {
      const response = await api
        .get(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
      assert.strictEqual(response.body[0].student.email, studentBeginner.email)
    })

    test('succeeds when parent requests their child attendances', async () => {
      const response = await api
        .get(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200)

      assert.strictEqual(response.body.length, 1)
    })

    test('fails with 403 Forbidden when student requests another student attendances', async () => {
      await api
        .get(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .expect(403)
    })

    test('fails with 403 Forbidden when parent requests unrelated student attendances', async () => {
      await api
        .get(`/api/attendances/user/${studentIntermediate._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403)
    })
  })
  describe('POST /api/attendances/user/:userId', () => {
    test('succeeds with status 201 when coach adds valid attendance', async () => {
      const newAttendance = {
        date: '2026-09-25',
        status: 'present'
      }

      const response = await api
        .post(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(newAttendance)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.status, 'present')
      assert.strictEqual(response.body.student.email, studentBeginner.email)

      const attendancesAtEnd = await helper.attendancesInDb()
      assert.strictEqual(attendancesAtEnd.length, 2)
    })

    test('fails with 403 Forbidden when student tries to create attendance', async () => {
      const newAttendance = {
        date: '2026-09-25',
        status: 'present'
      }

      await api
        .post(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(newAttendance)
        .expect(403)
    })

    test('fails with 403 Forbidden when parent tries to create attendance', async () => {
      const newAttendance = {
        date: '2026-09-25',
        status: 'present'
      }

      await api
        .post(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send(newAttendance)
        .expect(403)
    })

    test('fails with 400 Bad Request if status is invalid', async () => {
      const newAttendance = {
        date: '2026-09-25',
        status: 'late'
      }

      await api
        .post(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(newAttendance)
        .expect(400)
    })

    test('fails with 404 Not Found if student does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const newAttendance = {
        date: '2026-09-25',
        status: 'present'
      }

      await api
        .post(`/api/attendances/user/${nonExistentId}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(newAttendance)
        .expect(404)
    })

    test('fails when adding duplicate attendance for same student and date', async () => {
      const duplicateAttendance = {
        date: '2026-09-20',
        status: 'absent'
      }

      await api
        .post(`/api/attendances/user/${studentBeginner._id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(duplicateAttendance)
        .expect(400)
    })
  })

  after(async () => {
    await mongoose.connection.close()
  })
})