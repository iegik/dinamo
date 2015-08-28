// An example configuration file.
exports.config = {
    // Homepage
    baseUrl: 'http://localhost:' + (process.env.PORT || 5000) + '/',

    directConnect: true,

    // Capabilities to be passed to the webdriver instance.
    multiCapabilities: [{
        'browserName': 'chrome'
    }, {
        'browserName': 'firefox'
    }],

    // Framework to use. Jasmine 2 is recommended.
    framework: 'jasmine2',

    // Spec patterns are relative to the current working directly when
    // protractor is called.
    specs: ['e2e/*_spec.js'],

    // Options to be passed to Jasmine.
    jasmineNodeOpts: {
        defaultTimeoutInterval: 5000
    }
};
