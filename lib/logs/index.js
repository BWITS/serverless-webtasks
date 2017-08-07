'use strict';

const BbPromise = require('bluebird');
const sharedServices = require('../shared');
const logsService = require('./service');

class WebtasksLogs {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      logsService
    );

    const logsCommand = this.serverless.pluginManager.commands.logs;
    logsCommand.options = {};

    this.commands = {
      logs: {
        usage: 'Output the logs of the service\'s webtask container',
        lifecycleEvents: [
          'logs',
        ],
      }
    };
  
    this.hooks = {
      'logs:logs': () => BbPromise.bind(this)
        .then(this.validateOptions)
        .then(this.openLogStream)
    };
  }

}

module.exports = WebtasksLogs;