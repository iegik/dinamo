// Dependences
var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    action_authenticate = ({
        scope: ['email', 'publish_actions'],
        successRedirect: '/#profile', // redirect to the secure profile section
        failureRedirect: '/#login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }),
    action_authorize = ({
        successRedirect: '/#profile', // redirect to the secure profile section
        failureRedirect: '/#connect', // redirect back to the signup page if there is an error
    });

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
// normal routes ===============================================================

// LOGOUT ==============================
router.route('/logout').get(function (req, res) {
    req.logout();
    res.redirect('/');
});

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

// locally --------------------------------
// process the login form
router.route('/local').post(passport.authenticate('local-login', action_authenticate));

// facebook -------------------------------

// send to facebook to do the authentication
router.route('/facebook')
    .get(passport.authenticate('facebook', action_authenticate))
    .post(passport.authenticate('facebook', action_authenticate));

// twitter --------------------------------

// send to twitter to do the authentication
router.route('/twitter').get(passport.authenticate('twitter', action_authenticate));


// google ---------------------------------

// send to google to do the authentication
router.route('/google').get(passport.authenticate('google', action_authenticate));

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

// locally --------------------------------
router.route('/local/connect').post(passport.authenticate('local-signup', action_authorize));

// facebook -------------------------------

// handle the callback after facebook has authorized the user
router.route('/facebook/connect').get(passport.authorize('facebook', action_authorize));

// twitter --------------------------------

// send to twitter to do the authentication
router.route('/twitter/connect').get(passport.authorize('twitter', action_authorize));


// google ---------------------------------

// send to google to do the authentication
router.route('/google/connect').get(passport.authorize('google', action_authorize));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

// local -----------------------------------
router.route('/local/unlink').get(function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
        res.redirect(action_authenticate.successRedirect);
    });
});

// facebook -------------------------------
router.route('/facebook/unlink').get(function (req, res) {
    var user = req.user;
    user.facebook.token = undefined;
    user.save(function (err) {
        res.redirect(action_authenticate.successRedirect);
    });
});

// twitter --------------------------------
router.route('/twitter/unlink').get(function (req, res) {
    var user = req.user;
    user.twitter.token = undefined;
    user.save(function (err) {
        res.redirect(action_authenticate.successRedirect);
    });
});

// google ---------------------------------
router.route('/google/unlink').get(function (req, res) {
    var user = req.user;
    user.google.token = undefined;
    user.save(function (err) {
        res.redirect(action_authenticate.successRedirect);
    });
});

module.exports = router;
