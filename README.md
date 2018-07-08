[![travis-ci](https://travis-ci.org/iegik/dinamo.svg?branch=master)](https://travis-ci.org/iegik/dinamo)
[![bitHound Overall Score](https://www.bithound.io/github/iegik/dinamo/badges/score.svg)](https://www.bithound.io/github/iegik/dinamo)
[![](https://codescene.io/projects/3053/status.svg) Get more details at **codescene.io**. ](https://codescene.io/projects/3053/jobs/latest-successful/results)

# Dinamo 
## Installation

```
npm install
npm start
```

## RESTful API

`/api`

### Security

![RESTful Security](https://raw.githubusercontent.com/iegik/dinamo/master/docs/RESTful%20Security.gif)

- Authorization with Facebook
- Authentication by username
- Permission check for admins

### Users

`/users/:username`

### Seasons

`/seasons/range/:range`

### Matches

`/seasons/range/:range/matches/vs/:vs`
`/matches/vs/:vs/season/range/:range`

```
# POST
curl -ik -X POST http://localhost:5000/api/matches\
  -H "Content-Type: application/json"\
  -H "Accept: application/json"\
  -H "Accept-Language: en"\
  -H "Accept-Encoding: gzip"\
  -d "{\
    \"vs\": \"Foo - Bar\",\
    \"location_name\": \"Taz\",\
    \"starts\": \"2015-01-07T12:00\",\
    \"ends\": \"2015-01-07T12:00\"\
  }"\

```

```
#PUT
curl -i -X PUT http://localhost:5000/api/matches/54ad8fc0e1baee456a272e0c\
  -H "Content-Type: application/json"\
  -H "Accept: application/json"\
  -H "Accept-Language: en"\
  -H "Accept-Encoding: gzip"\
  -d  "{\
    \"starts\": \"2015-01-07T23:30\",\
    \"ends\": \"2015-01-08T00:00\"\
}"\
```


### Rates

`/seasons/:range/matches/:vs/rates/:username`

### Teams

`/teams/:teamname`
`/teams/:teamname/users/:username`
