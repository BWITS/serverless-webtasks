'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const chalk = require('chalk');
const path = require('path');
const WebtaskConfig = require('wt-cli/lib/config');
const webtaskArgValidator = require('wt-cli/lib/validateCreateArgs');
const webtaskCreator = require('wt-cli/lib/webtaskCreator');
const UserVerifier = require('wt-cli/lib/userVerifier');

const defaultServerlessProfileName = 'serverless';

const serviceMetaKey = 'serverless-service';
const stageMetaKey = 'serverless-stage';
const functionMetaKey = 'serverless-function';

const dependenciesDelay = 10 * 1000;
let onDependencies = null;

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

function handleCronError(error) {
  // Swallow 'not found' errors as we just tried
  // to remove a cron job that didn't exist and that
  // isn't an issue
  if (error.message !== 'not found') {
    throw error;
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

      const message = [
        `A '${defaultServerlessProfileName}' profile was not found.`,
        'Execute \'serverless config credentials --provider webtasks\'',
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
    const cli = this.serverless.cli;
    const provider = this.serverless.service.provider
    return this.getFunctionObject(functionName).then(functionObject => {
      return this.resolveFunctionFilePath(functionName).then(filePath => {
        return this.getProfile().then(profile => {
          return this.getStageOption().then(stage => {

            options.meta = options.meta || [];
            options.meta.push(`${serviceMetaKey}=${this.serverless.service.service}`);
            options.meta.push(`${stageMetaKey}=${stage}`);
            options.meta.push(`${functionMetaKey}=${functionName}`);

            let yamlSecrets = []
            // If serverless.yml provider.environment values exist
            // set webtasks secrets array.
            if (provider.environment) {
              yamlSecrets = Object.keys(provider.environment).map((k, i) => {
                return `${k}=${provider.environment[k]}`
              })
            }

            // Validate function code is correct
            const functionImport = require(filePath);
            const isValid = typeof functionImport === 'function';
            const separator = "-----------------------";
            const pathName = path.basename(filePath);
            if (!functionImport || !isValid) {
              cli.consoleLog(separator);
              cli.consoleLog(`${chalk.red('Error:')} Webtasks Deployment failed`);
              cli.consoleLog(`- No default export found in file ${pathName}`);
              cli.consoleLog('');
              cli.consoleLog(`${chalk.green('To Fix:')}`);
              cli.consoleLog(`- Export a default function ('module.export =') from file ${pathName}`);
              cli.consoleLog(separator);
              process.exit(1);
            }

            const exportsArray = Object.keys(functionImport);
            // Too many exports found
            if (exportsArray.length > 0) {
              cli.consoleLog(separator);
              cli.consoleLog(chalk.yellow(`Warning: More than one export found in file ${pathName}`));
              cli.consoleLog("Webtask functions must live in separate files as the default export ('module.export =')");
              cli.consoleLog(`Consider moving these exports: ${JSON.stringify(exportsArray)} in ${filePath} into separate files`);
              cli.consoleLog(separator);
            }

            const args = webtaskArgValidator({
              name: functionObject.name,
              file_or_url: filePath,
              secrets: yamlSecrets,
              meta: options.meta
            });

            let webtask;
            let error;
            const handlers = {
              onGeneration: result => webtask = result.webtask,
              onError: err => error = err
            };

            if (!onDependencies && args.packageJsonPath) {
              const packageJson = require(args.packageJsonPath);
              const dependencies = _.keys(packageJson.dependencies);
              const numberOfDependencies = dependencies.length;
              if (numberOfDependencies > 0) {

                const logWaitingForModules = () => {
                  if (numberOfDependencies > 1) {
                    const message = [
                      `Ensuring ${dependencies.length} module dependencies`,
                      `are available on the platform`
                    ].join(' ');
                    cli.log(message);
                    
                  } else {
                    const message = [
                      `Ensuring the '${dependencies[0]}' module dependency`,
                      `is available on the platform`
                    ].join(' ');
                    cli.log(message);
                  }
                  cli.log('This may take a few minutes...');
                };
                onDependencies = setTimeout(logWaitingForModules, dependenciesDelay);
              }
            } 

            return webtaskCreator(args, handlers)(profile).then(() => {
             
              clearTimeout(onDependencies);
              onDependencies = null;

              if (options.schedule) {
                const cronArgs = {
                  schedule: options.schedule,
                  meta: args.meta
                };
                return webtask.createCronJob(cronArgs).then(() => {
                  return mapWebtasks(webtask, error);
                });
              }

              const cronArgs = { name: functionObject.name };
              return profile.removeCronJob(cronArgs).catch(handleCronError).then(() => {
                return mapWebtasks(webtask, error);
              });
            });

          });
        });
      });
    });
  },

  removeWebtask(functionName) {
    return this.getFunctionObject(functionName).then(functionObject => {
      return this.getProfile().then(profile => {
        return profile.removeWebtask({ name: functionObject.name }).then(() => {
          return profile.removeCronJob({ name: functionObject.name }).catch(handleCronError);
        });
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
