const core = require('@actions/core')
const BrazeApiClient = require('../src/BrazeApiClient')
const UpdateDeployer = require('../src/UpdateDeployer')
const Logger = require('../src/Logger')

jest.mock('@actions/core')
jest.mock('../src/BrazeApiClient')
jest.mock('../src/Logger')

describe('UpdateDeployer', () => {
    let mockBrazeClient
    let mockLogger
    let updateDeployer
    const mockContentBlocksDir = 'content_blocks'
    const mockOctokit = {
        rest: {
            repos: {
                compareCommits: jest.fn(),
                getContent: jest.fn()
            }
        }
    }
    const mockOwner = 'mockOwner'
    const mockRepo = 'mockRepo'
    const mockBaseSha = 'mockBaseSha'
    const mockHeadSha = 'mockHeadSha'

    beforeEach(() => {
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

        updateDeployer = new UpdateDeployer(mockOctokit, mockBrazeClient, mockOwner, mockRepo, mockBaseSha, mockHeadSha)

        mockOctokit.rest.repos.compareCommits.mockResolvedValue({
            data: {
                files: [
                    { filename: `${mockContentBlocksDir}/file1.liquid` },
                    { filename: `${mockContentBlocksDir}/file2.liquid` }
                ]
            }
        })

        mockOctokit.rest.repos.getContent.mockImplementation((fileName) => ({
            data: {
                content: Buffer.from(`Content of ${fileName}`, 'base64').toString('utf8')
            }
        }))

        jest.spyOn(updateDeployer, 'resolveDependencies').mockReturnValue([
            { path: `${mockContentBlocksDir}/file1.liquid`, content: `Content of ${mockContentBlocksDir}/file1.liquid` },
            { path: `${mockContentBlocksDir}/file2.liquid`, content: `Content of ${mockContentBlocksDir}/file2.liquid` }
        ])

        jest.spyOn(updateDeployer, 'getContentBlockName').mockImplementation((filePath) => filePath.split('/').pop().split('.').slice(0, -1).join('.'))
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    it('should update existing content blocks according to commit history', async () => {
        const existingContentBlocks = ['file1', 'file2']
        const contentBlocksWithIds = {
            file1: 'file1Id',
            file2: 'file2Id'
        }

        await updateDeployer.deploy(existingContentBlocks, contentBlocksWithIds)

        expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith('file1Id', `Content of ${mockContentBlocksDir}/file1.liquid`)
        expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith('file2Id', `Content of ${mockContentBlocksDir}/file2.liquid`)
    })
    
    it('should create new content blocks according to commit history', async () => {
        const existingContentBlocks = ['file3', 'file4']

        await updateDeployer.deploy(existingContentBlocks, {})

        expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith('file1', `Content of ${mockContentBlocksDir}/file1.liquid`)
        expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith('file2', `Content of ${mockContentBlocksDir}/file2.liquid`)
    })
})