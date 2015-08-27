// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth': {
        'clientID': process.env.FACEBOOK_APP_ID || '1643623779198614',
        'clientSecret': process.env.FACEBOOK_APP_SECRET || '6a696fe94d3033dacde0c276901a1053',
        'callbackURL': 'https://' + (process.env.DOMAIN || 'localhost:5001') + '/auth/facebook'
    },

    'twitterAuth': {
        'consumerKey': process.env.TWITTER_APP_ID || 'xvz1evFS4wEEPTGEFPHBog',
        'consumerSecret': process.env.TWITTER_APP_SECRET || 'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg',
        'callbackURL': 'https://' + (process.env.DOMAIN || 'localhost:5001') + '/auth/twitter/callback'
    },

    'googleAuth': {
        'clientID': process.env.GOOGLE_APP_ID || 'your-client-id-here',
        'clientSecret': process.env.GOOGLE_APP_SECRET || 'your-client-secret-here',
        'callbackURL': 'https://' + (process.env.DOMAIN || 'localhost:5001') + '/auth/google/callback'
    }

};
