'use strict';
const BbPromise = require('bluebird');
const _ = require('lodash');

class WebtasksProvider {

  static getProviderName() {
    return 'webtasks';
  }

  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this;
    this.serverless.setProvider('webtasks', this);

    this.hooks = {
      'before:package:setupProviderConfiguration': () => BbPromise.bind(this)
        .then(this.disablePackaging)
    };
  }

  disablePackaging() {
    const service = this.serverless.service;
    _.each(service.getAllFunctions(), functionName => {
      const functionObject = service.getFunction(functionName)
      functionObject.package = functionObject.package || {};
      functionObject.package.disable = true;
    });
    return BbPromise.resolve();
  }
}

module.exports = WebtasksProvider;