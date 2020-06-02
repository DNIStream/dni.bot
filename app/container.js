'use strict';

// Container
const ioc = require('awilix');
const Lifetime = ioc.Lifetime;

// App
const Bot = require('./bot');
// Services
const DbConfig = require('./services/db/dbConfig');
const Db = require('./services/db/db');
const Config = require('./services/appConfig/appConfig');
const Logger = require('./services/logging/logger');
// Actions
const HelpActionHandler = require("./actions/handlers/helpactionhandler");
const NotesActionHandler = require("./actions/handlers/notesactionhandler");
const QuoteActionHandler = require("./actions/handlers/quoteactionhandler");
// 3rd party
const MySQL = require("mysql2/promise");
const Discord = require("discord.js");

// IoC container - these are the only references to console.log() that should exist in the application
console.log("Creating IoC container");
const container = ioc.createContainer({
  injectionMode: ioc.InjectionMode.PROXY
})
console.log("Registering services");

container.register({
  bot: ioc.asClass(Bot, { lifetime: Lifetime.SINGLETON }),
  configFilePath: ioc.asValue("config.json"),
  dbConfig: ioc.asClass(DbConfig),
  db: ioc.asClass(Db),
  appConfig: ioc.asFunction(Config),
  logger: ioc.asClass(Logger),
  mySql: ioc.asValue(MySQL),
  discord: ioc.asValue(Discord),
  botVersion: ioc.asValue(process.env.npm_package_version),
  botName: ioc.asValue(process.env.npm_package_name),
  botDescription: ioc.asValue(process.env.npm_package_description),
  // actions: ioc.asValue([HelpActionHandler, NotesActionHandler, QuoteActionHandler])
  helpAction: ioc.asClass(HelpActionHandler),
  notesAction: ioc.asClass(NotesActionHandler),
  quoteAction: ioc.asClass(QuoteActionHandler),
  actions: ioc.asFunction(function () {
    return [
      container.cradle.helpAction,
      container.cradle.notesAction,
      container.cradle.quoteAction
    ];
  })
});

container.cradle.logger.log("All services registered");

module.exports = container;
