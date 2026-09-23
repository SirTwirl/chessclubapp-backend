const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')
const usersRouter = require('./controllers/users')
const cors = require('cors')
const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

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
app.use(middleware.requestLogger)

app.use('/api/users', usersRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)


module.exports = app