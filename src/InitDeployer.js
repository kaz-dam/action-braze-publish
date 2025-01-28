const fs = require('fs')
const path = require('path')
const Constants = require('./Constants')
const BaseDeployer = require('./BaseDeployer')

class InitDeployer extends BaseDeployer {
    constructor(brazeClient) {
        super()
        this.brazeClient = brazeClient
        this.workspacePath = process.env.GITHUB_WORKSPACE
    }

    async deploy(existingContentBlocks) {
        const files = this.getAllFiles(path.join(this.workspacePath, Constants.CONTENT_BLOCKS_DIR))

        const resolvedFile = this.resolveDependencies(files, existingContentBlocks)

        for (const file of resolvedFile) {
            const contentBlockName = this.getContentBlockName(file.path)

            if (existingContentBlocks.includes(contentBlockName)) {
                await this.brazeClient.updateContentBlock(contentBlockName, file.content)
            } else {
                await this.brazeClient.createContentBlock(contentBlockName, file.content)
            }
        }
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