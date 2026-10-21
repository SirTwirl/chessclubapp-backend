const mongoose = require('mongoose')

const homeworkAnswerSchema = new mongoose.Schema({
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
    content: {
        type: String,
        required: function() {
            return !this.imageUrl
        }
    },
    imageUrl: {
        type: String,
        required: false
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['submitted', 'accepted', 'rejected', 'in_progress', 'completed'],
        default: 'submitted'
    }
})

homeworkAnswerSchema.index({ task: 1, student: 1 }, { unique: true })

homeworkAnswerSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        returnedObject.answer = returnedObject.content
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = mongoose.model('HomeworkAnswer', homeworkAnswerSchema)
