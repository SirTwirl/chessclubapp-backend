const usersRouter = require('express').Router()
const User = require('../models/user')
const { userExtractor, requireRole } = require('../utils/middleware')

usersRouter.get('/me', userExtractor, async (request, response) => {
  const user = request.user

  if (!user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  response.json(user)
})

usersRouter.get('/', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
  const { group } = request.query
  const filter = group ? { group } : {}

  const users = await User.find(filter)
  response.json(users)
})

usersRouter.get('/coaches', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
  const users = await User.find({ role: 'coach' })
  response.json(users)
})

usersRouter.get('/parents', userExtractor, requireRole('coach', 'admin'), async (request, response) => {
  const users = await User.find({ role: 'parent' })
  response.json(users)
})


module.exports = usersRouter
