# Add Comment (by flxbl-io)

A GitHub Action to add or update comments on Pull Requests and Issues with support for comment deduplication using message IDs.

## Features

- Add comments to PRs and Issues
- Update existing comments using a unique message ID
- Automatic comment truncation for large messages
- Works in pull_request, issue, and other workflow contexts
- Simple, focused API

## Usage

### Basic Usage

```yaml
- uses: flxbl-io/add-comment@v1
  with:
    message: |
      ## Build Results

      Build completed successfully!
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Update Existing Comment

Using `message-id` ensures that subsequent runs update the same comment instead of creating duplicates:

```yaml
- uses: flxbl-io/add-comment@v1
  with:
    message: |
      ## Deployment Status

      Deployed to production at ${{ github.event.head_commit.timestamp }}
    message-id: deployment-status
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Comment on Specific Issue/PR

```yaml
- uses: flxbl-io/add-comment@v1
  with:
    message: 'This is related to the current work.'
    issue-number: 123
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Cross-Repository Comment

```yaml
- uses: flxbl-io/add-comment@v1
  with:
    message: 'Cross-repo notification'
    issue-number: 456
    repository: owner/other-repo
    token: ${{ secrets.PAT_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `message` | The message content to post as a comment (supports Markdown) | Yes | - |
| `issue-number` | The issue or pull request number to comment on | No | Auto-detected from context |
| `pr-number` | Alias for issue-number (for pull request context) | No | Auto-detected from context |
| `repository` | The repository in owner/repo format | No | `${{ github.repository }}` |
| `token` | GitHub token for API authentication | No | `${{ github.token }}` |
| `message-id` | Unique identifier for the comment. Used to find and update existing comments instead of creating duplicates | No | - |

## Outputs

| Output | Description |
|--------|-------------|
| `comment-id` | The ID of the created or updated comment |
| `comment-created` | Whether a new comment was created (`true`/`false`) |
| `comment-updated` | Whether an existing comment was updated (`true`/`false`) |

## Examples

### Conditional Status Comment

```yaml
- uses: flxbl-io/add-comment@v1
  if: always()
  with:
    message: |
      ## CI Status: ${{ job.status }}

      ${{ job.status == 'success' && 'All checks passed!' || 'Some checks failed.' }}
    message-id: ci-status
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Multi-Line Report

```yaml
- uses: flxbl-io/add-comment@v1
  with:
    message: |
      ## Test Results

      | Metric | Value |
      |--------|-------|
      | Tests Run | 150 |
      | Passed | 148 |
      | Failed | 2 |

      <details>
      <summary>Failed Tests</summary>

      - `test_login_flow`
      - `test_checkout_process`

      </details>
    message-id: test-results
    token: ${{ secrets.GITHUB_TOKEN }}
```

## How Message ID Works

When you provide a `message-id`, the action:

1. Searches existing comments on the issue/PR for a hidden marker
2. If found, updates that comment with the new message
3. If not found, creates a new comment with the marker

This prevents duplicate comments when workflows run multiple times.

## Comment Size Limits

GitHub has a 64KB limit on comment size. If your message exceeds this limit, it will be automatically truncated with a notice appended.

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## License

See [LICENSE](LICENSE) for details.
