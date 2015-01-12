// Dependencies
var restful = require('node-restful'),
  findOrCreate = require('mongoose-findorcreate'),
  bcrypt = require('bcrypt-nodejs'),
  mongoose = restful.mongoose,

  // Schema
  nameSchema = new mongoose.Schema({
    familyName: String,
    givenName: String,
    middleName: String
  }),
  mailSchema = new mongoose.Schema({
    value: String,
    type: String
  }),
  photoSchema = new mongoose.Schema({
    value: String
  }),
  roleSchema = new mongoose.Schema({
    value: String
  }),
  profileSchema = new mongoose.Schema({
    id: String,
    token: String,
    displayName: String,
    name: Object,
    emails: [mailSchema],
    photos: [photoSchema],
    username: String,
    gender: String,
    profileUrl: String,
  }),  
  userSchema = new mongoose.Schema({
    // Display data
    displayName: String,
    name: Object,
    emails: [mailSchema],
    photos: [photoSchema],
    username: String,
    password: String,
    gender: String,
    profileUrl: String,
    // Security
    roles: [roleSchema],
    // Social
    facebook: Object,
    twitter: Object,
    google: Object
  });

userSchema.plugin(findOrCreate);
// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.local.password);
};

// Return model
module.exports = restful.model('Users', userSchema)