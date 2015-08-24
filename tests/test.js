(function r(f) {
    document.addEventListener('DOMContentLoaded', f)
})(function () {
    describe('GameController', function () {
        beforeEach(module('app'));

        var $controller;

        beforeEach(inject(function (_$controller_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
        }));

        describe('$scope.isBefore', function () {
            it('checks if given date is before "Now"', function () {
                var $scope = {};
                var controller = $controller('GameController', {
                    $scope: $scope
                });
                expect($scope.isBefore(new Date('1999-01-01'))).toEqual(false);
            });
        });

        describe('$scope.isAfter', function () {
            it('checks if given date is after "Now"', function () {
                var $scope = {};
                var controller = $controller('GameController', {
                    $scope: $scope
                });
                expect($scope.isAfter(new Date('9999-01-01'))).toEqual(false);
            });
        });

        describe('$scope.isBetween', function () {
            it('checks if given date is between "Now"', function () {
                var $scope = {};
                var controller = $controller('GameController', {
                    $scope: $scope
                });
                expect($scope.isBetween(new Date('1999-01-01'), new Date('9999-01-01'))).toEqual(true);
            });
        });

    });
});
