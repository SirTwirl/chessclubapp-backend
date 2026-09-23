const usersRouter = require('express').Router()
const User = require('../models/user')

usersRouter.get('/', async (request, response) => {
  const { group } = request.query
  const filter = group ? { group } : {}

  const users = await User.find(filter)
  response.json(users)
})

usersRouter.get('/coaches', async (request, response) => {
  const users = await User.find({ role: 'coach' })
  response.json(users)
})

usersRouter.get('/parents', async (request, response) => {
  const users = await User.find({ role: 'parent' })
  response.json(users)
})


module.exports = usersRouter
