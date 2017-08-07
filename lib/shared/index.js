const webtasksService = require('./webtasksService');
const optionsService = require('./optionsService');
const functionService = require('./functionService');

const sharedServices = Object.assign(
  {},
  webtasksService,
  optionsService,
  functionService
)

module.exports = sharedServices;