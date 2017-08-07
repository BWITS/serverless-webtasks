'use strict';

const BbPromise = require('bluebird');
const sharedServices = require('../shared');
const infoService = require('./service');

class WebtasksInfo {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      infoService
    );

    const infoCommand = this.serverless.pluginManager.commands.info;
    infoCommand.options = {};

    this.commands = {
      info: {
        options: sharedServices.infoOptions
      }
    };

    const hook = () => BbPromise.bind(this)
      .then(this.validateOptions)
      .then(this.gatherServiceInfo)
      .then(this.displayServiceInfo)
      .then(this.displayEndpoints)
      .then(this.displayFunctions);

    this.hooks = {
      'info:info': hook,
      'after:deploy:deploy': hook
    };
  }

}

module.exports = WebtasksInfo;