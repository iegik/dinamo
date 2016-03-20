module.exports = function (err, user) {
    if (err) {
        return this(err);
    }
    this(null, user);
};
