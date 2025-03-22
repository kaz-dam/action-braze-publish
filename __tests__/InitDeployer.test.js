const fs = require('fs')
const path = require('path')
const BrazeApiClient = require('../src/BrazeApiClient')
const InitDeployer = require('../src/InitDeployer')
const Constants = require('../src/Constants')
const Logger = require('../src/Logger')

jest.mock('fs', () => ({
    promises: {
        access: jest.fn().mockResolvedValue(),
    },
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    readFileSync: jest.fn()
}))
jest.mock('path')
jest.mock('../src/BrazeApiClient')
jest.mock('../src/Constants')
jest.mock('../src/Logger')

describe('InitDeployer', () => {
    let mockBrazeClient
    let initDeployer
    let mockLogger
    const mockWorkspacePath = '/mock/workspace'
    const mockContentBlocksDir = 'content_blocks'
    const mockFileExtensions = ['liquid']

    beforeEach(() => {
        process.env.GITHUB_WORKSPACE = mockWorkspacePath

        Constants.CONTENT_BLOCKS_DIR = mockContentBlocksDir
        Constants.FILE_EXTENSIONS = mockFileExtensions

        mockBrazeClient = {
            updateContentBlock: jest.fn(),
            createContentBlock: jest.fn()
        }
        BrazeApiClient.mockImplementation(() => mockBrazeClient)

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn()
        }
        Logger.mockImplementation(() => mockLogger)
        
        initDeployer = new InitDeployer(mockBrazeClient)
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('getAllFiles', () => {
        it('should recursively retrieve all files with valid extensions', () => {
            const dirStructure = {
                '/mock/workspace/content_blocks': ['file1.liquid', 'file2.liquid', 'subdir'],
                '/mock/workspace/content_blocks/subdir': ['file3.liquid', 'file4.txt']
            }

            fs.readdirSync.mockImplementation((dirPath) => dirStructure[dirPath] || [])
            fs.statSync.mockImplementation((filePath) => ({ isDirectory: () => filePath.split('/').pop() === 'subdir' }))

            fs.readFileSync.mockImplementation((filePath) => `Content of ${filePath}`)

            path.join.mockImplementation((...args) => args.join('/'))
            path.extname.mockImplementation((filePath) => `.${filePath.split('.').pop()}`)
        
            const result = initDeployer.getAllFiles(path.join(mockWorkspacePath, mockContentBlocksDir))
        
            expect(result).toEqual([
                {
                    path: `${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`,
                    content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`
                },
                {
                    path: `${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`,
                    content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`
                },
                {
                    path: `${mockWorkspacePath}/${mockContentBlocksDir}/subdir/file3.liquid`,
                    content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/subdir/file3.liquid`
                }
            ])
        })
    })

    describe('deploy', () => {
        beforeEach(() => {
            jest.spyOn(initDeployer, 'getAllFiles').mockReturnValue([
                { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid` },
                { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid` }
            ])
            jest.spyOn(initDeployer, 'resolveDependencies').mockReturnValue([
                { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid` },
                { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid` }
            ])
            jest.spyOn(initDeployer, 'getContentBlockName').mockImplementation((filePath) => filePath.split('/').pop().split('.').slice(0, -1).join('.'))

            jest.spyOn(initDeployer, 'publishFiles').mockImplementation(() => {})
        })

        it('should call the publish method', async () => {
            await initDeployer.deploy()

            expect(initDeployer.publishFiles).toHaveBeenCalled()
        })
    })
})