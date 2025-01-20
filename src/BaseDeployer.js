class BaseDeployer {
    constructor(brazeClient) {
        this.brazeClient = brazeClient
    }

    resolveDependencies(files, existingBlocks) {
        const dependencyGraph = new Map()
        const fileMap = new Map()

        for (const file of files) {
            const fileName = this.getContentBlockName(file)
            const content = file.content

            fileMap.set(fileName, file)

            const dependencies = this.extractReferences(content)
            dependencyGraph.set(fileName, dependencies)
        }

        const resolved = new Set()
        const orderedFiles = []

        const resolveFile = (fileName) => {
            if (resolved.has(fileName)) return

            const dependencies = dependencyGraph.get(fileName) || []

            for (const dependency of dependencies) {
                if (!resolved.has(dependency) && !existingBlocks.has(dependency)) {
                    if (!fileMap.has(dependency)) {
                        throw new Error(`Referenced content block '${dependency}' does not exist in the repository or Braze.`)
                    }

                    resolveFile(dependency)
                }
            }

            if (fileMap.has(fileName)) {
                orderedFiles.push(fileMap.get(fileName))
                resolved.add(fileName)
            }
        }

        for (const fileName of dependencyGraph.keys()) {
            resolveFile(fileName)
        }

        return orderedFiles
    }

    extractReferences(content) {
        const regex = /\{\{content_blocks\.\$\{([\w-]+)\}\}\}/g
        const references = []
        let match

        while ((match = regex.exec(content)) !== null) {
            references.push(match[1])
        }

        return references
    }

    getContentBlockName(filePath) {
        return filePath.split('/').pop().split('.').slice(0, -1).join('.')
    }
}

module.exports = BaseDeployer