const User = require('../models/user')
const Attendance = require('../models/attendance')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const studentID = new mongoose.Types.ObjectId('6ab41fe5025e875fb24854e6')

const initialUsers = [
  {
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('adminpassword', 10),
    name: 'Admin',
    surname: 'User',
    age: 30,
    telephone: '1234567890',
    role: 'admin'
  },
  {
    email: 'coach@example.com',
    passwordHash: bcrypt.hashSync('coachpassword', 10),
    name: 'Coach',
    surname: 'User',
    age: 28,
    telephone: '0987654321',
    role: 'coach'
  },
  {
    _id: studentID,
    email: 'studentbeginner@example.com',
    passwordHash: bcrypt.hashSync('studentpassword', 10),
    name: 'Student',
    surname: 'User',
    age: 20,
    telephone: '1112223333',
    role: 'student',
    group: 'beginner'
  },
  {
    email: 'studentintermediate@example.com',
    passwordHash: bcrypt.hashSync('studentpassword', 10),
    name: 'Student',
    surname: 'User',
    age: 20,
    telephone: '1112223333',
    role: 'student',
    group: 'intermediate'
  },
  {
    email: 'studentadvanced@example.com',
    passwordHash: bcrypt.hashSync('studentpassword', 10),
    name: 'Student',
    surname: 'User',
    age: 20,
    telephone: '1112223333',
    role: 'student',
    group: 'advanced'
  },
  {
    email: 'parent@example.com',
    passwordHash: bcrypt.hashSync('parentpassword', 10),
    name: 'Parent',
    surname: 'User',
    age: 40,
    telephone: '4445556666',
    role: 'parent',
    children: [studentID]
  },
]

const usersInDb = async () => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}

const attendancesInDb = async () => {
  const attendances = await Attendance.find({})
  return attendances.map(a => a.toJSON())
}

module.exports = {
  initialUsers,
  usersInDb,
  attendancesInDb
}