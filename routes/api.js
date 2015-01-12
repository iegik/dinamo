// Dependences
var express = require('express'),
  router = express.Router(),

  // Models
  //Product = require('../models/product'),
  User = require('../models/user'),
  Match = require('../models/match'),

  // As with any middleware it is quintessential to call next()
  // if the user is authenticated
  isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.sendStatus(401);
  },
  isAuthorized = function (req, res, next) {
    if (req.user._id === req.params.user_id) {
      return next();
    }
    res.sendStatus(403);
  },

  isAdmin = function (req, res, next) {
    if (req.user.roles.indexOf('admin') + 1) {
      return next();
    }
    res.sendStatus(403);
  },
  
  s2 = function () {
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
};

// Routes
//Product.methods(['get', 'put', 'post', 'delete']);
//Product.register(router, '/products')

User.methods(['get', 'put', 'post', 'delete'])
// Policy
User.before('get', isAuthenticated)
  .before('post', [isAuthenticated, isAdmin])
  .before('put', [isAuthenticated, isAdmin])
  .before('delete', [isAuthenticated, isAdmin]);
// Routes
User.route('me', function (req, res, next) {
    if (!req.user) {
      res.sendStatus('401');
    } else {
      res.send(req.user);
    }
  });
User.register(router, '/users');

Match.methods(['get', 'put', 'post', 'delete']);
// Policy
Match.before('get', isAuthenticated)
  .before('post', function(){
    if(!isAuthorized && !isAdmin){
      return res.sendStatus(403);
    }
  })
  .before('put', function(){
    if(!isAuthorized && !isAdmin){
      return res.sendStatus(403);
    }
  })
  .before('delete', function(){
    if(!isAuthenticated && !isAdmin){
      return res.sendStatus(403);
    }
  });
Match.after('get', function(req,res,next){
  if(!isAuthenticated && !isAdmin){
    return res.sendStatus(403);
  }
  // Secure User Information
  var x,y,z,match, select = function (arr, obj){
    var x,out = ({});
    for (x in obj){
      !(arr.indexOf(x)+1) || (out[x] = obj[x]);
    }
    return out;
  }
  for( x in res.locals.bundle){
    //res.locals.bundle[x] = select(['vs','rates'], res.locals.bundle[x]);
    if(res.locals.bundle[x] && res.locals.bundle[x].rates) for(y in res.locals.bundle[x].rates){
      res.locals.bundle[x].rates[y].user = select(['displayName'],res.locals.bundle[x].rates[y].user);
    }
  }
  next();
});
Match.register(router, '/matches');
router.route('/matches/:id/rates').get(function (req, res) {
  console.log("GET:", req.url, req.params.name);

  return Match.findOne({
    '_id': req.params.id
  }, {
    name: 1,
    rates: 1
  }, function (err, game) {
    console.log("game found", game);
    if (!game) return res.sendStatus(400);

    if (!err) {
      //return res[req.query.callback?'jsonp':'send'](game.rates.filter(function (score) {return score.name = ;}));
      return res[req.query.callback ? 'jsonp' : 'send'](game);
    } else {
      return console.log(err);
    }
  });
});
router.route('/matches/:id/rates').put([isAuthenticated], function (req, res) {
    console.log("PUT:", req.url, req.body, req.user.displayName);
    if (!req.body && !req.body.name && true) return res.sendStatus(400);
    var gameid = req.params.id,
      userid = req.user._id, // || req.body.name,
      userrate = req.body.value,
      now = (new Date()).toJSON();
    Match.update({
      _id: gameid,
      "rates.user": {
        $ne: userid
      },
      starts: {
        $gt: now
      }
    }, {
      $addToSet: {
        rates: {
          date: now,
          user: userid,
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

router.route('/matches/:id/scores').put([isAuthenticated], function (req, res) {
    console.log("PUT:", req.url, req.body);
    if (!req.body && !req.body.user && true) {
      return res.sendStatus(400);
    }
    var gameid = req.params.id,
      scorevalue = req.body.value;
    Match.findOne({
      _id: gameid,
      "scores.value": {
        $ne: scorevalue
      }
    }, {
      rates: 1
    }, function (err, game) {
      if (!err && game && true) {
        var i, rates = game.rates;
        if(rates.length){
          for (i in rates) {
            if(rates[i].value){
              game.rates[i].score = s2(scorevalue, rates[i].value);
            }
          }
        }else{
          game.rates.score = s2(scorevalue, rates.value);
        }
        Match.update({
          _id: gameid,
          "scores.value": {
            $ne: scorevalue
          }
        }, {
          $push: {
            scores: {
              date: (new Date()).toJSON(),
              value: scorevalue
            }
          }, 
          rates: game.rates
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

// Return router
module.exports = router;