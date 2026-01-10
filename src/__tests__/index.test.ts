// Mock setup before imports
const mockCreateComment = jest.fn();
const mockUpdateComment = jest.fn();
const mockPaginateIterator = jest.fn();

const mockOctokit = {
  rest: {
    issues: {
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
    },
  },
  paginate: {
    iterator: mockPaginateIterator,
  },
};

// Mutable context object
const mockContext = {
  payload: {
    pull_request: { number: 42 } as { number: number } | undefined,
    issue: undefined as { number: number } | undefined,
  },
  repo: { owner: 'test-owner', repo: 'test-repo' },
  sha: 'abc123',
};

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => mockOctokit),
  get context() {
    return mockContext;
  },
}));

// Mock @actions/core
const mockGetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockSetFailed = jest.fn();
const mockInfo = jest.fn();
const mockDebug = jest.fn();

jest.mock('@actions/core', () => ({
  getInput: (name: string, _options?: { required?: boolean }) => mockGetInput(name),
  setOutput: (name: string, value: string) => mockSetOutput(name, value),
  setFailed: (message: string) => mockSetFailed(message),
  info: (message: string) => mockInfo(message),
  debug: (message: string) => mockDebug(message),
}));

// Import after mocks are set up
import { run } from '../index';

describe('add-comment action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default input values
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        message: 'Test comment message',
        repository: 'test-owner/test-repo',
        token: 'test-token',
        'message-id': '',
        'issue-number': '',
        'pr-number': '',
      };
      return inputs[name] || '';
    });

    // Reset context for each test
    mockContext.payload = {
      pull_request: { number: 42 },
      issue: undefined,
    };
  });

  describe('run', () => {
    it('should create a new comment when no message-id is provided', async () => {
      mockCreateComment.mockResolvedValue({
        data: {
          id: 12345,
          body: 'Test comment message',
          html_url: 'https://github.com/test-owner/test-repo/issues/42#issuecomment-12345',
        },
      });

      await run();

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42,
        body: 'Test comment message',
      });

      expect(mockSetOutput).toHaveBeenCalledWith('comment-id', '12345');
      expect(mockSetOutput).toHaveBeenCalledWith('comment-created', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('comment-updated', 'false');
    });

    it('should create a new comment with message-id header when not found', async () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          message: 'Test comment message',
          repository: 'test-owner/test-repo',
          token: 'test-token',
          'message-id': 'test-id',
          'issue-number': '',
          'pr-number': '',
        };
        return inputs[name] || '';
      });

      // Mock paginate.iterator to return empty results (no existing comment)
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield { data: [] };
        })()
      );

      mockCreateComment.mockResolvedValue({
        data: {
          id: 12345,
          body: '<!-- add-comment:test-id -->\n\nTest comment message',
          html_url: 'https://github.com/test-owner/test-repo/issues/42#issuecomment-12345',
        },
      });

      await run();

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42,
        body: '<!-- add-comment:test-id -->\n\nTest comment message',
      });
    });

    it('should update existing comment when message-id is found', async () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          message: 'Updated message',
          repository: 'test-owner/test-repo',
          token: 'test-token',
          'message-id': 'test-id',
          'issue-number': '',
          'pr-number': '',
        };
        return inputs[name] || '';
      });

      // Mock paginate.iterator to return existing comment
      mockPaginateIterator.mockReturnValue(
        (async function* () {
          yield {
            data: [
              {
                id: 99999,
                body: '<!-- add-comment:test-id -->\n\nOld message',
                html_url: 'https://github.com/test-owner/test-repo/issues/42#issuecomment-99999',
              },
            ],
          };
        })()
      );

      mockUpdateComment.mockResolvedValue({
        data: {
          id: 99999,
          body: '<!-- add-comment:test-id -->\n\nUpdated message',
          html_url: 'https://github.com/test-owner/test-repo/issues/42#issuecomment-99999',
        },
      });

      await run();

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 99999,
        body: '<!-- add-comment:test-id -->\n\nUpdated message',
      });

      expect(mockSetOutput).toHaveBeenCalledWith('comment-id', '99999');
      expect(mockSetOutput).toHaveBeenCalledWith('comment-created', 'false');
      expect(mockSetOutput).toHaveBeenCalledWith('comment-updated', 'true');
    });

    it('should use issue-number input when provided', async () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          message: 'Test message',
          repository: 'test-owner/test-repo',
          token: 'test-token',
          'message-id': '',
          'issue-number': '123',
          'pr-number': '',
        };
        return inputs[name] || '';
      });

      mockCreateComment.mockResolvedValue({
        data: {
          id: 12345,
          body: 'Test message',
          html_url: 'https://example.com',
        },
      });

      await run();

      expect(mockCreateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
        })
      );
    });

    it('should fail when no issue number can be determined', async () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          message: 'Test message',
          repository: 'test-owner/test-repo',
          token: 'test-token',
          'message-id': '',
          'issue-number': '',
          'pr-number': '',
        };
        return inputs[name] || '';
      });

      // Clear the pull_request from context
      mockContext.payload = {
        pull_request: undefined,
        issue: undefined,
      };

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine issue/PR number')
      );
    });

    it('should use pr-number input as alias for issue-number', async () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          message: 'Test message',
          repository: 'test-owner/test-repo',
          token: 'test-token',
          'message-id': '',
          'issue-number': '',
          'pr-number': '456',
        };
        return inputs[name] || '';
      });

      mockCreateComment.mockResolvedValue({
        data: {
          id: 12345,
          body: 'Test message',
          html_url: 'https://example.com',
        },
      });

      await run();

      expect(mockCreateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 456,
        })
      );
    });
  });
});
