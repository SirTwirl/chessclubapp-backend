const attendancesRouter = require('express').Router()
const Attendance = require('../models/attendance')
const User = require('../models/user')
const { userExtractor, requireRole } = require('../utils/middleware')

const validGroups = ['beginner', 'intermediate', 'advanced']

const isValidDate = (date) => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`)
    return !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
}

const getDateRange = (date) => {
    const start = new Date(`${date}T00:00:00.000Z`)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    return { $gte: start, $lt: end }
}

attendancesRouter.get('/', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
    const { group, date } = request.query

    if (!validGroups.includes(group) || !isValidDate(date)) {
        return response.status(400).json({ error: 'valid group and date are required' })
    }

    const students = await User.find({ role: 'student', group }).select('_id')
    const attendances = await Attendance.find({
        student: { $in: students.map(student => student._id) },
        date: getDateRange(date)
    })
        .populate('student', 'name surname email group role')
        .sort({ date: 1 })

    response.json(attendances)
})

attendancesRouter.post('/', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
    const { group, date, records } = request.body

    if (!validGroups.includes(group) || !isValidDate(date)) {
        return response.status(400).json({ error: 'valid group and date are required' })
    }

    if (!Array.isArray(records) || records.length === 0) {
        return response.status(400).json({ error: 'records must be a non-empty array' })
    }

    const studentIds = records.map(record => record?.studentId)
    if (records.some((record, index) =>
        !record ||
        typeof record.studentId !== 'string' ||
        !/^[a-fA-F0-9]{24}$/.test(record.studentId) ||
        typeof record.isPresent !== 'boolean' ||
        studentIds.indexOf(record.studentId) !== index
    )) {
        return response.status(400).json({ error: 'records must contain unique studentId values and boolean isPresent values' })
    }

    const students = await User.find({ role: 'student', group }).select('_id')
    const groupStudentIds = new Set(students.map(student => student._id.toString()))

    if (
        records.length !== students.length ||
        studentIds.some(studentId => !groupStudentIds.has(studentId))
    ) {
        return response.status(400).json({ error: 'records must include every student in the selected group' })
    }

    const existingAttendance = await Attendance.findOne({
        student: { $in: studentIds },
        date: getDateRange(date)
    })

    if (existingAttendance) {
        return response.status(409).json({ error: 'attendance already exists for one or more students on this date' })
    }

    const attendanceRecords = records.map(record => ({
        student: record.studentId,
        date: new Date(`${date}T00:00:00.000Z`),
        status: record.isPresent ? 'present' : 'absent'
    }))

    const savedRecords = await Attendance.insertMany(attendanceRecords)
    const populatedRecords = await Attendance.populate(
        savedRecords,
        { path: 'student', select: 'name surname email group role' }
    )

    response.status(201).json(populatedRecords)
})

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