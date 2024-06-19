# Publish files to Braze as Content Blocks

This action is checking the changed files in the repository that is running on,
and if the files are considered as content blocks, then it will push the
contents of these files into the Braze instance.

## Inputs

### `GITHUB_TOKEN`

**Required** GitHub token provided by the core GitHub library.

### `BRAZE_REST_ENDPOINT`

**Required** The Braze base REST URL that you can find yours
[here](https://www.braze.com/docs/api/basics/#endpoints).

### `BRAZE_API_KEY`

**Required** The API key that you can create in your Braze instance where you
want to push the files into. You can find the guide
[here](https://www.braze.com/docs/api/basics/#rest-api-key).

## Outputs

There are no outputs yet.

## Example usage

```yaml
uses: actions/action-braze-publish@v1
with:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  BRAZE_REST_ENDPOINT: ${{ secrets.BRAZE_REST_ENDPOINT }}
  BRAZE_API_KEY: ${{ secrets.BRAZE_API_KEY }}
```
