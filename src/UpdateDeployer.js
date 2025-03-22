const core = require('@actions/core')
const BaseDeployer = require('./BaseDeployer')
const Logger = require('./Logger')

class UpdateDeployer extends BaseDeployer {
    constructor(octokit, brazeClient, owner, repo, baseSha, headSha) {
        super()
        this.octokit = octokit
        this.brazeClient = brazeClient
        this.owner = owner
        this.repo = repo
        this.baseSha = baseSha
        this.headSha = headSha

        Logger.info('Initializing the UpdateDeployer')
    }

    async deploy(existingContentBlocks, contentBlocksWithIds) {
        Logger.info('Deploying content blocks in the update mode')

        const response = await this.octokit.rest.repos.compareCommits({
			owner: this.owner,
			repo: this.repo,
			base: this.baseSha,
			head: this.headSha
		})

        const files = await Promise.all(
            response.data.files.map(async (file) => ({
                path: file.filename,
                content: Buffer.from((
                    await this.octokit.rest.repos.getContent({
                        owner: this.owner,
                        repo: this.repo,
                        path: file.filename,
                        ref: this.headSha
                    }).data.content,
                    'base64'
                )).toString('utf8')
            }))
        )

        Logger.debug(`Files changed in the commit: ${files.map((file) => file.path).join(', ')}`)

        const resolvedFiles = this.resolveDependencies(files, new Set(existingContentBlocks))

        for (const file of resolvedFiles) {
            const contentBlockName = this.getContentBlockName(file.path)

            Logger.debug(`Processing content block file ${contentBlockName}`)

            if (existingContentBlocks.includes(contentBlockName)) {
                await this.brazeClient.updateContentBlock(contentBlocksWithIds[contentBlockName], file.content)
                Logger.debug(`Content block ${contentBlockName} updated`)
            } else {
                await this.brazeClient.createContentBlock(contentBlockName, file.content)
                Logger.debug(`Content block ${contentBlockName} created`)
            }
        }

        Logger.info('Content blocks deployed successfully')
    }
}

module.exports = UpdateDeployer