// packages/utils/src/logger.js (version 7.2.0)
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let loggerInstance = null;

const loggerProxy = {
    trace: (...args) => loggerInstance?.trace(...args),
    debug: (...args) => loggerInstance?.debug(...args),
    info: (...args) => loggerInstance?.info(...args),
    warn: (...args) => loggerInstance?.warn(...args),
    error: (...args) => loggerInstance?.error(...args),
    fatal: (...args) => loggerInstance?.fatal(...args),
};

function createPinoLogger(logDirectory = null, extraStreams = [], isReinit = false) {
    const consoleTransport = pino.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,runStats,article,assessment,event,payload,context,embedding,finalAssessment,watchlistHits,hits,reasoning,enrichmentSources,source_articles,key_individuals,source,details',
            singleLine: true,
            messageFormat: '{msg}',
        },
    });

    const streams = [
        {
            level: LOG_LEVEL,
            stream: IS_PRODUCTION ? process.stdout : consoleTransport,
        },
        ...extraStreams,
    ];

    if (logDirectory && !IS_PRODUCTION) {
        if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true });
        
        const errorLogFile = path.join(logDirectory, 'error.log');
        if (!isReinit) {
             try { fs.unlinkSync(errorLogFile); } catch (e) { if (e.code !== 'ENOENT') console.error('Could not clear old error log file:', e); }
        }
        streams.push({ level: 'warn', stream: fs.createWriteStream(errorLogFile, { flags: 'a' }) });
    }

    const newLogger = pino({ level: 'trace' }, pino.multistream(streams));
    
    if (!global.loggerInitialized) {
        const formattedDate = moment().format('YYYY-MM-DD HH:mm:ss');
        newLogger.info(`
#############################################################
#                                                           #
#         PIPELINE RUN INITIATED: ${formattedDate}      #
#                                                           #
#############################################################
`);
        global.loggerInitialized = true;
    }
    
    return newLogger;
}

export function initializeLogger(logDirectory = null, extraStreams = []) {
    if (loggerInstance) {
        return loggerInstance;
    }
    loggerInstance = createPinoLogger(logDirectory, extraStreams);
    
    for (const key in loggerInstance) {
        if (typeof loggerInstance[key] === 'function') {
            loggerProxy[key] = loggerInstance[key].bind(loggerInstance);
        }
    }

    return loggerInstance;
}

export function reinitializeLogger(logDirectory = null, extraStreams = []) {
    // A true re-initialization. Create new logger instance but don't repeat the banner.
    loggerInstance = createPinoLogger(logDirectory, extraStreams, true);
    for (const key in loggerInstance) {
        if (typeof loggerInstance[key] === 'function') {
            loggerProxy[key] = loggerInstance[key].bind(loggerInstance);
        }
    }
    return loggerInstance;
}

export { loggerProxy as logger };
