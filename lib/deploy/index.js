'use strict';

const BbPromise = require('bluebird');
const sharedServices = require('../shared');
const deployService = require('./service');

class WebtasksDeploy {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      deployService
    );

    const deployCommand = this.serverless.pluginManager.commands.deploy;
    const deployfunctionCommand = deployCommand.commands.function;
    deployCommand.options = {};
    deployCommand.commands = {};
    deployfunctionCommand.options = sharedServices.deployFunctionOptions;

    this.commands = {
      deploy: {
        options: sharedServices.deployOptions,
        commands: {
          function: deployfunctionCommand
        }
      }
    };

    const hook = () => BbPromise.bind(this)
      .then(this.validateOptions)
      .then(this.getFunctions)
      .map(this.deployFunction)
      .all();

    this.hooks = {
      'deploy:deploy': hook,
      'deploy:function:deploy': hook
    };
  }

}

module.exports = WebtasksDeploy;