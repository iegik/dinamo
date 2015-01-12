# Dinamo 
## Installation

```
npm install
npm start
```

## RESTful API

`/api`

### [_] Security

![RESTful Security](./docs/RESTful%20security.gif)

- Authorization with Facebook
- Authentication by username
- Permission check for admins

### [_] Users

`/users/:username`

### [_] Seasons

`/seasons/range/:range`

### [_] Matches

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


### [_] Rates

`/seasons/:range/matches/:vs/rates/:username`

### [_] Teams

`/teams/:teamname`
`/teams/:teamname/users/:username`