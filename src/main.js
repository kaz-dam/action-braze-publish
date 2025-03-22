const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('./BrazeApiClient')
const InitDeployer = require('./InitDeployer')
const UpdateDeployer = require('./UpdateDeployer')
const Logger = require('./Logger')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
	try {
		Logger.info('Starting the action')

		const token = core.getInput('GITHUB_TOKEN')
		const brazeRestEndpoint = core.getInput('BRAZE_REST_ENDPOINT')
		const brazeApiKey = core.getInput('BRAZE_API_KEY')
		const deploymentMode = core.getInput('DEPLOYMENT_MODE')

		const octokit = github.getOctokit(token)
		const context = github.context
		const brazeClient = new BrazeApiClient(brazeApiKey, brazeRestEndpoint)

		const owner = context.repo.owner
		const repo = context.repo.repo
		const baseSha = context.payload.before
		const headSha = context.sha

		const contentBlocks = await brazeClient.getContentBlocks()
		const contentBlockNames = Object.keys(contentBlocks)

		Logger.info(`Existing content blocks on the instance: ${contentBlockNames.join(', ')}`)

		let deployer;

		if (deploymentMode === 'init') {
			Logger.debug('Using the init deployer')

			deployer = new InitDeployer(brazeClient)
		} else {
			Logger.debug('Using the update deployer')

			deployer = new UpdateDeployer(octokit, brazeClient, owner, repo, baseSha, headSha)
		}

		await deployer.deploy(contentBlockNames, contentBlocks)

	} catch (error) {
		core.setFailed(error.message)
	}
}

module.exports = {
	run
}
