const logger = require('./logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const config = require('./config')

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.code === 11000) {
    const fields = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'field'
    return response.status(400).json({ error: `${fields} must be unique` })
  } else if(error.name === 'JsonWebTokenError') {
    return response.status(401).json({error: 'invalid token'})
  } else if (error.name === 'TokenExpiredError') {
  return response.status(401).json({ error: 'token expired' })
}

  next(error)
}

const userExtractor = async (request, response, next) => {
  if(request.token) {
    const decodedToken = jwt.verify(request.token, config.SECRET)
    if(decodedToken.id) {
      request.user = await User.findById(decodedToken.id)
    }
  } else {
    request.user = null
  }
  next()
}

const tokenExtractor = async (request, response, next) => {
  const authorization = request.get('authorization')
  if(authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7)
  } else {
    request.token = null
  }
  next()
}

const requireRole = (...allowedRoles) => {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: 'You do not have permission to fetch users' })
    }

    next()
  }
}

module.exports = {
  unknownEndpoint,
  requestLogger,
  errorHandler,
  userExtractor,
  tokenExtractor,
  requireRole
}