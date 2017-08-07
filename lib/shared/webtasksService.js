'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

const WebtaskConfig = require('wt-cli/lib/config');
const webtaskArgValidator = require('wt-cli/lib/validateCreateArgs');
const webtaskCreator = require('wt-cli/lib/webtaskCreator');
const UserVerifier = require('wt-cli/lib/userVerifier');

const defaultServerlessProfileName = 'serverless';
const defaultProfileName = 'default';

const serviceMetaKey = 'serverless-service';
const stageMetaKey = 'serverless-stage';
const functionMetaKey = 'serverless-function';

function mapWebtasks(webtask, error) {
  return {
    name: webtask ? webtask.meta[functionMetaKey] : null,
    stage: webtask ? webtask.meta[stageMetaKey] : null,
    service: webtask ? webtask.meta[serviceMetaKey]: null,
    deployedName: webtask ? webtask.claims.jtn : null,
    url: webtask ? webtask.url : null,
    token: webtask ? webtask.token : null,
    container: webtask ? webtask.container : null,
    error: _.isInteger(error) ? null : error
  }
}

const profileService = {

  getProfiles() {
    if (this.profiles) {
      return BbPromise.resolve(this.profiles);
    }
    const config = new WebtaskConfig();
    return config.load().then(profiles => {
      this.profiles = profiles;
      return profiles;
    });
  },

  tryGetProfileByName(profileName) {
    return this.getProfiles().then(profiles => profiles[profileName]);
  },

  getProfileByName(profileName) {
    return this.tryGetProfileByName(profileName).then(profile => {
      if (!profile) {
        const ServerlessError = this.serverless.classes.Error;
        throw new ServerlessError(`No '${profileName}' profile was found.`);
      }
      return profile;
    });
  },

  getProfile() {
    if (this.options.profile) {
      return this.getProfileByName(this.options.profile);
    }

    return this.getProfiles().then(profiles => {
      if (profiles[defaultServerlessProfileName]) {
        return profiles[defaultServerlessProfileName];
      }

      if (profiles[defaultProfileName]) {
        return profiles[defaultProfileName];
      }

      const message = [
        `Neither a '${defaultServerlessProfileName}' nor`,
        `'${defaultProfileName}' profile were found. Execute`,
        '\'serverless config credentials --provider webtasks\'',
        `to create a new profile.`
      ].join(' ');
      const ServerlessError = this.serverless.classes.Error;
      throw new ServerlessError(message);
    });
  },

  setProfile(name, values) {
    const config = new WebtaskConfig();
    return config.setProfile(name, values).then(() => {
      return config.save();
    });
  },

  getWebtask(functionName) {
    return this.getWebtasks(functionName).then(webtasks => {
      return webtasks && webtasks[0] ? webtasks[0] : null;
    });
  },

  getWebtasks(functionName) {
    return this.getStageOption().then(stage => {
      return this.getProfile().then(profile => {
        const service = this.serverless.service.service;

        const meta = {};
        meta[serviceMetaKey] = service;
        meta[stageMetaKey] = stage;
        if (functionName) {
          meta[functionMetaKey] = functionName
        }
        return profile.listWebtasks({ meta }).then(webtasks => {
          return _.filter(
            _.map(webtasks, mapWebtasks),
            webtask => webtask.stage == stage
              && webtask.service == service 
              && (!functionName || webtask.name == functionName));
        });

      });
    });
  },

  createWebtask(functionName, options) {
    return this.getFunctionObject(functionName).then(functionObject => {
      return this.resolveFunctionFilePath(functionName).then(filePath => {
        return this.getProfile().then(profile => {
          return this.getStageOption().then(stage => {

            options.meta = options.meta || [];
            options.meta.push(`${serviceMetaKey}=${this.serverless.service.service}`);
            options.meta.push(`${stageMetaKey}=${stage}`);
            options.meta.push(`${functionMetaKey}=${functionName}`);
            
            const args = webtaskArgValidator({ 
              name: functionObject.name, 
              file_or_url: filePath,
              secretsFile: options.secretsFile,
              secrets: options.secrets,
              meta: options.meta
            });

            let webtask;
            let error;
            const handlers = { 
              onGeneration: result => webtask = result.webtask,
              onError: err => error = err
            };

            return webtaskCreator(args, handlers)(profile).then(() => {
              if (options.schedule) {
                const cronArgs = {
                  schedule: options.schedule,
                  meta: args.meta
                };
                return webtask.createCronJob(cronArgs).then(() => {
                  return mapWebtasks(webtask, error);
                });
              }
              return mapWebtasks(webtask, error);
            });

          });
        });
      });
    });
  },

  removeWebtask(functionName) {
    return this.getFunctionObject(functionName).then(functionObject => {
      return this.getProfile().then(profile => {
        return profile.removeWebtask({ name: functionObject.name })
      });
    });
  },

  createLogStream(logger) {
    return this.getProfile().then(profile => {
      return profile.createLogStream({ json: true });
    });
  },

  verifyEmailOrPhone(emailOrPhone) {
    const verifier = new UserVerifier();
    return verifier.requestVerificationCode(emailOrPhone);
  }

};

module.exports = profileService;