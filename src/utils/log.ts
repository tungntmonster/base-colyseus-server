import { configure, getLogger } from 'log4js';

configure({
  appenders: {
    console: {
      type: 'console',
    },
    errorFile: {
      type: 'dateFile',
      filename: 'logs/error.log',
      keepFileExt: true,
    },
    errors: {
      type: 'logLevelFilter',
      level: 'ERROR',
      appender: 'errorFile',
    },

    // For mail alert

    // email: {
    //   type: '@log4js-node/smtp',
    //   recipients: 'dev.team@company.name',
    //   subject: 'Latest logs',
    //   sender: 'my.application@company.name',
    //   attachment: {
    //     enable: true,
    //     filename: 'latest.log',
    //     message: 'See the attachment for the latest logs'
    //   },
    //   sendInterval: 3600
    // },

    // Slack alert

    // alerts: {
    //   type: '@log4js-node/slack',
    //   token: 'abc123def',
    //   channel_id: 'prod-alerts',
    //   username: 'our_application'
    // }
  },
  categories: { default: { appenders: ['console', 'errors'], level: 'debug' } },
});

const log = (service: string) =>  {
  const customLobbyRoomLogger = getLogger(service);
  return customLobbyRoomLogger;
}
export { log };