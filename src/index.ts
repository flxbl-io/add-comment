import * as core from '@actions/core';
import * as github from '@actions/github';

// Version from package.json
const VERSION = '1.0.0';
const ACTION_NAME = 'add-comment';

type Octokit = ReturnType<typeof github.getOctokit>;

// Simplified types for comment data
interface CommentData {
  id: number;
  body?: string;
  html_url: string;
}

// GitHub has a 64KB limit on comment size, we use 60KB to be safe
const GITHUB_COMMENT_MAX_SIZE = 61440; // 60 * 1024 bytes

function printHeader(repository: string, issueNumber: number, messageId: string): void {
  const line = '-'.repeat(90);
  console.log(line);
  console.log(`flxbl-actions  -- ❤️  by flxbl.io ❤️  -Version:${VERSION}`);
  console.log(line);
  console.log(`Action       : ${ACTION_NAME}`);
  console.log(`Repository   : ${repository}`);
  console.log(`Issue/PR     : #${issueNumber}`);
  if (messageId) {
    console.log(`Message ID   : ${messageId}`);
  }
  console.log(line);
  console.log();
}

function truncateComment(body: string): string {
  if (Buffer.byteLength(body, 'utf8') <= GITHUB_COMMENT_MAX_SIZE) {
    return body;
  }

  const truncationMessage = '\n\n[Comment was truncated due to GitHub\'s size limit]';
  let truncated = body;

  // Keep truncating until we're under the limit including our message
  while (Buffer.byteLength(truncated + truncationMessage, 'utf8') > GITHUB_COMMENT_MAX_SIZE) {
    // Remove characters from the end to preserve context at start
    const targetLength = Math.floor(truncated.length * 0.9);
    truncated = truncated.slice(0, targetLength);
  }

  return truncated + truncationMessage;
}

function buildCommentMarker(messageId: string): string {
  return `<!-- add-comment:${messageId} -->`;
}

function addCommentHeader(messageId: string, message: string): string {
  if (!messageId) {
    return message;
  }
  return `${buildCommentMarker(messageId)}\n\n${message}`;
}

async function findExistingComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  messageId: string
): Promise<CommentData | undefined> {
  if (!messageId) {
    return undefined;
  }

  const marker = buildCommentMarker(messageId);
  const parameters = {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  };

  for await (const comments of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    parameters
  )) {
    const found = comments.data.find(({ body }) => {
      return (body?.includes(marker)) ?? false;
    });

    if (found) {
      return {
        id: found.id,
        body: found.body ?? undefined,
        html_url: found.html_url,
      };
    }
  }

  return undefined;
}

async function createComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<CommentData> {
  const truncatedBody = truncateComment(body);

  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: truncatedBody,
  });

  return {
    id: response.data.id,
    body: response.data.body ?? undefined,
    html_url: response.data.html_url,
  };
}

async function updateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<CommentData> {
  const truncatedBody = truncateComment(body);

  const response = await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body: truncatedBody,
  });

  return {
    id: response.data.id,
    body: response.data.body ?? undefined,
    html_url: response.data.html_url,
  };
}

function getIssueNumber(): number | undefined {
  // Try to get from inputs first
  const issueNumberInput = core.getInput('issue-number');
  const prNumberInput = core.getInput('pr-number');

  if (issueNumberInput) {
    return parseInt(issueNumberInput, 10);
  }

  if (prNumberInput) {
    return parseInt(prNumberInput, 10);
  }

  // Try to get from context
  const { payload } = github.context;

  if (payload.pull_request?.number) {
    return payload.pull_request.number;
  }

  if (payload.issue?.number) {
    return payload.issue.number;
  }

  return undefined;
}

export async function run(): Promise<void> {
  try {
    // Get inputs
    const message = core.getInput('message', { required: true });
    const repository = core.getInput('repository') || process.env.GITHUB_REPOSITORY || '';
    const token = core.getInput('token', { required: true });
    const messageId = core.getInput('message-id');

    // Get issue number
    const issueNumber = getIssueNumber();

    if (!issueNumber) {
      throw new Error(
        'Could not determine issue/PR number. Please provide issue-number or pr-number input, ' +
        'or run this action in a pull_request or issue context.'
      );
    }

    if (!repository) {
      throw new Error('Repository not specified and GITHUB_REPOSITORY not set');
    }

    // Parse repository
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repository format: ${repository}. Expected owner/repo`);
    }

    // Print header
    printHeader(repository, issueNumber, messageId);

    // Initialize Octokit
    const octokit = github.getOctokit(token);

    // Build comment body with header if messageId is provided
    const body = addCommentHeader(messageId, message);

    // Check for existing comment if messageId is provided
    let existingComment: CommentData | undefined;
    if (messageId) {
      core.info(`Searching for existing comment with message-id: ${messageId}`);
      existingComment = await findExistingComment(octokit, owner, repo, issueNumber, messageId);
    }

    let comment: CommentData;
    let created = false;
    let updated = false;

    if (existingComment) {
      core.info(`Found existing comment (ID: ${existingComment.id}), updating...`);
      comment = await updateComment(octokit, owner, repo, existingComment.id, body);
      updated = true;
      core.info(`Comment updated successfully`);
    } else {
      core.info(`Creating new comment on issue/PR #${issueNumber}...`);
      comment = await createComment(octokit, owner, repo, issueNumber, body);
      created = true;
      core.info(`Comment created successfully`);
    }

    // Set outputs
    core.setOutput('comment-id', comment.id.toString());
    core.setOutput('comment-created', created.toString());
    core.setOutput('comment-updated', updated.toString());

    core.info(`Comment ID: ${comment.id}`);
    core.info(`Comment URL: ${comment.html_url}`);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

// Run the action only when executed directly (not when imported for testing)
if (require.main === module) {
  run();
}
