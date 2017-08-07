'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const sharedServices = require('../shared');
const configCredentialsService = require('./service');

class WebtasksConfigCredentials {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('webtasks');

    Object.assign(
      this,
      sharedServices,
      configCredentialsService
    );

    const configCommand = this.serverless.pluginManager.commands.config;
    const credentialsCommand = configCommand.commands.credentials;
    credentialsCommand.options.provider.usage += ', "webtasks"';
    credentialsCommand.options.key.required = false;
    credentialsCommand.options.key.usage += ' (aws)';
    credentialsCommand.options.secret.required = false;
    credentialsCommand.options.secret.usage += ' (aws)';

    // Until the serverless fx removes the validation check
    // we have to locate the Config class hook and replace it
    const beforeConfigHooks = this.serverless
                                  .pluginManager
                                  .hooks['before:config:credentials:config'];
    _.each(beforeConfigHooks, hook => {
      if (hook.pluginName == 'Config') {
        hook.hook = () => BbPromise.resolve();
      }
    })

    this.commands = {
      config: {
        commands: {
          credentials: {
            options: sharedServices.configCredentialsOptions
          }
        }
      }
    };

    this.hooks = {
      'config:credentials:config': () => BbPromise.bind(this)
        .then(this.validateConfigCredentialsOptions)
        .then(this.createProfile)
    };
  }

}

module.exports = WebtasksConfigCredentials;