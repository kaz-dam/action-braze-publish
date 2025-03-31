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

    async deploy() {
        Logger.info('Deploying content blocks in the update mode')

        const response = await this.octokit.rest.repos.compareCommits({
			owner: this.owner,
			repo: this.repo,
			base: this.baseSha,
			head: this.headSha
		})

        const files = (await Promise.all(
            response.data.files.map(async (file) => {
                Logger.debug(`Getting content of file: ${file.filename}`)

                const fileContentResponse = await this.octokit.rest.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: file.filename,
                    ref: this.headSha
                })

                if (Array.isArray(fileContentResponse.data) && fileContentResponse.data.type !== 'file') {
                    return
                }

                const fileContent = Buffer.from(fileContentResponse.data.content, 'base64').toString('utf8')

                return {
                    path: file.filename,
                    content: fileContent
                }
            })
        )).filter(Boolean)

        Logger.debug(`Files changed in the commit: ${files.map((file) => file.path).join(', ')}`)

        this.publishFiles(files)

        Logger.info('Content blocks deployed successfully')
    }
}

module.exports = UpdateDeployer