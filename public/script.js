//FIXME: For tests only
var api = '/api';

(function () {
  'use strict';
  var games = [],
    app = angular.module('app', []);
  app.controller('GameController', function ($scope, $http, $window) {
    $scope.games = games;
    $scope.game = {};
    $scope.rate = {};
    $scope.user = {};
    $scope.isBefore = function (date) {
      return new Date(date) > new Date();
    };
    $scope.isBetween = function (from, until) {
      var now = new Date();
      return new Date(from) < now && (now < new Date(until) || !until);
    };
    $scope.isAfter = function (date) {
      return new Date(date) < new Date();
    };
    $scope.getGames = function () {
      $http.get(api + '/matches?populate=rates.user').success(function (games) {
        $scope.games = games;
      });
    };
    $scope.getUser = function () {
      $http.get(api + '/users/me').success(function (user) {
        $scope.user = user;
        $scope.getGames();
      });
    };
    $scope.addGame = function () {
      $window.console.log($scope.game);
      $http.post(api + '/matches', $scope.game).success(function (err) {
        $scope.game = {};
      });
    }
    $scope.removeGame = function (id) {
      $http.delete(api + '/matches/' + id).success(function (err) {});
    }
    $scope.isAdmin = function () {
      return !!$scope.user.roles && $scope.user.roles.indexOf('admin') >= 0;
    }

    $scope.init = $scope.getUser();
  });
  app.controller('RateController', function ($scope, $http, $window) {
    $scope.rate = {};
    $scope.addRate = function (game) {
      $scope.rate.user = $scope.user;
      $scope.rate.date = new Date();
      $http.put(api + '/matches/' + game._id + '/rates', $scope.rate).success(function () {
        if (game.rates && game.rates.filter) {
          game.rates = game.rates.filter(function (a) {
            return a.user._id !== $scope.user._id
          });
          game.rates.push($scope.rate);
        } else {
          if (game.rates && game.rates.user._id !== $scope.user._id) {
            game.rates = [game.rates, $scope.rate];
          } else {
            game.rates = $scope.rate;
          }
        }
        $scope.rate = {};
      });
    };
    $scope.score = {};
    $scope.addScore = function (game) {
      $http.put(api + '/matches/' + game._id + '/scores', $scope.score).success(function () {
        game.scores = game.scores || [];
        if (game.scores.push) {
          game.scores.push($scope.score);
        } else {
          game.scores = [game.scores, $scope.score];
        }
        $scope.score = {};
        $window.location.reload();
      });
    };
  });

})();