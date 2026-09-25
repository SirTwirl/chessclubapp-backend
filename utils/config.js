require('dotenv').config()
const cloudinary = require('cloudinary').v2
const PORT = process.env.PORT

const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? process.env.MONGODB_URI_TEST
  : process.env.MONGODB_URI

const SECRET = process.env.SECRET

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

module.exports = {
  PORT,
  MONGODB_URI,
  SECRET,
  cloudinary
}