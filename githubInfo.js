'use strict';

/*
 Connects to public github api.
 The username and (optionally) minStars should be provided via query params
 */

var request = require('request'),
  waterfall = require('async').waterfall,
  _ = require('lodash');

module.exports = function (ctx, done) {

  // fetch username to query & optionally minimum star count
  // quick hack, limited validation
  var username = ctx.data.username,
    minStars = ctx.data.minStars || 1;

  if (!username) {
    return done('username is required - must be the github username to query');
  }

  if (!_.isNumber(minStars) || minStars < 0) {
    return done('Illegal minStars - must be integer greater than or equal to zero');
  }

  waterfall([

    function getUserInfo(done) {

      request({
        method: 'GET',
        url: 'https://api.github.com/users/' + username,
        headers: {
          'User-Agent': 'request'
        }
      }, function (error, response, body) {

        if (error) {
          return done(error);
        }
        if (response.statusCode !== 200) {
          return done('Incorrect http response code: ' + response.statusCode);
        }
        // parse out required attributes
        var userInfo = JSON.parse(body);
        done(null, {name: userInfo.name, location: userInfo.location, email: userInfo.email});
      });

    },
    function getUserRepos(user, done) {
      request({
        method: 'GET',
        url: 'https://api.github.com/users/' + username + '/repos?per_page=100',
        headers: {
          'User-Agent': 'request'
        }
      }, function (error, response, body) {

        if (error) {
          return done(error);
        }
        if (response.statusCode !== 200) {
          return done('Incorrect http response code: ' + response.statusCode);
        }
        // filter and transform repo data to required format
        var reposInfo = JSON.parse(body),
          repos = _(reposInfo)
            .filter({fork: false, private: false})
            .filter(function (repo) {
              return repo.stargazers_count >= minStars;
            })
            .map(function (repo) {
              return {name: repo.full_name, stars: repo.stargazers_count};
            })
            .value();

        done(null, {user: user, repos: repos});

      });
    }
  ], function (error, data) {
    // final callback, return error or result
    return (error) ? done(error) : done(null, data);
  });

};
