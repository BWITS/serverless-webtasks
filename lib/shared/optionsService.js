'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

const options = {
  function: {
    name: 'function',
    usage: 'Name of the function',
    shortcut: 'f',
    required: true
  },
  stage: {
    name: 'stage',
    usage: 'Stage of the service',
    shortcut: 's'
  },
  profile: {
    name: 'profile',
    usage: 'The Webtasks profile to use',
    shortcut: 'p'
  },
  meta: {
    name: 'meta',
    usage: 'Metadata in KEY=VALUE form',
  },
  path: {
    name: 'path',
    usage: 'Path to JSON file with input data',
    shortcut: 'p'
  },
  data: {
    name: 'data',
    usage: 'Input data',
    shortcut: 'd'
  },
  url: {
    name: 'url',
    usage: 'Base URL of Webtasks server (webtasks)',
    shortcut: 'u'
  },
  container: {
    name: 'container',
    usage: 'Webtasks container name (webtasks)',
    shortcut: 'c'
  },
  token: {
    name: 'token',
    usage: 'Webtasks authorizing token (webtasks)',
    shortcut: 'c'
  }
} 

const globalUnsupportedOptions = [ 
  'packages',
  'region',
  'type',
  'log',
  'startTime',
  'filter',
  'tail',
  'interval'
];

const unsupportedConfigCredentialsOptions = [
  'secret',
  'key'
];

const optionsService = {

  configCredentialsOptions: {
    url: options.url,
    container: options.container,
    token: options.token
  },

  deployOptions: {
    stage: options.stage,
    profile: options.profile,
    meta: options.meta
  },

  deployFunctionOptions: {
    function: options.function,
    stage: options.stage,
    profile: options.profile,
    meta: options.meta,
  },

  infoOptions: {
    stage: options.stage,
    profile: options.profile
  },

  invokeOptions: {
    function: options.function,
    stage: options.stage,
    profile: options.profile,
    path: options.path,
    data: options.data
  },

  removeOptions: {
    stage: options.stage,
    profile: options.profile,
  },

  validateOptions(unsupportedOptions = globalUnsupportedOptions) {
    const ServerlessError = this.serverless.classes.Error;
    _.each(unsupportedOptions, option => {
      if (this.options[option]) {
        const message = [
          `The \'${option}\' option is not supported`,
          'with the Webtasks provider.'
        ].join(' ');
        throw new ServerlessError(message);
      }
    })
    return BbPromise.resolve();
  },

  validateConfigCredentialsOptions() {
    return this.validateOptions(unsupportedConfigCredentialsOptions);
  },

  getMetaOption() {
    return this.getKeyValueOptionByName(options.meta.name);
  },

  getStageOption() {
    return BbPromise.resolve(
      this.options.stage
      || this.serverless.service.provider.stage
    );
  },

  getScheduleOption(functionName) {
    const ServerlessError = this.serverless.classes.Error;
    return this.getFunctionObject(functionName).then(functionObject => {
      let schedule = null
      if (functionObject.events) {
        _.each(functionObject.events, event => { 
          _.each(event, (value, key) => {
            
            let message = null;
            if (key === 'http') {
              message = [
                'Webtasks implement an implicit \'http\' event ',
                'and don\'t support explicit configuration.'
              ].join(' ');
            }
            if (key !== 'schedule') {
              message = [
                `The '${key}' event is not supported with the Webtasks`,
                'provider. Webtasks only support a \'schedule\' event',
                'or an implicit \'http\' event that does not need to be',
                'configured.'
              ].join(' ');
            }
            if (schedule) {
              message = 'Webtasks only support a single \'schedule\' event.';
            }
            if (message) {
              throw new ServerlessError(message)
            }
            schedule = value;
          });
        });
      }

      if (schedule) {
        const cronMatch = /cron\((.*)\)/.exec(schedule);
        if (cronMatch && cronMatch[1]) {
          const cron = cronMatch[1].split(' ');
          if (!cron || cron.length != 5) {
            const message = [
              `The cron value \'${cronMatch[1]}\' is not supported`,
              'with the Webtasks provider. Only 5 field cron expression',
              'formats are supported.'
            ].join(' ');
            throw new ServerlessError(message);
          }
          schedule = cronMatch[1];
        } else {
          const rateMatch = /rate\((.*)\)/.exec(schedule);
          if (rateMatch && rateMatch[1]) {
            const rate = /(\d+)\s*(minutes?|hours?|days?)/.exec(rateMatch[1]);
            if (!rate || !rate[1] || !rate[2]) {
              const message = [
                `The rate value \'${rateMatch[1]}\' is not supported`,
                'with the Webtasks provider.'
              ].join(' ');
              throw new ServerlessError(message);
            }
            if (rate[2].startsWith('d')) {
              schedule = `0 0 */${rate[1]} * *`;
            } else if (rate[2].startsWith('h')) {
              schedule = `0 */${rate[1]} * * *`;
            } else {
              schedule = `*/${rate[1]} * * * *`;
            }
          } else {
            const message = [
              `The schedule value \'${schedule}\' is not supported`,
              'with the Webtasks provider. Only \'cron()\' and \'rate()\'',
              'formats are supported.'
            ].join(' ');
            throw new ServerlessError(message);
          }
        }
      }
      return schedule;
    });
  },

  getKeyValueOptionByName(optionName) {
    let values = this.options[optionName] || [];
    if (values) {
      if (!_.isArray(values)) {
        values = [values];
      }
      _.each(values, value => {
        const i = value.indexOf('=');
        if (i == -1) {
          const message = [
            `The '${optionName}' option must be of the the`,
            'form \'KEY=VALUE\'.'
          ].join(' ');
          const ServerlessError = this.serverless.classes.Error;
          throw new ServerlessError(message);
        }
      })
    }

    return BbPromise.resolve(values);
  },

  getDeployOptions(functionName) {
    return this.getMetaOption().then(meta => {
      return this.getScheduleOption(functionName).then(schedule => {
        return { meta, schedule };
      });
    });
  },

  getInvokeOptions(functionName) {
    let data = {};
    let readData;
    if (this.options.data) {
      readData = this.options.data;
    }
    else if (this.options.path) {
      readData = this.serverless.utils.readFileSync(this.options.path);
    }

    if (readData) {
      try {
        const json = JSON.parse(readData);
        data = _.isUndefined(json.method) 
          && _.isUndefined(json.headers)
          && _.isUndefined(json.query)
          && _.isUndefined(json.body) 
          ? { body: json } 
          : json;
        if (data.body && _.isObject(data.body)) {
          data.headers = data.headers || {};
          data.headers['Content-Type'] = 'application/json';
          data.body = JSON.stringify(data.body);
        }
      }
      catch (exception) {
        data = {
          body: readData,
          headers: { 
            'Content-Type': 'application/text'
          }
        }
      }
    }

    return BbPromise.resolve(data);
  },

  getCredentialsOptions() {
    const values = {
      token: this.options.token,
      url: this.options.url,
      container: this.options.container,
      profile: this.options.profile == 'default'
        ? undefined 
        : this.options.profile 
    };

    if (values.token || values.url || values.container || values.profile) {
      if (!values.token || !values.url || !values.container) {
        const ServerlessError = this.serverless.classes.Error;
        const message = [
          'To add a new Webtasks profile all of the following',
          'options are required: \'--token\', \'--url\', and \'--container\'.'
        ].join(' ');

        throw new ServerlessError(message);
      }
    }

    values.profile = values.profile || 'serverless'

    return BbPromise.resolve(values);
  }

};

module.exports = optionsService;