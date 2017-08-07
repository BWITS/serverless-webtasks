'use strict';

const BbPromise = require('bluebird');

const removeService = {

  removeFunction(functionName) {
    const cli = this.serverless.cli;
    cli.log(`Removing function: ${functionName}...`);
    return this.removeWebtask(functionName)
               .then(() => cli.log(`Successfully removed function: ${functionName}`))
               .catch(error => {
                  cli.log(`Failed to remove function: ${functionName}`);
                  if (this.options.verbose) {
                    cli.consolelog(`${chalk.yellow('Error message:')} ${error.message}`);
                  }
               });
  }
}

module.exports = removeService;