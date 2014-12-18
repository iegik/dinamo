/*global angular, competitions, bets, $scope, require, __dirname */
/*jslint white: false */

function dinamo_api_v2(options) {
  'use strict';
  var Express = require("express"),
    Datastore = require('nedb'),
    marked = require('marked'),
    XMLHttpRequest = require('xhr2'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    //CORS middleware
    allowCrossDomain = function (req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    },

    // parse application/x-www-form-urlencoded
    urlencodedParser = bodyParser.urlencoded({
      extended: false
    }),

    // parse application/json
    jsonParser = bodyParser.json(),

    app = new Express(),

    db = {
      "rates": new Datastore({
        filename: (options.dbpath || __dirname) + '/rates.db',
        autoload: true
      })
    };

  options.apipath = '/api';

  app.use(methodOverride());
  app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.use(allowCrossDomain);


  function s2() {
    // 1. Par iesniegtu prognozi +25
    //    За внесённый прогноз
    //    For the submitted prediction
    if (arguments[1]) {
      var a = arguments[0].split(':'), // x:y
        b = arguments[1].split(':'), // w:z
        x = a[0] * 1,
        y = a[1] * 1, // x:y

        w = b[0] * 1,
        z = b[1] * 1, // w:z

        s = 25;
      [
        // 2. Nav uzminēts rezultāts: -5
        //    Не угадан результат: -5
        //    Incorrectly guessed the result
        function f2(x, y, w, z) {
          return (x + ' ' + y === w + ' ' + z) ? 0 : -5;
        }, // Точный результат
        // 1:0 1:0 -> 0 | 1:0 3:3 -> -5 | 1:1 3:3 -> -5

        // 3. Nepareizi noteikts uzvaretajs vai neizšķirts: -5 ( #># && #># ) || (#?# && #=# )
        //    Неправильно угадан победитель или ничья: -5
        //    Incorrectly guessed the result or draw: -5
        function f3(x, y, w, z) {
          return ((x > y && w > z) || (x < y && w < z)) || !(f2(x, y, w, z) || (x >= y && w > z) || (x < y && w < z)) || (x === y && w === z) ? 0 : -5;
        }, // Правильный победитель или ничья 
        // 1:0 3:2 -> 0 | 1:0 2:3 -> -5 | 1:1 3:3 -> -5 | 1:0 3:3 -> -5

        // 4. Nepareizi noteikta vārtu starpība: -5
        //    Неправильно установлена разница мячей: -5
        //    Improperly installed goal difference: -5
        //      ,(x>y?x-y:y-x)==(w>z?w-z:z-w)?0:-5 // Разница мячей 
        function f4(x, y, w, z) {
          return !f2(x, y, w, z) || x - y === w - z ? 0 : -5;
        }, // Разница мячей
        // 1:0 3:2 -> 0 | 1:0 3:1 -> -5 | 1:1 3:3 -> 0

        // 5. Nepareizi noteikta vārtu starpība (par kātriem vārtiem): -1
        //    За каждое неверо угаданное очко: -1
        //    For every wrong guessed point: -1
        function f5(x, y, w, z) {
          var a = (x - y),
            b = (w - z);
          return !f2(x, y, w, z) || !f4(x, y, w, z) ? 0 : -Math.abs(a - b);
        }, // Разница в счёте
        // 1:0 3:2 -> 0 | 1:0 1:2 -> -2 | 1:0 3:4 -> -2 | 1:1 3:3 -> 0
        // Math.abs(x-w)+Math.abs(y-z)

        // 6. Par katru nepareizi noteikta katras komandas gūtu vārtu skaitu
        //    Для каждого неправильно угаданного количества голов полученных каждой командой
        //    For every wrong guessed amonut of goals each team received
        function f6(x, y, w, z) {
          return !f2(x, y, w, z) ? 0 : -(Math.abs(x - w) + Math.abs(y - z));
        } // Разница в счёте
        //       ,((x>y&&w>z)||w==z)?:-Math.abs(Math.abs(x-w)-Math.abs(y-z))
        // 1:0 3:2 -> -4 | 1:0 1:0 -> 0 | 1:0 1:2 -> -2 | 1:0 3:4 -> -6 | 1:1 3:3 -> -4
      ].forEach(function (v) {
        //console.log(v.name, v(x, y, w, z));
        return s += v(x, y, w, z);
      });
      // 7. Ja ir mazāk, neka 1 punkti: = 0
      //    Если осталось меньше чем 1 пункт: = 0
      s = s < 1 ? 0 : s;
      return s;
    }
    return 0;
  }

  app.all('/api', function (req, res) {
    res.redirect('/api/v2');
  });


  app.get('/', function (req, res) {
    return res.send((function () {
      /*
<!DOCTYPE html>
<html lang="en" data-ng-app="app">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css" rel="stylesheet" />
</head>

<body class="container" data-ng-controller="GameController" data-ng-init="getGames()">
  <header>
    <h1>Dinamo Bits</h1>
  </header>
  <div class="list-group">
    <div class="list-group-item" data-ng-repeat="game in games" data-ng-controller="RateController as rateCtrl">
      <h3> {{game.name}}<em class="pull-right badge">{{game.score}}</em></h3>
      <p>
        <em ng-show="game.location">{{game.starts | date:'EEE, MMM d, HH:mm'}}</em>
        <em ng-show="game.ends">- {{game.ends | date:'HH:mm'}}</em>
        <em ng-show="game.location" class="pull-right">{{game.location}}</em>
      </p>

      <div class="panel panel-default" ng-show="game.rates">
        <!-- Default panel contents -->
        <div class="panel-heading">Rates</div>

        <!-- Table -->
        <table class="table">
          <tr>
            <tr>
              <th>Name</th>
              <th width="3em">Rate</th>
              <th width="3em">Score</th>
            </tr>
            <tr ng-hide="game.rates.length" ng-repeat="rate in game.rates">
              <td>{{rate.name}}</td>
              <td>{{rate.value}}</td>
              <td>{{rate.score}}</td>
            </tr>
            <tr ng-show="game.rates.length">
              <td>{{game.rates.name}}</td>
              <td>{{game.rates.value}}</td>
              <td>{{game.rates.score}}</td>
            </tr>
          </tr>
        </table>
      </div>

      <form class="form-inline" role="form" data-ng-submit="rateCtrl.addRate(game);" data-ng-show="isPast(game.starts)">
        <div class="form-group">
          <div class="input-group">
            <label class="sr-only" for="exampleInputEmail2">Name</label>
            <input class="form-control" id="exampleInputEmail2" placeholder="Name" data-ng-model="rateCtrl.rate.name" />
          </div>
        </div>
        <div class="form-group">
          <label class="sr-only" for="exampleInputPassword2">Rate</label>
          <input class="form-control" id="exampleInputPassword2" placeholder="0:0" data-ng-model="rateCtrl.rate.value" />
        </div>
        <button type="submit" class="btn btn-primary">Vote</button>
      </form>

    </div>
  </div>
  <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.3.3/angular.min.js"></script>
  <script>
//FIXME: For tests only
var d = (new Date()),
  m = d.getDate(),
  d1,
  d2,
  d3;
d.setDate(m - 10);
d1 = d.toJSON();
d.setDate(m);
d2 = d.toJSON();
d.setDate(m + 10);
d3 = d.toJSON();

(function () {
  'use strict';
  var games = [],
    app = angular.module('app', []);
  app.controller('GameController', function ($scope, $http) {
    $scope.games = games;
    $scope.game = {};
    $scope.rate = {};
    $scope.isPast = function (date) {
      return new Date(date) > new Date();
    };
    $scope.getGames = function () {
      $http.get('/api/v2/games/').success(function (newgames) {
        $scope.games = newgames;
      });
    };
    $scope.init = function () {
      $scope.getGames();
    };
  });
  app.controller('RateController', function ($http) {
    this.rate = {};
    this.addRate = function (game) {
      $http.put('/api/v2/games/' + game.name + '/rates', this.rate).success(function () {
        game.rates = game.rates || [];
        if (Object.prototype.toString.call(game.rates) === '[object Object]') {
          game.rates = [game.rates, this.rate];
        } else {
          game.rates.push(this.rate);
        }
        this.rate = {};

      });
    };
  });
}());</script>
</body>

</html>
*/
    }).toString().match(/\*([^]*)\*/)[1]);
  });


  app.get('/api/v2', function (req, res) {
    return res.send(
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css" rel="stylesheet"/></head><body class="container">' +
      marked('# Dinamo API v2\n\
\n\
|                    | POST                 | GET           | PUT                               | DELETE              \n\
| ------------------ | -------------------- | ------------- | --------------------------------- | ------------------- \n\
| ```/api/v2/games```      | create a new game    | list games    | bulk update games                 | delete all games    \n\
| ```/api/v2/games/Dinamo%20R%20-%20CSKA``` | error | show ```Dinamo R - CSKA``` game | if exists update ```Dinamo R - CSKA```, else error | delete ```Dinamo R - CSKA```  \n\
| ```/api/v2/games/Dinamo%20R%20-%20CSKA/rates``` | create a new rate for the game | list rates of the game | bulk update rates for the game | delete all rates of the game \n\
| ```/api/v2/games/Dinamo%20R%20-%20CSKA/rates/Ģirts``` | error | show ```Ģirts``` rate | if exists update ```Ģirts``` rate, else error | delete ```Ģirts``` rate \n\
\n') +
      '<pre>' + JSON.stringify([{
        'name': 'Dinamo R - CSKA',
        'location': 'Arena Riga',
        'starts': new Date(2000),
        'ends': null,
        'rates': [
          {
            'name': 'XXXXXXX',
            'value': 'X:X',
            'score': 0
          }, // 6
  ],
        'scores': [
          {
            'time': new Date(1000),
            'value': '0:0'
          }
  ]
}], null, " ") +
      '</pre>\n' +
      (function () {
        /*
<script>
      // list rates
      var ajax = function (method, url, async, data){
        var ajax = new XMLHttpRequest;
        ajax.onreadystatechange = function(){
          if(this.readyState == 4){
            if(this.status == 200){
              console.log(JSON.parse(this.responseText));
            }else{
              console.error(this.status, this.responseText);
            }
          }
        }
	      ajax.open(method, url, async);
        ajax.dataType = "JSON";
        ajax.setRequestHeader("Content-type", "application/json");
        ajax.send(JSON.stringify(data));
        return ajax;
      }
</script>
<pre>
var d = (new Date()),m = d.getMinutes();d.setMinutes(0);d.setSeconds(0);
d.setMinutes(m-10);d1 = d.toJSON();
d.setMinutes(m);d2 = d.toJSON();
d.setMinutes(m+10);d3 = d.toJSON();
ajax("DELETE","/api/v2/games",  !1);
ajax("POST",  "/api/v2/games",  !1, {'name':'Dinamo R - CSKA',starts: d2, ends: d3, scores:[{time:d1,value:"0:0"}],'location': 'Arena Riga'});
ajax("POST",  "/api/v2/games",  !1, [{'name':'Dinamo R - Dinamo Mn',starts: d1,'location': 'Arena Riga'},{"name":"Dinamo R - LEV",'location': 'Stadion Lvov', starts: d3}]);
ajax("POST",  "/api/v2/games/Dinamo R - CSKA",  !1, {rates:[{name: 'Arturs', time:new Date(),value:"0:0"}]});
ajax("GET",   "/api/v2/games",  !1);       
ajax("GET",   "/api/v2/games/Dinamo R - CSKA",!1);
ajax("PUT",   "/api/v2/games",!1, {'starts': today+"19:00:00.000Z"});
ajax("PUT",   "/api/v2/games/Dinamo R - LEV",!1, {'starts': "2011-09-26T20:00:00.000Z"});
ajax("DELETE","/api/v2/games",  !1, [{"name": 'LEV'}, {"name":'Dinamo Mn'}]);
ajax("DELETE","/api/v2/games/Dinamo R - CSKA",  !1);

ajax("POST",  "/api/v2/games/Dinamo R - CSKA/rates",  !1, [{ 'name': 'Arturs', 'value':'1:1'},{ 'name': 'Toms', 'value':'3:0'},{ 'name': 'Rolands', 'value':'2:4'}]);
ajax("POST",  "/api/v2/games/Dinamo R - Dinamo Mn/rates",  !1, [{ 'name': 'Arturs', 'value':'3:1'}]);
ajax("GET",   "/api/v2/games/Dinamo R - CSKA/rates",  !1);       
ajax("GET",   "/api/v2/games/Dinamo R - CSKA/rates/Arturs",!1);
ajax("PUT",   "/api/v2/games/Dinamo R - CSKA/rates",!1, [{ 'name': 'Arturs', 'value':'2:2'},{"name":"Toms","value":"1:0"}]);
ajax("PUT",   "/api/v2/games/Dinamo R - CSKA/rates/Toms",!1, {"value":"1:3"});
ajax("PUT",   "/api/v2/games/Dinamo R - CSKA/rates/Ģirts",!1, {"value":"2:0"});
ajax("PUT",   "/api/v2/games/Dinamo R - LEV/rates/Ģirts",!1, {"value":"2:0"});
ajax("PUT",   "/api/v2/games/Dinamo R - Dinamo Mn/rates/Arturs",!1, {"value":"3:0"});
ajax("GET",   "/api/v2/games/Dinamo R - CSKA/rates",  !1);
ajax("GET",   "/api/v2/games/Dinamo R - Dinamo Mn/rates",  !1);       
      //ajax("DELETE","/api/v2/games/Dinamo R - CSKA/rates",  !1, {"name":"Arturs Jansons"});
      //ajax("DELETE","/api/v2/games/Dinamo R - CSKA/rates/Rolands",  !1, {"name":"Arturs Jansons"});
</pre>
*/
      }).toString().match(/\*([^]*)\*/)[1] +
      '</body></html>')
  });

  var toRegExpAll = function (items) {
    var i, v;
    for (i in items) {
      v = items[i];
      items[i] = {
        $regex: new RegExp(v)
      };
    }
  };

  (function GamesModel_v1(db) {
    /*
    db.remove({});
    db.find({},function (err, rates) {
      if(!err && !rates.length === true){
        db.insert([
          {
            'name':'Dinamo R - CSKA',
            'starts': '',
            'ends': ''
          }
        ]);
      }
    });
    */

    app.post('/api/v2/games', jsonParser, function (req, res) {
      console.log("POST:", req.url, req.body);

      if (!req.body) return res.sendStatus(400)

      return db.insert(req.body, function (err) {
        if (!err) {
          console.log("created");
          return res[req.query.callback ? 'jsonp' : 'send'](req.body);
        } else {
          return console.log(err);
        }
      });
    });

    app.get('/api/v2/games', function (req, res) {
      console.log("GET:", req.url);
      return db.find({}, {
        name: 1,
        starts: 1,
        ends: 1,
        location: 1,
        scores: 1,
        rates: 1
      }, function (err, games) {
        if (!err) {
          for (x in games) {
            if (games[x]['scores'] && games[x].scores.length)
              games[x].scores = games[x].scores[games[x].scores.length - 1];
          }
          return res[req.query.callback ? 'jsonp' : 'send'](games);
        } else {
          return console.log(err);
        }
      });
    });

    app.get('/api/v2/games/:name', function (req, res) {
      console.log("GET:", req.url);
      return db.find({
        $regex: {
          'name': req.params.name
        }
      }, {
        name: 1,
        starts: 1,
        ends: 1
      }, function (err, game) {
        if (!err) {
          return res[req.query.callback ? 'jsonp' : 'send'](game);
        } else {
          return console.log(err);
        }
      });
    });


    app.put('/api/v2/games', jsonParser, function (req, res) {
      console.log("PUT:", req.url, req.body);
      return db.update({}, {
        $set: req.body
      }, {
        multi: true
      }, function (err, numReplaced) {
        if (!err) {
          console.log("updated " + numReplaced + " rate(s)");
          return res[req.query.callback ? 'jsonp' : 'send'](numReplaced);
        } else {
          console.log(err);
        }
      });
    });

    app.put('/api/v2/games/:name', jsonParser, function (req, res) {
      console.log("PUT:", req.url, req.body);
      return db.update({
        'name': req.params.name
      }, {
        $set: req.body
      }, {}, function (err, numReplaced) {
        if (!err) {
          console.log("updated " + numReplaced + " rate(s)");
          return res[req.query.callback ? 'jsonp' : 'send'](numReplaced);
        } else {
          console.log(err);
        }
      });
    });

    app.delete('/api/v2/games', jsonParser, function (req, res) {
      console.log("DELETE:", req.url, req.body);

      var games = {};

      if (!req.body) return res.sendStatus(400)

      if (({}).toString.call(req.body) == "[object Array]") {
        req.body.forEach(toRegExpAll);
      } else {
        toRegExpAll(req.body);
      }

      return db.remove(games, {
        multi: true
      }, function (err, numRemoved) {
        if (!err) {
          console.log("removed " + numRemoved + " rate(s)");

          res[req.query.callback ? 'jsonp' : 'send'](numRemoved);
        } else {
          console.log(err);
        }
      });

    });

    app.delete('/api/v2/games/:name', jsonParser, function (req, res) {
      console.log("DELETE:", req.url);
      return db.remove({
        'name': req.params.name
      }, {}, function (err, numRemoved) {
        if (!err) {
          console.log("removed " + numRemoved + " rate(s)");
          return res[req.query.callback ? 'jsonp' : 'send'](numRemoved);
        } else {
          console.log(err);
        }
      });
    });
  })(db.rates);

  (function GamesRatesModel_v1(db) {

    /*
    db.remove({});
    db.find({},function (err, rates) {
      if(!err && !rates.length === true){
        db.insert([
          {
            'name':'Dinamo R - CSKA',
            'rates':[
             { 'name': 'Ģirts', 'value':'1:3','score':0}, // 6
             { 'name': 'Viesturs', 'value':'2:4','score':0}, //18
             { 'name': 'Renārs', 'value':'3:3','score':0}, // 4
             { 'name': 'Aivis', 'value':'1:4','score':0}, // 4
             { 'name': 'Aldis', 'value':'0:3','score':0}, // 8
             { 'name': 'Levics', 'value':'2:1','score':0}, // 8
             { 'name': 'Sergejs', 'value':'1:2','score':0}, // 4
             { 'name': 'Aleksejs', 'value':'1:4','score':0}, // 4
						],
						'scores':[
             {'time':'', 'value': '0:0'}
           ]
          }
        ]);
      }
    });
    */

    app.post('/api/v2/games/:name/rates', jsonParser, function (req, res) {
      var rates;
      console.log("POST:", req.url, req.body);
      if (!req.body) return res.sendStatus(400)

      return db.findOne({
        'name': req.params.name
      }, function (err, game) {
        if (!game) return res.sendStatus(400)
        if (new Date(game.starts) > Date()) return res.sendStatus(400);
        if (!err) {
          console.log("game found", game);

          var rates = [];
          var checkScore = function (rate) {
            console.log(game.scores);
            if (game.scores) {
              rate.score = s2(game.scores[game.scores.length - 1].value, rate.value);
            }
            rates.push(rate);
          }

          if (({}).toString.call(req.body) == "[object Array]") {
            for (var rate in req.body) {
              !req.body[rate] || checkScore(req.body[rate])
            };
          } else {
            checkScore(req.body);
          }

          console.log(rates);
          //req.body.score = s2(game.rates[game.rates.length-1].value, req.body.value);
          game.rates = rates;

          return db.update({
            name: req.params.name
          }, game, {
            upsert: true
          }, function (err, numReplaced) {
            if (!err) {
              console.log("created");
              return res.sendStatus(numReplaced);
            } else {
              return console.log(err);
            }
          });

        } else {
          return console.log(err);
        }
      });

    });

    app.get('/api/v2/games/:name/rates', function (req, res) {
      console.log("GET:", req.url, req.params.name);

      return db.findOne({
        'name': req.params.name
      }, {
        name: 1,
        rates: 1
      }, function (err, game) {
        console.log("game found", game);
        if (!game) return res.sendStatus(400)

        if (!err) {
          //return res[req.query.callback?'jsonp':'send'](game.rates.filter(function (score) {return score.name = ;}));
          return res[req.query.callback ? 'jsonp' : 'send'](game);
        } else {
          return console.log(err);
        }
      });
    });

    app.get('/api/v2/games/:name/rates/:username', function (req, res) {
      console.log("GET:", req.url, req.params.name);

      return db.findOne({
        'name': req.params.name,
        'rates.name': req.params.username
      }, {
        name: 1,
        rates: 1
      }, function (err, game) {
        console.log("game found", game);
        if (!game) return res.sendStatus(400)

        game.rates = game.rates ? game.rates.filter(function (rates) {
          return rates.name == req.params.username;
        }) : Array(null);

        if (!err) {
          return res[req.query.callback ? 'jsonp' : 'send'](game);
        } else {
          return console.log(err);
        }
      });
    });


    app.put('/api/v2/games/:name/rates', jsonParser, function (req, res) {
      console.log("PUT:", req.url, req.body);
      if (!req.body) return res.sendStatus(400)
      db.findOne({
        'name': req.params.name
      }, {
        _id: 1
      }, function (err, game) {
        if (!err) {
          console.log("found game: ", game);
          if (!game) return res.sendStatus(400);
          if (new Date(game.starts) > Date()) return res.sendStatus(400);
          var rates = [];
          var checkScore = function (rate) {
            console.log('scores: ', game.scores);
            if (game.scores) {
              rate.score = s2(game.scores[game.scores.length - 1].value, rate.value);
            }
            rates.push(rate);
          }

          if (({}).toString.call(req.body) == "[object Array]") {
            for (var rate in req.body) {
              !req.body[rate] || checkScore(req.body[rate])
            };
          } else {
            checkScore(req.body);
          }

          console.log('rates: ', rates);
          //req.body.score = s2(game.rates[game.rates.length-1].value, req.body.value);
          game.rates = rates;
          return db.update(game, {
            $set: {
              rates: req.body
            }
          }, {
            upsert: true
          }, function (err, numReplaced) {
            if (!err) {
              console.log("updated " + numReplaced + " rate(s)");
              return res[req.query.callback ? 'jsonp' : 'send'](numReplaced);
            } else {
              console.log(err);
            }
          });
        } else {
          console.log(err);
        }
      });
    });

    app.put('/api/v2/games/:name/rates/:username', jsonParser, function (req, res) {
      console.log("PUT:", req.url, req.body);
      if (!req.body) return res.sendStatus(400)
      req.body.name = req.params.username;
      db.findOne({
        $where: function () {
          return !this.starts
        },
        'name': req.params.name
      }, {
        _id: 1
      }, function (err, game) {
        if (!err) {
          console.log("found game: ", game);
          if (!game) return res.sendStatus(400)
          return db.update(game, {
            $set: {
              rates: req.body
            }
          }, {
            upsert: true
          }, function (err, numReplaced) {
            if (!err) {
              console.log("updated " + numReplaced + " rate(s)");
              return res[req.query.callback ? 'jsonp' : 'send'](numReplaced);
            } else {
              console.log(err);
            }
          });
        } else {
          console.log(err);
        }
      });
    });

    app.delete('/api/v2/games/:name/rates', jsonParser, function (req, res) {

      if (!req.body) return res.sendStatus(400)

      db.find({
        'name': req.params.name
      }, {
        rates: 1
      }, function (err, game) {
        if (!err) {
          console.log("found rates " + game.rates);
          var rates = game.rates;
          var deleteRate = function (rate) {
            var i, v;
            for (i in rate) {
              for (old_rate in rates) {
                for (j in old_rate) {
                  if ((new RegExp(rate[i])).match(old_rate[j]))
                    delete rates[i];
                }
              }
            }
          }

          if (({}).toString.call(req.body) == "[object Array]") {
            req.body.forEach(deleteRate);
          } else {
            deleteRate(req.body);
          }
          console.log("DELETE:", req.url);
          return db.put({
            'name': req.params.name
          }, {
            $set: {
              'rates': rates
            }
          }, {
            multi: true
          }, function (err, numRemoved) {
            if (!err) {
              console.log("removed " + Number(numRemoved) + " rate(s)");
              return res[req.query.callback ? 'jsonp' : 'send'](numRemoved);
            } else {
              console.log(err);
            }
          });

        } else {
          console.log(err);
        }
      })

    });

    app.delete('/api/v2/games/:name/rates/:username', jsonParser, function (req, res) {
      console.log("DELETE:", req.url);
      return db.remove({}, function (err, numRemoved) {
        if (!err) {
          console.log("removed " + numRemoved + " rate(s)");
          return res[req.query.callback ? 'jsonp' : 'send'](numRemoved);
        } else {
          console.log(err);
        }
      });
    });

  })(db.rates);

  return app;
};

//create node.js http server and listen on port
dinamo_api_v2({
  'dbpath': '/srv/dinamo'
}).listen(80);
console.log('listen on 80...');