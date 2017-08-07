'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

const deployService = {

  deployFunction(functionName) {
    const cli = this.serverless.cli;
    cli.log(`Deploying function: ${functionName}...`)
    return this.getDeployOptions(functionName).then(options => {
      return this.createWebtask(functionName, options).then(webtask => {
        const message = webtask.error
          ? `Failed to deploying function: ${functionName}`
          : `Successfully deployed function: ${functionName}`
        cli.log(message);
        return webtask;
      })
    });
  }
  
}

module.exports = deployService;