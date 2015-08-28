[![travis-ci](https://travis-ci.org/iegik/dinamo.svg?branch=master)](https://travis-ci.org/iegik/dinamo)
# Dinamo 
## Installation

```
npm install
npm start
```

## RESTful API

`/api`

### Security

![RESTful Security](./docs/RESTful%20security.gif?raw=true)

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