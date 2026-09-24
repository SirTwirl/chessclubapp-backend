const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')

loginRouter.post('/', async (request, response) => {
    const {email, password} = request.body
    const user = await User.findOne({email})

    const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

    if(!(user && passwordCorrect)) {
        return response.status(401).json({
            error: 'invalid email or password'
        })
    }
    
    const userForToken = {
        email: user.email,
        id: user._id,
        role: user.role
    }

    const token = jwt.sign(userForToken, config.SECRET, {expiresIn: 60*30})

    response
    .status(200)
    .send({token, 
        email: user.email, 
        name: user.name,
        role: user.role
    })
})

module.exports = loginRouter