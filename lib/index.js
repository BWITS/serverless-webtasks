'use strict';

const WebtasksProvider = require('./provider');
const WebtasksConfigCredentials = require('./configCredentials');
const WebtasksDeploy = require('./deploy');
const WebtasksInfo = require('./info');
const WebtasksInvoke = require('./invoke');
const WebtasksLogs = require('./logs');
const WebtasksRemove = require('./remove');

class Webtasks {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.serverless.pluginManager.addPlugin(WebtasksProvider);
    this.serverless.pluginManager.addPlugin(WebtasksConfigCredentials);
    this.serverless.pluginManager.addPlugin(WebtasksDeploy);
    this.serverless.pluginManager.addPlugin(WebtasksInfo);
    this.serverless.pluginManager.addPlugin(WebtasksRemove);
    this.serverless.pluginManager.addPlugin(WebtasksLogs);
    this.serverless.pluginManager.addPlugin(WebtasksInvoke);
  }
}

module.exports = Webtasks;