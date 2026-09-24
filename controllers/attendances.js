const attendancesRouter = require('express').Router()
const Attendance = require('../models/attendance')
const { userExtractor } = require('../utils/middleware')

attendancesRouter.get('/me', userExtractor, async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const attendances = await Attendance.find({ student: request.user._id })
    .sort({ date: -1 })

  response.json(attendances)
})

attendancesRouter.get('/user/:userId', userExtractor, async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const targetUserId = request.params.userId
  const currentUser = request.user

  const isSelf = currentUser._id.toString() === targetUserId
  const isCoachOrAdmin = ['coach', 'admin'].includes(currentUser.role)
  const isParentOfTarget = currentUser.role === 'parent' && 
    currentUser.children?.some(childId => childId.toString() === targetUserId)

  if (!isSelf && !isCoachOrAdmin && !isParentOfTarget) {
    return response.status(403).json({ error: 'forbidden: access denied' })
  }

  const attendances = await Attendance.find({ student: targetUserId })
    .populate('student', 'name surname email group role')
    .sort({ date: -1 })

  response.json(attendances)
})

module.exports = attendancesRouter