const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('../src/BrazeApiClient')
const InitDeployer = require('../src/InitDeployer')
const UpdateDeployer = require('../src/UpdateDeployer')
const { run } = require('../src/main')

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('../src/BrazeApiClient')
jest.mock('../src/InitDeployer')
jest.mock('../src/UpdateDeployer')

describe('main.js', () => {
	let mockGetInput,
		mockGetOctokit,
		mockContext,
		mockBrazeClient,
		mockInitDeployer,
		mockUpdateDeployer

	beforeEach(() => {
		jest.spyOn(core, 'setFailed')
		mockGetInput = jest.spyOn(core, 'getInput')
		mockGetInput.mockImplementation((inputName) => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://test.braze.endpoint',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'init'
			}
			return inputs[inputName]
		})

		mockContext = {
			repo: {
				owner: 'test-owner',
				repo: 'test-repo'
			},
			payload: {
				before: 'base-sha'
			},
			sha: 'head-sha'
		}
		github.context = mockContext

		mockGetOctokit = {
			rest: {
				repos: {
					compareCommits: jest.fn(),
					getContent: jest.fn()
				}
			}
		}
		mockGetOctokit = jest.spyOn(github, 'getOctokit')
			.mockReturnValue(mockGetOctokit)

		mockBrazeClient = {
			getContentBlocks: jest.fn().mockResolvedValue({
				block1: 'block_id_1',
				block2: 'block_id_1'
			})
		}
		BrazeApiClient.mockImplementation(() => mockBrazeClient)

		mockInitDeployer = jest.spyOn(InitDeployer.prototype, 'deploy')
		mockInitDeployer.mockImplementation(() => {
			return {
				deploy: jest.fn().mockResolvedValue()
			}
		})

		mockUpdateDeployer = jest.spyOn(UpdateDeployer.prototype, 'deploy')
		mockUpdateDeployer.mockImplementation(() => {
			return {
				deploy: jest.fn().mockResolvedValue()
			}
		})
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('should instantiate BrazeApiClient with the correct arguments', async () => {
		await run()

		expect(BrazeApiClient).toHaveBeenCalledWith('test-api-key', 'https://test.braze.endpoint')
		expect(mockBrazeClient.getContentBlocks).toHaveBeenCalled()
	})

	it('should call InitDeployer for "init" deployment mode', async () => {
		await run()

		expect(InitDeployer).toHaveBeenCalledWith(mockBrazeClient)
		expect(UpdateDeployer).not.toHaveBeenCalled()

		const initDeployerInstance = InitDeployer.mock.instances[0]
		expect(initDeployerInstance.deploy).toHaveBeenCalledWith(['block1', 'block2'])
	})
	
	it('should call UpdateDeployer for "update" deployment mode', async () => {
		mockGetInput.mockImplementation((inputName) => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://api.braze.com',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'update',
			};
			return inputs[inputName];
		});

		await run()

		expect(UpdateDeployer).toHaveBeenCalledWith(github.getOctokit('test-token'), mockBrazeClient, 'test-owner', 'test-repo', 'base-sha', 'head-sha')
		expect(InitDeployer).not.toHaveBeenCalled()

		const updateDeployerInstance = UpdateDeployer.mock.instances[0]
		expect(updateDeployerInstance.deploy).toHaveBeenCalledWith(['block1', 'block2'])
	})

	it('should handle errors gracefully', async () => {
		const errorMessage = 'Something went wrong'
		InitDeployer.mockImplementation(() => ({
			deploy: jest.fn().mockRejectedValue(new Error(errorMessage))
		}))

		await run()

		expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
	})
})
