/* eslint-env node */
/*eslint node/no-extraneous-require: "off"*/
'use strict';
//
const $ = process.env;
const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const read = promisify(fs.readFile);
const apiDouble = require('@hashicorp/api-double');

const mergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');

const apiDoubleHeaders = require('@hashicorp/api-double/lib/headers');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

//
module.exports = {
  name: 'startup',
  serverMiddleware: function (server) {
    // TODO: see if we can move these into the project specific `/server` directory
    // instead of inside an addon

    // TODO: This should all be moved out into ember-cli-api-double
    // and we should figure out a way to get to the settings here for
    // so we can set this path name centrally in config
    // TODO: undefined here is a possible faker salt that we should be able
    // to pass in from ember serve/config somehow
    const dir = path.resolve('./mock-api');
    const controller = apiDouble(undefined, dir, read, $, path.resolve);
    [
      apiDoubleHeaders(),
      cookieParser(),
      bodyParser.text({ type: '*/*' }),
      controller().serve,
    ].reduce(function (app, item) {
      return app.use(item);
    }, server.app);
  },
  treeFor: function (name) {
    const tree = this._super.treeFor.apply(this, arguments);
    if (name === 'app') {
      if (['production', 'test'].includes(process.env.EMBER_ENV)) {
        return mergeTrees([tree, writeFile('components/debug/navigation/index.hbs', '')]);
      }
    }
    return tree;
  },
  contentFor: function (type, config) {
    const vars = {
      appName: config.modulePrefix,
      environment: config.environment,
      rootURL: config.environment === 'production' ? '{{.ContentPath}}' : config.rootURL,
      config: config,
      env: function (key) {
        if (process.env[key]) {
          return process.env[key];
        }
      },
    };
    switch (type) {
      case 'head':
        return require('./templates/head.html.js')(vars);
      case 'body':
        return require('./templates/body.html.js')(vars);
      case 'root-class':
        return 'ember-loading';
    }
  },
};
