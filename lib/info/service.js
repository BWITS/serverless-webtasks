'use strict';

const BbPromise = require('bluebird');
const chalk = require('chalk');
const _ = require('lodash');

const infoService = {

  gatherServiceInfo() {
    const service = this.serverless.service.service;
    return this.getStageOption().then(stage => {
      this.webtaskInfo = this.webtaskInfo || { service, stage };
      if (!this.webtaskInfo.webtasks) {
        return this.getWebtasks().then(webtasks => {
          this.webtaskInfo.webtasks = webtasks;
        })
      }
    });
  },

  displayServiceInfo() {
    const cli = this.serverless.cli;
    const info = this.webtaskInfo;
    let message = '';
    message += `${chalk.yellow.underline('Service Information')}\n`;
    message += `${chalk.yellow('service:')} ${info.service}\n`;
    message += `${chalk.yellow('stage:')} ${info.stage}`;
    cli.consoleLog(message);
    return message;
  },

  displayEndpoints() {
    const cli = this.serverless.cli;
    const webtasks = this.webtaskInfo.webtasks;
    let endpointsMessage = `${chalk.yellow('endpoints:')}`;

    if (webtasks && webtasks.length > 0) {
      _.each(webtasks, webtask => {
        endpointsMessage += `\n  * - ${webtask.url}`;
      });
    } else {
      endpointsMessage += '\n  None';
    }

    cli.consoleLog(endpointsMessage);
    return endpointsMessage;
  },

  displayFunctions() {
    const cli = this.serverless.cli;
    const webtasks = this.webtaskInfo.webtasks;
    let functionsMessage = `${chalk.yellow('functions:')}`;

    if (webtasks && webtasks.length > 0) {
      _.each(webtasks, webtask => {
        functionsMessage += `\n  ${webtask.name}: ${webtask.deployedName}`;
      });
    } else {
      functionsMessage += '\n  None';
    }

    cli.consoleLog(functionsMessage);
    return functionsMessage;
  }
}

module.exports = infoService;
