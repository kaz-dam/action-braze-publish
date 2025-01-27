const core = require('@actions/core')
const BrazeApiClient = require('../src/BrazeApiClient')
const UpdateDeployer = require('../src/UpdateDeployer')

jest.mock('@actions/core')
jest.mock('../src/BrazeApiClient')

describe('UpdateDeployer', () => {
    let mockBrazeClient
    let updateDeployer
    const mockWorkspacePath = '/mock/workspace'
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

        updateDeployer = new UpdateDeployer(mockOctokit, mockBrazeClient, mockOwner, mockRepo, mockBaseSha, mockHeadSha)

        mockOctokit.rest.repos.compareCommits.mockResolvedValue({
            data: {
                files: [
                    { filename: `${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid` },
                    { filename: `${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid` }
                ]
            }
        })

        mockOctokit.rest.repos.getContent.mockImplementation((fileName) => ({
            data: {
                content: Buffer.from(`Content of ${fileName}`, 'base64').toString('utf8')
            }
        }))

        jest.spyOn(updateDeployer, 'resolveDependencies').mockReturnValue([
            { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid` },
            { path: `${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`, content: `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid` }
        ])

        jest.spyOn(updateDeployer, 'getContentBlockName').mockImplementation((filePath) => filePath.split('/').pop().split('.').slice(0, -1).join('.'))
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    it('should update existing content blocks according to commit history', async () => {
        const existingContentBlocks = ['file1', 'file2']

        await updateDeployer.deploy(existingContentBlocks)

        expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith('file1', `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`)
        expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith('file2', `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`)
    })
    
    it('should create new content blocks according to commit history', async () => {
        const existingContentBlocks = ['file3', 'file4']

        await updateDeployer.deploy(existingContentBlocks)

        expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith('file1', `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file1.liquid`)
        expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith('file2', `Content of ${mockWorkspacePath}/${mockContentBlocksDir}/file2.liquid`)
    })
})