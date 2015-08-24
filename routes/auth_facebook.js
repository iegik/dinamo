// Dependences
var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    mongoose = require('mongoose'),
    FacebookStrategy = require('passport-facebook-canvas').Strategy,

    // Models
    User = require('../models/user');

//require('../config/passport')(passport, User, FacebookStrategy);

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    //User.findOne(user, function (err, user) {
    done(null, user);
    //});
});

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID || '1643623779198614',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '6a696fe94d3033dacde0c276901a1053',
        callbackURL: "https://" + (process.env.DOMAIN || 'localhost:5001') + "/auth/facebook",
        passReqToCallback: true
    },
    function (req, accessToken, err, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            var User = mongoose.model('Users');
            //profile = new User(profile);
            if (profile && profile.id === '582937557') {
                //profile.roles = (profile.roles || [] ).push({value:'admin'});
            }
            User.findOrCreate({
                provider: 'facebook',
                id: profile.id
            }, profile, function (err, user) {
                if (err) {
                    console.log(err);
                    return done(err);
                }
                done(null, user);
            });
        });
    }));

function authnOrAuthzFacebook(req, res, next) {
    if (!req.isAuthenticated()) {
        passport.authenticate('facebook-canvas', {
            successRedirect: '/',
            failureRedirect: '/auth/facebook/login'
        })(req, res, next);
    } else {
        passport.authorize('facebook-authz')(req, res, next);
    }
}

router.route('/login').get(authnOrAuthzFacebook);
//router.route('/').get(isAuthenticated);

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
//router.route('/').get(passport.authenticate('facebook-canvas', {
//  scope: ['email', 'publish_actions']
//}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.route('/').get(
    passport.authenticate('facebook-canvas', {
        successRedirect: '/',
        failureRedirect: '/login',
        scope: ['email', 'publish_actions']
    })
).post(passport.authenticate('facebook-canvas', {
    successRedirect: '/',
    failureRedirect: '/auth/facebook/canvas/autologin',
    scope: ['email', 'publish_actions']
}));
router.route('/canvas/autologin').get(function (req, res) {
    res.send('<!DOCTYPE html>' +
        '<body>' +
        '<script type="text/javascript">' +
        'console.log("Redirect from "+top.location.href+" to /auth/facebook");' +
        'top.location.href = "/auth/facebook/login";' +
        '</script>' +
        '</body>' +
        '</html>');
});

// Return router
module.exports = router;
