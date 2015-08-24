describe('Dinamo homepage', function () {

    it('should show Sign in', function () {
        browser.get('/');

        expect($('.login-title').getText()).toBe('Sign in');
    });

});
