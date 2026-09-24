const attendancesRouter = require('express').Router()
const Attendance = require('../models/attendance')
const User = require('../models/user')
const { userExtractor, requireRole } = require('../utils/middleware')

attendancesRouter.get('/me', userExtractor, async (request, response) => {
    const user = request.user
    if (!user) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    const attendances = await Attendance.find({ student: request.user._id })
        .sort({ date: -1 })

    response.json(attendances)
})

attendancesRouter.get('/user/:userId', userExtractor, async (request, response) => {
    const user = request.user
    if (!user) {
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

attendancesRouter.post('/user/:userId', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
    const targetUserId = request.params.userId
    const { date, status } = request.body

    if (!date || !status) {
        return response.status(400).json({ error: 'date and status are required' })
    }

    if (!['present', 'absent'].includes(status)) {
        return response.status(400).json({ error: 'status must be either "present" or "absent"' })
    }

    const targetStudent = await User.findById(targetUserId)
    if (!targetStudent) {
        return response.status(404).json({ error: 'student not found' })
    }

    const attendance = new Attendance({
        student: targetUserId,
        date,
        status
    })

    const savedAttendance = await attendance.save()
  
    const populatedAttendance = await savedAttendance.populate('student', 'name surname email group role')

    response.status(201).json(populatedAttendance)
})

module.exports = attendancesRouter