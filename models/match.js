// Dependencies
var restful = require('node-restful'),
    mongoose = restful.mongoose,

    User = require('./../models/user'),
    userSchema = mongoose.model('Users'),
    // Schema
    rateSchema = new mongoose.Schema({
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "Users"
        },
        date: Date,
        value: String,
        score: Number
    }),
    scoreSchema = new mongoose.Schema({
        time: Date,
        value: String
    }),
    matchSchema = new mongoose.Schema({
        "vs": String,
        "location_name": String,
        "starts": Date,
        "ends": Date,
        "rates": [rateSchema],
        "scores": [scoreSchema]
    });

// Return model
module.exports = restful.model('Matches', matchSchema)
