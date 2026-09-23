const mongoose = require('mongoose')

const taskStatusSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in progress', 'completed'],
        default: 'pending'
    }
})

taskStatusSchema.index({ task: 1, student: 1 }, { unique: true })

taskStatusSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = mongoose.model('TaskStatus', taskStatusSchema)