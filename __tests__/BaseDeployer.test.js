const BaseDeployer = require('../src/BaseDeployer')
const BrazeApiClient = require('../src/BrazeApiClient')

jest.mock('../src/BrazeApiClient')

describe('BaseDeployer', () => {
	let baseDeployer
	let mockBrazeClient
	const mockContentBlocksDir = 'content_blocks'

	beforeEach(() => {
		mockBrazeClient = {
			updateContentBlock: jest.fn(),
			createContentBlock: jest.fn()
		}
		BrazeApiClient.mockImplementation(() => mockBrazeClient)

		baseDeployer = new BaseDeployer(mockBrazeClient)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('addPrefixToContentBlockName', () => {
		it('should add a prefix to the content block name', () => {
			const contentBlockName = 'file1'
			const prefix = 'prefix_'

			const result = baseDeployer.addPrefixToContentBlockName(
				contentBlockName,
				prefix
			)

			expect(result).toEqual('prefix_file1')
		})
	})

	describe('publishFiles', () => {
		beforeEach(() => {
			baseDeployer.setContentBlockProperties(
				['file1'],
				{ file1: 'id1' },
				''
			)
		})

		it('should update existing content blocks and create new ones', async () => {
			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/file1.liquid`,
					content: 'Content of file1.liquid'
				},
				{
					path: `${mockContentBlocksDir}/file2.liquid`,
					content: 'Content of file2.liquid'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith(
				'id1',
				'Content of file1.liquid'
			)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'file2',
				'Content of file2.liquid'
			)
		})

		it('should skip the files that are not content blocks', async () => {
			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/file1.liquid`,
					content: 'Content of file1.liquid'
				},
				{
					path: `.github/workflows/file2.json`,
					content: 'Content of file2.json'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith(
				'id1',
				'Content of file1.liquid'
			)
			expect(
				mockBrazeClient.createContentBlock
			).not.toHaveBeenCalledWith()
		})
	})

	describe('setContentBlockProperties', () => {
		it('should set the existing content blocks, content block ids, and with prefix', () => {
			const existingContentBlocks = ['file1']
			const contentBlocksWithIds = { file1: 'id1' }
			const prefix = 'prefix_'

			baseDeployer.setContentBlockProperties(
				existingContentBlocks,
				contentBlocksWithIds,
				prefix
			)

			expect(baseDeployer.existingContentBlocks).toEqual(
				existingContentBlocks
			)
			expect(baseDeployer.contentBlocksWithIds).toEqual(
				contentBlocksWithIds
			)
			expect(baseDeployer.brazeContentBlockPrefix).toEqual(prefix)
			expect(baseDeployer.createProdContentBlockForNewFiles).toEqual(
				false
			)
		})

		it('should enable prod content block creation for new files', () => {
			baseDeployer.setContentBlockProperties(
				['file1'],
				{ file1: 'id1' },
				'STAGE_',
				true
			)

			expect(baseDeployer.createProdContentBlockForNewFiles).toEqual(true)
		})

		it('should set the existing content blocks, content block ids, and without prefix', () => {
			const existingContentBlocks = ['file1']
			const contentBlocksWithIds = { file1: 'id1' }

			baseDeployer.setContentBlockProperties(
				existingContentBlocks,
				contentBlocksWithIds
			)

			expect(baseDeployer.existingContentBlocks).toEqual(
				existingContentBlocks
			)
			expect(baseDeployer.contentBlocksWithIds).toEqual(
				contentBlocksWithIds
			)
			expect(baseDeployer.brazeContentBlockPrefix).toEqual('')
			expect(baseDeployer.createProdContentBlockForNewFiles).toEqual(
				false
			)
		})
	})

	describe('publishFiles on the stage branch', () => {
		const stagePrefix = 'STAGE_'

		beforeEach(() => {
			baseDeployer.setContentBlockProperties(
				['STAGE_api_title_data', 'STAGE_brand_styling_controller'],
				{
					STAGE_api_title_data: 'api-title-id',
					STAGE_brand_styling_controller: 'brand-styling-id'
				},
				stagePrefix,
				true
			)
		})

		it('should create the prefixed block and the prod block for a new file before updating references', async () => {
			const newBlockContent = 'abort logic'
			const apiTitleContent =
				'uses {{content_blocks.${strategic_abort_logic}}}'
			const brandStylingContent =
				'also uses {{content_blocks.${strategic_abort_logic}}}'
			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/api_title_data.liquid`,
					content: apiTitleContent,
					status: 'modified'
				},
				{
					path: `${mockContentBlocksDir}/brand_styling_controller.liquid`,
					content: brandStylingContent,
					status: 'modified'
				},
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: newBlockContent,
					status: 'added'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.createContentBlock).toHaveBeenNthCalledWith(
				1,
				'STAGE_strategic_abort_logic',
				newBlockContent
			)
			expect(mockBrazeClient.createContentBlock).toHaveBeenNthCalledWith(
				2,
				'strategic_abort_logic',
				newBlockContent
			)
			expect(mockBrazeClient.updateContentBlock).toHaveBeenNthCalledWith(
				1,
				'api-title-id',
				apiTitleContent
			)
			expect(mockBrazeClient.updateContentBlock).toHaveBeenNthCalledWith(
				2,
				'brand-styling-id',
				brandStylingContent
			)

			const prodCreateOrder =
				mockBrazeClient.createContentBlock.mock.invocationCallOrder[1]
			const firstUpdateOrder =
				mockBrazeClient.updateContentBlock.mock.invocationCallOrder[0]
			expect(prodCreateOrder).toBeLessThan(firstUpdateOrder)
		})

		it('should create the missing prod block when the prefixed block already exists', async () => {
			baseDeployer.setContentBlockProperties(
				['STAGE_strategic_abort_logic'],
				{ STAGE_strategic_abort_logic: 'stage-id' },
				stagePrefix,
				true
			)

			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: 'abort logic',
					status: 'added'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.updateContentBlock).toHaveBeenCalledWith(
				'stage-id',
				'abort logic'
			)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledTimes(1)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'strategic_abort_logic',
				'abort logic'
			)
		})

		it('should not create a prod block for a modified file', async () => {
			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: 'updated abort logic',
					status: 'modified'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledTimes(1)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'STAGE_strategic_abort_logic',
				'updated abort logic'
			)
		})

		it('should not create a prod block when that name already exists', async () => {
			baseDeployer.setContentBlockProperties(
				['strategic_abort_logic'],
				{ strategic_abort_logic: 'prod-id' },
				stagePrefix,
				true
			)

			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: 'abort logic',
					status: 'added'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledTimes(1)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'STAGE_strategic_abort_logic',
				'abort logic'
			)
		})

		it('should not create a second block when no prefix is configured', async () => {
			baseDeployer.setContentBlockProperties([], {}, '', true)

			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: 'abort logic',
					status: 'added'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledTimes(1)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'strategic_abort_logic',
				'abort logic'
			)
		})

		it('should not create a prod block when the stage behaviour is disabled', async () => {
			baseDeployer.setContentBlockProperties([], {}, stagePrefix, false)

			const mockFiles = [
				{
					path: `${mockContentBlocksDir}/strategic_abort_logic.liquid`,
					content: 'abort logic',
					status: 'added'
				}
			]

			await baseDeployer.publishFiles(mockFiles)

			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledTimes(1)
			expect(mockBrazeClient.createContentBlock).toHaveBeenCalledWith(
				'STAGE_strategic_abort_logic',
				'abort logic'
			)
		})
	})

	describe('resolveDependencies', () => {
		beforeEach(() => {
			jest.spyOn(baseDeployer, 'getContentBlockName').mockImplementation(
				filePath =>
					filePath.split('/').pop().split('.').slice(0, -1).join('.')
			)
		})

		it('should return files in the correct order without dependencies', () => {
			const mockFilesArray = [
				{
					path: `${mockContentBlocksDir}/file1.liquid`,
					content: `Content of ${mockContentBlocksDir}/file1.liquid`
				},
				{
					path: `${mockContentBlocksDir}/file2.liquid`,
					content: `Content of ${mockContentBlocksDir}/file2.liquid`
				}
			]
			const existingContentBlocks = ['file1', 'file2']

			const result = baseDeployer.resolveDependencies(
				mockFilesArray,
				existingContentBlocks
			)

			expect(result).toEqual(mockFilesArray)
		})

		it('should return files in the correct order with dependencies', () => {
			const mockFilesArray = [
				{
					path: `${mockContentBlocksDir}/file2.liquid`,
					content: `Content of ${mockContentBlocksDir}/file2.liquid which contains a reference to {{content_blocks.\${file1}}} content block`
				},
				{
					path: `${mockContentBlocksDir}/file1.liquid`,
					content: `Content of ${mockContentBlocksDir}/file1.liquid`
				}
			]
			const existingContentBlocks = ['file3', 'file4']

			const result = baseDeployer.resolveDependencies(
				mockFilesArray,
				existingContentBlocks
			)

			mockFilesArray.reverse()
			expect(result).toEqual(mockFilesArray)
		})

		it('should skip a referenced content block that does not exist', () => {
			const mockFilesArray = [
				{
					path: `${mockContentBlocksDir}/file2.liquid`,
					content: `Content of ${mockContentBlocksDir}/file2.liquid which contains a reference to {{content_blocks.\${file5}}} content block`
				},
				{
					path: `${mockContentBlocksDir}/file1.liquid`,
					content: `Content of ${mockContentBlocksDir}/file1.liquid`
				}
			]
			const existingContentBlocks = ['file3', 'file4']

			const result = baseDeployer.resolveDependencies(
				mockFilesArray,
				existingContentBlocks
			)

			expect(result).toEqual(mockFilesArray)
		})
	})

	describe('resolveFile', () => {
		it('should return early if the file is already resolved', () => {
			baseDeployer.resolved.add('file1')

			expect(() => {
				baseDeployer.resolveFile('file1')
			}).not.toThrow()

			expect(baseDeployer.orderedFiles).toEqual([])
		})

		it('should skip a dependency that does not exist in fileMap', () => {
			const file1 = { path: 'path/file1', content: 'content' }
			baseDeployer.fileMap.set('file1', file1)
			baseDeployer.dependencyGraph.set('file1', ['file2'])

			baseDeployer.resolveFile('file1', [])

			expect(baseDeployer.orderedFiles).toEqual([file1])
		})

		it('should resolve dependencies and track file names', () => {
			baseDeployer.fileMap.set('file2', {
				path: 'path/file2',
				content: 'content'
			})
			baseDeployer.fileMap.set('file1', {
				path: 'path/file1',
				content: 'content'
			})

			baseDeployer.dependencyGraph.set('file1', ['file2'])
			baseDeployer.dependencyGraph.set('file2', [])

			baseDeployer.resolveFile('file1', [])

			expect(baseDeployer.orderedFiles).toEqual([
				{ path: 'path/file2', content: 'content' },
				{ path: 'path/file1', content: 'content' }
			])
			expect(baseDeployer.resolved.has('file1')).toBe(true)
			expect(baseDeployer.resolved.has('file2')).toBe(true)
		})

		it('should skip the dependency if it is already resolved and exists in existingContentBlocks', () => {
			baseDeployer.fileMap.set('file1', {
				path: 'path/file1',
				content: 'content'
			})
			baseDeployer.fileMap.set('file2', {
				path: 'path/file2',
				content: 'content'
			})

			baseDeployer.dependencyGraph.set('file1', ['file2'])
			baseDeployer.dependencyGraph.set('file2', [])

			baseDeployer.resolved.add('file2')
			const existingContentBlocks = ['file2']

			baseDeployer.resolveFile('file1', existingContentBlocks)

			expect(baseDeployer.orderedFiles).toEqual([
				{ path: 'path/file1', content: 'content' }
			])
		})
	})

	describe('getDependencyGraph', () => {
		it('should return an array of dependencies for a given file', () => {
			baseDeployer.dependencyGraph = new Map([])

			baseDeployer.dependencyGraph.set('file1', ['file2', 'file3'])

			const result = baseDeployer.getDependencyGraph('file1')

			expect(result).toEqual(['file2', 'file3'])
		})

		it('should return an empty array if the file has no dependencies', () => {
			baseDeployer.dependencyGraph = new Map([])

			baseDeployer.dependencyGraph.set('file1', [])

			const result = baseDeployer.getDependencyGraph('file1')

			expect(result).toEqual([])
		})

		it('should return an empty array if fileName does not exist in the dependencyGraph', () => {
			baseDeployer.dependencyGraph = new Map()

			const result = baseDeployer.getDependencyGraph('file1')

			expect(result).toEqual([])
		})
	})

	describe('createDependencyGraph', () => {
		it('should create a dependency graph with no dependencies', () => {
			const mockFiles = [
				{
					path: 'content_blocks/file1.liquid',
					content: 'No dependencies here'
				}
			]

			jest.spyOn(baseDeployer, 'extractReferences').mockReturnValue([])

			baseDeployer.createDependencyGraph(mockFiles)

			expect(baseDeployer.dependencyGraph.get('file1')).toEqual([])
		})

		it('should create a dependency graph with multiple dependencies', () => {
			const mockFiles = [
				{
					path: 'content_blocks/file1.liquid',
					content:
						'Content with {{content_blocks.${file2}}} and {{content_blocks.${file3}}}'
				}
			]

			jest.spyOn(baseDeployer, 'extractReferences').mockReturnValue([
				'file2',
				'file3'
			])

			baseDeployer.createDependencyGraph(mockFiles)

			expect(baseDeployer.dependencyGraph.get('file1')).toEqual([
				'file2',
				'file3'
			])
			expect(baseDeployer.fileMap.get('file1')).toEqual(mockFiles[0])
		})
	})

	describe('trackFileNames', () => {
		it('should add the file to orderedFiles and resolved set if it exists in fileMap', () => {
			const mockFile = { path: 'path/file1.liquid', content: 'content' }
			baseDeployer.fileMap.set('file1', mockFile)

			baseDeployer.trackFileNames('file1')

			expect(baseDeployer.orderedFiles).toEqual([mockFile])
			expect(baseDeployer.resolved.has('file1')).toBe(true)
		})

		it('should not add the file if it does not exist in fileMap', () => {
			baseDeployer.trackFileNames('file1')

			expect(baseDeployer.orderedFiles).toEqual([])
			expect(baseDeployer.resolved.has('file1')).toBe(false)
		})
	})

	describe('extractReferences', () => {
		it('should return an empty array if there are no references in the content', () => {
			const content = 'This content has no references.'

			const result = baseDeployer.extractReferences(content)

			expect(result).toEqual([])
		})

		it('should return an array of references if they exist in the content', () => {
			const content =
				'This content has {{content_blocks.${file1}}} and {{content_blocks.${file2}}}'

			const result = baseDeployer.extractReferences(content)

			expect(result).toEqual(['file1', 'file2'])
		})
	})

	describe('getContentBlockName', () => {
		it('should return the file name without the extension', () => {
			const filePath = 'content_blocks/file1.liquid'

			const result = baseDeployer.getContentBlockName(filePath)

			expect(result).toEqual('file1')
		})

		it('should handle file paths with no extensions', () => {
			const filePath = 'content_blocks/file1.liquid'

			const result = baseDeployer.getContentBlockName(filePath)

			expect(result).toEqual('file1')
		})

		it('should return an empty string for invalid paths', () => {
			const filePath = ''

			const result = baseDeployer.getContentBlockName(filePath)

			expect(result).toEqual('')
		})
	})
})
