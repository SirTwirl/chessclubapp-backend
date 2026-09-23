const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const logger = require('./utils/logger')
const cors = require('cors')

const app = express()

logger.info('connecting to', config.MONGODB_URI)

const connectToDatabase = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI)
        logger.info('connected to MongoDB')
    } catch (error) {
        logger.error('error connecting to MongoDB:', error.message)
    }
}

connectToDatabase()

app.use(cors())
app.use(express.json())


module.exports = app