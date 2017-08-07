'use strict';

const BbPromise = require('bluebird');
const sharedServices = require('../shared');
const invokeService = require('./service');

class WebtasksInvoke {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      invokeService);

    const invokeCommand = this.serverless.pluginManager.commands.invoke;
    invokeCommand.options = {};
    invokeCommand.commands = {};

    this.commands = {
      invoke: {
        options: sharedServices.invokeOptions
      }
    };

    this.hooks = {
      'invoke:invoke': () => BbPromise.bind(this)
        .then(this.validateOptions)
        .then(this.getFunctions)
        .map(this.invokeFunction)
        .all()
    };
  }

}

module.exports = WebtasksInvoke;