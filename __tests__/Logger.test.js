const core = require('@actions/core')
const Logger = require('../src/Logger')

jest.mock('@actions/core')

describe('Logger', () => {
    beforeEach(() => {

    })

    afterEach(() => {
        jest.resetAllMocks()
        
        Logger.initialized = false;
        Logger.logLevel = undefined;
        Logger.logLevelInput = undefined;

        delete process.env.ACTIONS_STEP_DEBUG
    })

    describe('init', () => {
        it('should set logLevel from LOG_LEVEL input if provided and debug is off', () => {
            core.getInput.mockReturnValue('warn')
            process.env.ACTIONS_STEP_DEBUG = 'false'
        
            Logger.init()
        
            expect(Logger.logLevel).toEqual('warn')
            expect(Logger.initialized).toBe(true)
        })
    
        it('should set logLevel to debug if GitHub debug mode is enabled and no input is given', () => {
            core.getInput.mockReturnValue('')
            process.env.ACTIONS_STEP_DEBUG = 'true'
        
            Logger.init()
        
            expect(Logger.logLevel).toEqual('debug')
            expect(Logger.initialized).toBe(true)
        })
    
        it('should default to info if no input is given and debug is not enabled', () => {
            core.getInput.mockReturnValue('')
            process.env.ACTIONS_STEP_DEBUG = 'false'
        
            Logger.init()
        
            expect(Logger.logLevel).toEqual('info')
            expect(Logger.initialized).toBe(true)
        })
    
        it('should not reinitialize if already initialized', () => {
            Logger.initialized = true
        
            Logger.init()
        
            expect(core.getInput).not.toHaveBeenCalled()
        })
    })

    describe('logLevel', () => {
        it('should default to info', () => {
            Logger.init()

            expect(Logger.logLevel).toEqual('info')
        })

        it('should be set to debug if the log level input is debug', () => {
            core.getInput.mockReturnValue('debug');
            
            Logger.init()

            expect(Logger.logLevel).toEqual('debug')
        })

        it('should be set to debug if the log level input is not debug but the action step debug is true', () => {
            core.getInput.mockReturnValue('info')
            process.env.ACTIONS_STEP_DEBUG = 'true'

            Logger.init()

            expect(Logger.logLevel).toEqual('debug')
        })
    })

    describe('debug', () => {
        it('should log a debug message', () => {
            core.getInput.mockReturnValue('debug')

            Logger.debug('Debug message')
            expect(core.debug).toHaveBeenCalledWith('DEBUG: Debug message')
        })

        it('should not log a debug message if log level is not debug', () => {
            core.getInput.mockReturnValue('info')

            Logger.debug('Debug message')
            
            expect(core.debug).not.toHaveBeenCalled()
        })
    })

    describe('info', () => {
        it('should log an info message', () => {
            Logger.info('Info message')
            expect(core.info).toHaveBeenCalledWith('INFO: Info message')
        })
    })

    describe('warn', () => {
        it('should log a warning message', () => {
            Logger.warn('Warning message')
            expect(core.info).toHaveBeenCalledWith('WARNING: Warning message')
        })
    })

    describe('error', () => {
        it('should log an error message', () => {
            Logger.error('Error message')
            expect(core.info).toHaveBeenCalledWith('ERROR: Error message')
        })
    })
})