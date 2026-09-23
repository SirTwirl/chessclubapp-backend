const usersRouter = require('express').Router()
const User = require('../models/user')

usersRouter.get('/', async (request, response) => {
  const { group } = request.query
  const filter = group ? { group } : {}

  const users = await User.find(filter)
  response.json(users)
})


module.exports = usersRouter
