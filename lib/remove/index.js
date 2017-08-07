'use strict';

const BbPromise = require('bluebird');
const sharedServices = require('../shared');
const removeService = require('./service');

class WebtasksRemove {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      removeService);

    const removeCommand = this.serverless.pluginManager.commands.remove;
    removeCommand.options = {};

    this.commands = {
      remove: {
        options: sharedServices.removeOptions
      }
    };

    this.hooks = {
      'remove:remove': () => BbPromise.bind(this)
        .then(this.validateOptions)
        .then(this.getFunctions)
        .map(this.removeFunction)
        .all()
    };
  }

}

module.exports = WebtasksRemove;