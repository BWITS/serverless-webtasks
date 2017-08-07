'use strict';

const path = require('path');
const BbPromise = require('bluebird');
const _ = require('lodash');

const functionService = {

  getFunctions() {
    const functionNames = this.options.function
      ? _.flattenDeep([this.options.function])
      : this.serverless.service.getAllFunctions();
    return BbPromise.resolve(functionNames);
  }, 

  getFunctionObject(functionName) {
    const functionObject = this.serverless.service.getFunction(functionName);
    if (!functionObject) {
      const ServerlessError = this.serverless.classes.Error;
      throw new ServerlessError(`No '${functionName}' function was found.`);
    }
    return BbPromise.resolve(functionObject);
  },

  resolveFunctionFilePath(functionName) {
    return this.getFunctionObject(functionName).then(functionObject => {
      const handler = functionObject.handler;
      const extension = path.extname(handler);
      const dir = path.dirname(handler);
      const fileName = path.basename(handler, extension);
      const filePath = path.resolve(dir, fileName);
      try {
        return BbPromise.resolve(require.resolve(filePath));
      }
      catch (error) {
        const ServerlessError = this.serverless.classes.Error;
        throw new ServerlessError(`No '${filePath}' file for function '${functionName}' was found.`);
      }
    });
  }
};

module.exports = functionService;