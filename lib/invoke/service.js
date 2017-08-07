'use strict';

const BbPromise = require('bluebird');
const chalk = require('chalk');
const request = require('request-promise');
const _ = require('lodash');

const invokeService = {

  invokeFunction(functionName) {
    const cli = this.serverless.cli;
    return this.getWebtask(functionName).then(webtask => {
      if (!webtask) {
        return this.getFunctionObject(functionName).then(functionObject => {
          const ServerlessError = this.serverless.classes.Error;
          throw new ServerlessError(`Function '${functionName}' is not deployed.`);
        });
      }

      return this.getInvokeOptions(functionName).then(options => {
        let query = options.query || '';
        query = _.isObject(query) 
          ? _.reduce(query, (result, value, key) => `${result}&${key}=${value}`, '?')
          : query;
          
        const req = {
          method: options.method || 'POST',
          uri: webtask.url + query,
          body: options.body || null,
          headers: options.headers || null,
          resolveWithFullResponse: true,
          simple: false
        };
        return request(req).then(res => {
          const color = res.statusCode < 300 ? 'white' : 'red';
          const payload = { 
            statusCode: res.statusCode,
            body: res.body
          }
          cli.consoleLog(chalk[color](JSON.stringify(payload, null, 4)));
        })
      });
    });
  }

}

module.exports = invokeService;