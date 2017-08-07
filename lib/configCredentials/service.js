                      //  .timeout(1000 * 60 * 5, 'Verification code expired')
                      //  .catch(error => cli.consoleLog(chalk.red(error.message)))
'use strict';

const BbPromise = require('bluebird');
const promptly = BbPromise.promisifyAll(require('promptly'));
const _ = require('lodash');

const configCredentialsService = {

  sendVerificationCode() {
    const cli = this.serverless.cli;
    const message = [
      'Please enter your email or phone number and', 
      'we will send you a verification code.'
    ].join(' ');
    cli.consoleLog(message);

    return promptly.promptAsync('Email or phone number:').then(emailOrPhone => {
      return this.verifyEmailOrPhone(emailOrPhone).then(verifyFunc => {
        const message = [
          'Please enter the verification code we sent to', 
          `'${emailOrPhone}' below.`
        ].join(' ');
        cli.consoleLog(message);

        const ServerlessError = this.serverless.classes.Error;
        return promptly.promptAsync('Verification code:')
                       .then(verifyFunc)
                       .timeout(1000 * 60 * 5, new ServerlessError('Verification code expired'))
                       .catch(() => { 
                         throw new ServerlessError('Invalid verification code');
                       });
      });
    });
  },

  confirmCreateProfile(options) {
    const message = [
      `A profile with the name '${options.profile}'`,
      'already exists'
    ].join(' ');
    this.serverless.cli.consoleLog(message);
    const prompt = 'Do you want to override it? [y/N]';
    const settings = { default: false };
    return promptly.confirmAsync(prompt, settings).then(confirm => {
      return confirm
        ? createProfile(true)
        : BbPromise.resolve();
    });
  },

  createProfile(override) {
    const cli =  this.serverless.cli;
    cli.log('Loading Webtasks profiles...');
    return this.getCredentialsOptions().then(options => {
      return this.tryGetProfileByName(options.profile).then(profile => {
        if (profile && !override) {
          return this.confirmCreateProfile(options);
        }
        if (options.url) {
          return this.setProfile(options).then(() => {
            cli.log('Profile set');
          });
        }

        cli.log('Creating a new Webtasks profile...');
        return this.sendVerificationCode().then(result => {
          const values = {
            url: result.url,
            container: result.tenant,
            token: result.token
          }
          return this.setProfile(options.profile, values).then(() => {
            cli.log('Profile created');
          })
        })
      });
    });
  }
}

module.exports = configCredentialsService;