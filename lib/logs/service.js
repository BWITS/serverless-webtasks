'use strict';

const BbPromise = require('bluebird');
const chalk = require('chalk');
const _ = require('lodash');

const logsService = {

  openLogStream() {
    const cli = this.serverless.cli;
    return this.createLogStream().then(stream => {
      stream.on('data', data => cli.consoleLog(chalk.gray(data.msg)));
    });
  }
  
}

module.exports = logsService;