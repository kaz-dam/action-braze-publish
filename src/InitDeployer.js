const fs = require('fs')
const path = require('path')
const Constants = require('./Constants')
const BaseDeployer = require('./BaseDeployer')
const Logger = require('./Logger')

class InitDeployer extends BaseDeployer {
    constructor(brazeClient) {
        super()
        this.brazeClient = brazeClient
        this.workspacePath = process.env.GITHUB_WORKSPACE

        Logger.info('Initializing the InitDeployer')
        Logger.debug(`Workspace path: ${this.workspacePath}`)
    }

    async deploy(existingContentBlocks, contentBlocksWithIds, brazeContentBlockPrefix = '') {
        Logger.info('Deploying content blocks in the init mode')

        const files = this.getAllFiles(path.join(this.workspacePath, Constants.CONTENT_BLOCKS_DIR))

        const resolvedFile = this.resolveDependencies(files, existingContentBlocks)

        for (const file of resolvedFile) {
            const contentBlockName = this.getContentBlockName(file.path)

            Logger.debug(`Processing content block file ${contentBlockName}`)

            if (existingContentBlocks.includes(contentBlockName)) {
                await this.brazeClient.updateContentBlock(contentBlocksWithIds[contentBlockName], file.content)
                Logger.debug(`Content block ${contentBlockName} updated`)
            } else {
                const prefixedContentBlockName = this.addPrefixToContentBlockName(contentBlockName, brazeContentBlockPrefix)

                await this.brazeClient.createContentBlock(prefixedContentBlockName, file.content)
                Logger.debug(`Content block ${prefixedContentBlockName} created`)
            }
        }

        Logger.info('Content blocks deployed successfully')
    }

    getAllFiles(dirPath, files = []) {
        const items = fs.readdirSync(dirPath)

        for (const item of items) {
            const fullPath = path.join(dirPath, item)

            if (fs.statSync(fullPath).isDirectory()) {
                this.getAllFiles(fullPath, files)
            } else if (Constants.FILE_EXTENSIONS.includes(path.extname(fullPath).slice(1))) {
                files.push({
                    path: fullPath,
                    content: fs.readFileSync(fullPath, 'utf8')
                })
            }
        }

        return files
    }
}

module.exports = InitDeployer