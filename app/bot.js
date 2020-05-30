const Discord = require("discord.js");
const MySQL = require("mysql");
const Action = require("./actions/action");
const HelpActionHandler = require("./actions/handlers/helpactionhandler");
const NotesActionHandler = require("./actions/handlers/notesactionhandler");
const QuoteActionHandler = require("./actions/handlers/quoteactionhandler");

module.exports = class Bot {
  constructor(
    options = {},
    actions = [HelpActionHandler, NotesActionHandler, QuoteActionHandler],
    discord = Discord,
    mysql = MySQL
  ) {
    console.log("*** Welcome to Corporal Lancot %s! ***", process.env.npm_package_version);

    this.actions = actions;
    this.options = options;
    this.discord = discord;
    this.mysql = mysql;

    if (!this.discord || !this.mysql || !this.actions || !this.options.key) {
      throw new Error("Missing required constructor dependencies!", this);
    }

    this.actions = this.actions.map((actionClass) => {
      return new actionClass(this);
    });

    this.init();
  }

  async init() {
    this.db = this.mysql.createConnection({
      host: this.options.dbHost || "localhost",
      user: this.options.dbUser,
      password: this.options.dbPassword,
      database: this.options.db || "notes",
    });

    this.notesTable = this.options.dbTable || "notes";

    try {
      await this.initDB();
    } catch (e) {
      throw e;
    }

    try {
      await this.setupTable();
    } catch (e) {
      throw e;
    }

    try {
      await this.initDiscord();
    } catch (e) {
      throw e;
    }

    console.log("Init complete, ready to go!");

    this.listen();
  }

  async initDB() {
    console.log("Connecting to database...");
    return new Promise((resolve, reject) => {
      this.db.connect((err) => {
        if (err) {
          reject(err);
        }
        console.log("Connected to database!");
        resolve(true);
      });
    });
  }

  setupTable() {
    console.log("Checking notes table...");
    return new Promise((resolve, reject) => {
      this.db.query(
        "SHOW TABLES LIKE ?;",
        [this.notesTable],
        (err, results) => {
          if (!results.length) {
            console.log("Notes table not found - creating...");
            this.db.query(
              `CREATE TABLE ? (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          timestamp DATETIME,
          user_id BIGINT(8),
          channel_id BIGINT(8),
          nick VARCHAR(255) NOT NULL,
          message LONGTEXT NOT NULL
      );`,
              [this.notesTable],
              (err) => {
                if (err) {
                  reject(err);
                }
                console.log("Notes table created!");
                resolve(true);
              }
            );
          } else {
            console.log("Notes table exists!");
            resolve(true);
          }
        }
      );
    });
  }

  initDiscord() {
    console.log("Logging in to Discord...");
    return new Promise((resolve, reject) => {
      try {
        this.client = new this.discord.Client();
        this.client.once("ready", () => {
          console.log("Logged into Discord!");
          resolve(true);
        });

        this.client.login(this.options.key);
      } catch (e) {
        reject(e);
      }
    });
  }

  async listen() {
    console.log("Listening for commands...")
    this.client.on("message", async (msg) => {
      if (msg.content && msg.content[0] === "!") {
        const action = Action.getAction(msg.content);
        if (action && action.command) {
          let reply = "";
          const handler = this.actions.filter((x) => x.isMatch(action));
          if (!handler || !handler.length) {
            reply = "I don't recognise that command.";
          } else {
            try {
              reply = await handler[0].handle(action, msg);
            } catch (e) {
              reply = e;
            }
          }
          if (reply) {
            msg.reply(reply);
          }
        }
      }
    });
  }
};