const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    }
})

attendanceSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

attendanceSchema.index({ user: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('Attendance', attendanceSchema)