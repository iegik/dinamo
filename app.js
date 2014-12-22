/*global angular, competitions, bets, $scope, require, __dirname */
/*jslint white: false */

function dinamo_api_v2(options) {
  'use strict';
  var Express = require("express"),
    DatastoreNoSQL = require('nedb'),
    DatastoreSQL = require('pg'),
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
      "rates": new DatastoreNoSQL({
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
  app.all(allowCrossDomain);


  function s2() {
    // s2(game_score, user_rate)
    // 1. Par iesniegtu prognozi +25
    //    За внесённый прогноз
    //    For the submitted prediction
    // 2. Nav uzminēts rezultāts: -5
    //    Не угадан результат: -5
    //    Incorrectly guessed the result
    var f2 = function (x, y, w, z) {
        return (x + ' ' + y === w + ' ' + z) ? 0 : -5;
      }, // Точный результат
      // 1:0 1:0 -> 0 | 1:0 3:3 -> -5 | 1:1 3:3 -> -5

      // 3. Nepareizi noteikts uzvaretajs vai neizšķirts: -5 ( #># && #># ) || (#?# && #=# )
      //    Неправильно угадан победитель или ничья: -5
      //    Incorrectly guessed the result or draw: -5
      f3 = function (x, y, w, z) {
        return ((x > y && w > z) || (x < y && w < z)) || !(f2(x, y, w, z) || (x >= y && w > z) || (x < y && w < z)) || (x === y && w === z) ? 0 : -5;
      }, // Правильный победитель или ничья 
      // 1:0 3:2 -> 0 | 1:0 2:3 -> -5 | 1:1 3:3 -> -5 | 1:0 3:3 -> -5

      // 4. Nepareizi noteikta vārtu starpība: -5
      //    Неправильно установлена разница мячей: -5
      //    Improperly installed goal difference: -5
      //      ,(x>y?x-y:y-x)==(w>z?w-z:z-w)?0:-5 // Разница мячей 
      f4 = function (x, y, w, z) {
        return !f2(x, y, w, z) || x - y === w - z ? 0 : -5;
      }, // Разница мячей
      // 1:0 3:2 -> 0 | 1:0 3:1 -> -5 | 1:1 3:3 -> 0

      // 5. Nepareizi noteikta vārtu starpība (par kātriem vārtiem): -1
      //    За каждое неверо угаданное очко: -1
      //    For every wrong guessed point: -1
      f5 = function (x, y, w, z) {
        var a = (x - y),
          b = (w - z);
        return !f2(x, y, w, z) || !f4(x, y, w, z) ? 0 : -Math.abs(a - b);
      }, // Разница в счёте
      // 1:0 3:2 -> 0 | 1:0 1:2 -> -2 | 1:0 3:4 -> -2 | 1:1 3:3 -> 0
      // Math.abs(x-w)+Math.abs(y-z)

      // 6. Par katru nepareizi noteikta katras komandas gūtu vārtu skaitu
      //    Для каждого неправильно угаданного количества голов полученных каждой командой
      //    For every wrong guessed amonut of goals each team received
      f6 = function (x, y, w, z) {
        return !f2(x, y, w, z) ? 0 : -(Math.abs(x - w) + Math.abs(y - z));
      }, // Разница в счёте
      //       ,((x>y&&w>z)||w==z)?:-Math.abs(Math.abs(x-w)-Math.abs(y-z))
      // 1:0 3:2 -> -4 | 1:0 1:0 -> 0 | 1:0 1:2 -> -2 | 1:0 3:4 -> -6 | 1:1 3:3 -> -4
      a,
      b,
      x,
      y,
      w,
      z,
      s = 25;
    if (arguments[1]) {
      a = arguments[0].split(':'); // x:y
      b = arguments[1].split(':'); // w:z
      x = a[0] * 1;
      y = a[1] * 1; // x:y

      w = b[0] * 1;
      z = b[1] * 1; // w:z

      [f2, f3, f4, f5, f6].forEach(function (v) {
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
  <style>
    .list-group-item {
      background-color: transparent;
    }
    .list-group {
      position: relative;
      z-index: 1;
    }
    .list-group::before {
      content: '\00a0';
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
    }
    .list-group::before {
      background-color: rgba(255, 255, 255, .5);
    }
    #videobg {
      background: #761c23;
      background-image: radial-gradient(rgba(0, 0, 0, .8), rgba(0, 0, 0, 0));
      position: absolute;
      right: 0;
      bottom: 0;
      min-width: 164%;
      min-height: 164%;
      margin: -32%;
      width: auto;
      height: auto;
      z-index: -1;
    }
    header {
      color: gainsboro;
      text-transform: uppercase;
      font-family: 'Trebuchet MS', Helvetica, sans-serif
    }
    h1 {
      padding-top: .5em;
    }
  </style>
</head>

<body style="overflow-x: hidden;">
  <div class="container" data-ng-controller="GameController" data-ng-init="getGames()">
    <header>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM8AAACYCAYAAABDCr0QAAAAGXRFWHRTb2Z0d2Fy
ZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAA
AAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5U
Y3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6
eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8w
Mi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRw
Oi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpE
ZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5h
ZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRv
YmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0
dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1l
bnRJRD0ieG1wLmRpZDowMTEzQkEyNEZEOTlFMjExQjhBQkREOEIyOUVFMDM5OCIg
eG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpEMzA4ODM3MEI3RUIxMUUyOTk1RUZE
QTI3NjA3MkZDQiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpEMzA4ODM2RkI3
RUIxMUUyOTk1RUZEQTI3NjA3MkZDQiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQ
aG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6
aW5zdGFuY2VJRD0ieG1wLmlpZDo4NzREQThERkJBQjNFMjExQkVEM0M2M0FDN0FD
QTVGRCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowMTEzQkEyNEZEOTlFMjEx
QjhBQkREOEIyOUVFMDM5OCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRG
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
" style="float:left; height: 6em; padding: 0 .5em 0 0" />
      <h1>Dinamo Riga</h1>
      <p>Game rates</p>
    </header>
    <div class="list-group">
      <div class="list-group-item" data-ng-repeat="game in games" data-ng-controller="RateController as rateCtrl">
        <h3>{{game.name}}<em class="pull-right badge">{{game.score}}</em></h3>
        <p>
          <i class="glyphicon glyphicon-calendar"></i>
          <em ng-show="game.starts">{{game.starts | date:'EEE, MMM d, HH:mm'}}</em>
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
                <th style="width:10em">Date</th>
                <th>Name</th>
                <th style="width:3em">Rate</th>
                <th style="width:3em">Score</th>
              </tr>
              <tr ng-show="game.rates.length" ng-repeat="rate in game.rates">
                <td>{{rate.date | date:'EEE, MMM d, HH:mm'}}</td>
                <td>{{rate.name}}</td>
                <td>{{rate.value}}</td>
                <td>{{rate.score}}</td>
              </tr>
              <tr ng-hide="game.rates.length">
                <td>{{game.rates.date | date:'EEE, MMM d, HH:mm'}}</td>
                <td>{{game.rates.name}}</td>
                <td>{{game.rates.value}}</td>
                <td>{{game.rates.score}}</td>
              </tr>
            </tr>
          </table>
        </div>

        <form class="form-inline" role="form" data-ng-submit="rateCtrl.addRate(game);" data-ng-show="isPast(game.starts)">
          <p class="alert bg-warning text-warning">Pēc datu ievādīšanas, nospiediet "Refresh"; Lapa nerefrešojas automatiski. Gārumzīmes nedarbojas, lūdzu nelietot.</p>
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

        <form class="form-inline" role="form" data-ng-submit="rateCtrl.addScore(game);" data-ng-show="isFuture(game.starts)" data-ng-show="isFuture(game.ends)">
          <div class="form-group">
            <label class="sr-only" for="exampleInputPassword2">Game score</label>
            <input class="form-control" id="exampleInputPassword2" placeholder="0:0" data-ng-model="rateCtrl.score.value" />
          </div>
          <button type="submit" class="btn btn-primary">Add</button>
        </form>

      </div>
    </div>
  </div>
  <div id="videobg" class="hidden-xs"></div>
  <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.3.3/angular.min.js"></script>
  <script>
    //FIXME: For tests only
    var api = '/api/v2';

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
        $scope.isFuture = function (date) {
          return new Date(date) < new Date();
        };
        $scope.getGames = function () {
          $http.get(api + '/games').success(function (newgames) {
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
          $http.put(api + '/games/' + game.name + '/rates', this.rate).success(function () {
            game.rates = game.rates || [];
            if (Object.prototype.toString.call(game.rates) === '[object Object]') {
              game.rates = [game.rates, this.rate];
            } else {
              game.rates.push(this.rate);
            }
            this.rate = {};
          });
        };
        this.score = {};
        this.addScore = function (game) {
          $http.put(api + '/games/' + game.name + '/scores', this.score).success(function () {
            game.scores = game.scores || [];
            if (Object.prototype.toString.call(game.scores) === '[object Object]') {
              game.scores = [game.scores, this.score];
            } else {
              game.scores.push(this.score);
            }
            this.score = {};
          });
        };
      });
    }());

    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

     // 3. This function creates an <iframe> (and YouTube player)
     //    after the API code downloads.
    var player;

    function onYouTubeIframeAPIReady() {
      console.log('ready');
      player = new YT.Player('videobg', {
        height: '390',
        width: '640',
        videoId: '6uE2-GU-X-Y',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'loop': 1,
          'modestbranding': 1,
          'showinfo': 0,
          'iv_load_policy': 3,
          'rel': 0
        },
        events: {
          'onReady': function (event) {
            //var player = event.target
            player.playVideo();
            // Mute!
            player.mute();
            player.setVolume(0);
          }
        }
      });
    }
  </script>
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

  function RatesModel_NoSQL_v1(db) {
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
      return db.find({}).sort({
        starts: 1
      }).exec(function (err, games) {
        var x;
        if (!err) {
          for (x in games) {
            if (games[x]['scores'] && games[x].scores.length)
              games[x].score = games[x].scores[games[x].scores.length - 1].value;
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
        }
        /*, {
        name: 1,
        starts: 1,
        ends: 1
      }*/
        , function (err, game) {
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
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numReplaced));
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
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numReplaced));
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

          res[req.query.callback ? 'jsonp' : 'send'](Object(numRemoved));
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
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numRemoved));
        } else {
          console.log(err);
        }
      });
    });

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
    */

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
      if (!req.body && !req.body.name === true) return res.sendStatus(400)
      var gamename = req.params.name,
        username = req.body.name,
        userrate = req.body.value,
        now = (new Date()).toJSON();
      db.update({
        name: gamename,
        "rates.name": {
          $ne: username
        },
        starts: {
          $gt: now
        }
      }, {
        $push: {
          rates: {
            date: now,
            name: username,
            value: userrate
          }
        }
      }, {}, function (err, numReplaced) {
        if (!err) {
          console.log("updated " + numReplaced + " rate(s)");
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numReplaced));
        } else {
          console.log(err);
        }
      });
    });

    app.put('/api/v2/games/:name/scores', jsonParser, function (req, res) {
      console.log("PUT:", req.url, req.body);
      if (!req.body && !req.body.name === true) {
        return res.sendStatus(400);
      }
      var gamename = req.params.name,
        scorevalue = req.body.value;
      db.findOne({
        name: gamename,
        "scores.value": {
          $ne: scorevalue
        }
      }, {
        rates: 1
      }, function (err, game) {
        if (!err) {
          var i, rates = game.rates;
          for (i in rates) {
            rates[i].score = s2(scorevalue, rates[i].value);
          }
          db.update({
            name: gamename,
            "scores.value": {
              $ne: scorevalue
            }
          }, {
            $push: {
              scores: {
                date: (new Date()).toJSON(),
                value: scorevalue
              }
            }
          }, {}, function (err, numReplaced) {
            if (!err) {
              console.log("updated " + numReplaced + " rate(s)");
              return res[req.query.callback ? 'jsonp' : 'send'](Object(numReplaced));
            } else {
              console.log(err);
            }
          });
        } else {
          return res.sendStatus(400);
        }
      });
    });

    /*
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
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numReplaced));
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
          return res[req.query.callback ? 'jsonp' : 'send'](Object(numRemoved));
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
    return res[req.query.callback ? 'jsonp' : 'send'](Object(numRemoved));
  } else {
    console.log(err);
  }
});
});
*/

  };
  RatesModel_NoSQL_v1(db.rates);

  var RatesModel_SQL_v1 = function (err, client, done) {
    if (!err) {
      app.post('/api/v2/games', jsonParser, function (req, res) {
        console.log("POST:", req.url, req.body);

        if (!req.body) return res.sendStatus(400)

        return client.query('INSERT INTO "dB".rates SELECT * FROM json_populate_record( NULL::"dB".rates, ' + req.body + ' )', function (err) {
          if (!err) {
            console.log("created");
            return res[req.query.callback ? 'jsonp' : 'send'](req.body);
          } else {
            return console.log(err);
          }
        });
      });

      client.query('SELECT * FROM "dB".rates', function (err, result) {
        done();
        if (err) {
          console.error(err);
          response.send("Error " + err);
        } else {
          response.send(result.rows);
        }
      });
    } else {
      console.warn("Postgres SQL is not supported:", err);
    }
  }

  //DatastoreSQL.connect(process.env.DATABASE_URL, RatesModel_SQL_v1);

  return app;
};

//create node.js http server and listen on port
dinamo_api_v2({
  'dbpath': './'
}).listen(process.env.PORT || 5000);
console.log('listen on 80...');