const core = require('@actions/core')

class Logger {
    static initialized = false
    static logLevelInput
    static logLevel

    static init() {
        if (!Logger.initialized) {
            Logger.logLevelInput = core.getInput('LOG_LEVEL')
            const isGithubDebug = process.env.ACTIONS_STEP_DEBUG === 'true'

            Logger.logLevel = 'info'
            
            if (Logger.logLevelInput && Logger.logLevelInput.trim() !== '' && !isGithubDebug) {
                Logger.logLevel = Logger.logLevelInput.trim().toLowerCase()
            }
            
            if (isGithubDebug) {
                Logger.logLevel = 'debug'
            }

            Logger.initialized = true
        }
    }

    static debug(message) {
        Logger.init()
        if (Logger.logLevel === 'debug') {
            core.debug(`DEBUG: ${message}`)
        }
    }

    static info(message) {
        Logger.init()
        core.info(`INFO: ${message}`)
    }

    static warn(message) {
        Logger.init()
        core.info(`WARNING: ${message}`)
    }

    static error(message) {
        Logger.init()
        core.info(`ERROR: ${message}`)
    }
}

module.exports = Logger