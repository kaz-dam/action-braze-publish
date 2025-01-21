const core = require('@actions/core')
const Constants = require('./Constants')
const BaseDeployer = require('./BaseDeployer')

class UpdateDeployer extends BaseDeployer {
    constructor(octokit, brazeClient, owner, repo, baseSha, headSha) {
        this.octokit = octokit
        this.brazeClient = brazeClient
        this.owner = owner
        this.repo = repo
        this.baseSha = baseSha
        this.headSha = headSha
    }

    async deploy(existingContentBlocks) {
        core.info('Running Update Mode - Uploading changed or new content blocks.')

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

        const resolvedFiles = this.resolveDependencies(files, new Set(existingContentBlocks))

        for (const file of resolvedFiles) {
            const contentBlockName = this.getContentBlockName(file.path)

            if (existingContentBlocks.includes(contentBlockName)) {
                await this.brazeClient.updateContentBlock(contentBlockName, file.content)
            } else {
                await this.brazeClient.createContentBlock(contentBlockName, file.content)
            }
        }
    }
}

module.exports = UpdateDeployer