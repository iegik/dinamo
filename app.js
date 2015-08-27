/*jslint nomen: true*/
/*global process, require, angular, competitions, bets, $scope, __dirname, console, process*/
/*jslint white: false*/
/*jshint multistr: true*/

// Dependences
var Express = require("express"),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    marked = require('marked'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    passport = require('passport'),
    expressSession = require('express-session'),
    mongoose = require('mongoose'),
    MongoStore = require('connect-mongo')(expressSession),

    // Configuration
    port = process.env.PORT || 5000,
    port_ssl = process.env.PORT_SSL || 5001,
    certificate = {
        key: process.env.SSL_KEY,
        cert: process.env.SSL_CRT
    },
    db_path = process.env.DB_PATH,
    //jslint nomen: false

    // Some useful functions
    connectWithRetry = function () {
        return mongoose.connect(db_path, function (err) {
            if (err) {
                console.error('Failed to connect to mongo on startup - retrying in 5 sec', err);
                setTimeout(connectWithRetry, 5000);
            }
        });
    },

    // Express
    app = new Express();

connectWithRetry();
require('./config/passport')(passport); // pass passport for configuration

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(expressSession({
    secret: process.env.DINAMO_APP_SECRET || 'dinamo',
    //maxAge: new Date(Date.now() + 7 * 24 * 60 * 1000), // 1 week
    //ttl: 7 * 24 * 60 * 1000,
    store: new MongoStore({
        mongooseConnection: mongoose.connections[0]
    }),
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' === req.method) {
        res.send(200);
    } else {
        next();
    }
});
app.use(methodOverride());
app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));

app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use(Express.static(path.join(__dirname, 'public')));

//create node.js http server and listen on port
http.createServer(app).listen(port, function () {
    'use strict';
    console.log("HTTP server is listening on..." + port);
});

https.createServer(certificate, app).listen(port_ssl, function () {
    'use strict';
    console.log("HTTPS server is listening on..." + port_ssl);
});
