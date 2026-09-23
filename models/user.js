const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    passwordHash: {
        type: String,
        required: true
    },
    name: String,
    surname: String,
    age: Number,
    telephone: String,
    role: {
      type: String,
      enum: ['student', 'parent', 'coach', 'admin'],
      required: true
    },
    group: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: function() {
            return this.role === 'student'
        },
        validate: {
            validator: function(value) {
                if (this.role !== 'student') {
                    return value === undefined || value === null
                }
                return true
            }, 
            message: 'Coaches and admins cannot be assigned to a group'
        }
    },
    children: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        required: function() {
            return this.role === 'parent'
        },
        validate: {
            validator: function(value) {
                if(this.role !== 'parent') {
                    return !value || value.length === 0
                }
                return true
            },
            message: 'Only parents can be assigned to children'
        }
    }
})

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.passwordHash
    }
})

module.exports = mongoose.model('User', userSchema)
