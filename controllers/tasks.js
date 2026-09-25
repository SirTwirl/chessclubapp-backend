const tasksRouter = require('express').Router()
const Task = require('../models/task')
const User = require('../models/user')
const { userExtractor, requireRole } = require('../utils/middleware')
const { cloudinary } = require('../utils/config')

tasksRouter.get('/', userExtractor, async (request, response) => {
    const user = request.user
    if (!user) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    let query = {}

    if (user.role === 'student') {
        query = { targetGroup: user.group }
    } else if (user.role === 'parent') {
        const children = await User.find({ _id: { $in: user.children || [] } })
        const childrenGroups = children.map(child => child.group).filter(Boolean)
        query = { targetGroup: { $in: childrenGroups } }
    }

    if (request.query.active === 'true') {
        query.dueDate = { $gte: new Date() }
    }

    const tasks = await Task.find(query)
        .populate('assignedBy', 'name surname email')
        .sort({ dueDate: 1 })

    response.json(tasks)
})

tasksRouter.get('/:id', userExtractor, async (request, response) => {
    const user = request.user
    if (!user) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    const task = await Task.findById(request.params.id)
        .populate('assignedBy', 'name surname email')

    if (!task) {
        return response.status(404).json({ error: 'task not found' })
    }

    if (user.role === 'student' && task.targetGroup !== user.group) {
        return response.status(403).json({ error: 'forbidden: task not for your group' })
    }

    response.json(task)
})

tasksRouter.post('/', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
    const { title, description, image, dueDate, targetGroup } = request.body

    if (!title || !description || !dueDate || !targetGroup) {
        return response.status(400).json({ error: 'title, description, dueDate, and targetGroup are required' })
    }

    let imageUrl = null

    if (image) {
        try {
            const uploadResult = await cloudinary.uploader.upload(image, {
                folder: 'chessclub/tasks'
            })
            imageUrl = uploadResult.secure_url
        }   catch (error) {
            return response.status(400).json({ error: 'failed to upload image to Cloudinary' })
        }
    }

    const task = new Task({
        title,
        description,
        imageUrl,
        dueDate,
        targetGroup,
        assignedBy: request.user._id
  })

    const savedTask = await task.save()
    const populatedTask = await savedTask.populate('assignedBy', 'name surname email')

    response.status(201).json(populatedTask)
})

module.exports = tasksRouter