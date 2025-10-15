# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
  gemini command:

### Examples:

**Single file analysis:**
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results

# OpenAI Codex MCP Server

The OpenAI Codex MCP server is installed and available for code generation, explanation, and debugging tasks. It provides access to OpenAI's models through specialized methods.

## Available Methods

### write_code
Generate code for specific tasks with language specification:
- **Parameters**: `task` (string), `language` (string), `model` (optional)
- **Example**: "Use OpenAI Codex to write a Python function that calculates prime numbers"

### explain_code
Get detailed explanations of code functionality:
- **Parameters**: `code` (string), `model` (optional)
- **Example**: "Use OpenAI Codex to explain this quicksort algorithm"

### debug_code
Find and fix bugs in code:
- **Parameters**: `code` (string), `issue_description` (optional), `model` (optional)
- **Example**: "Use OpenAI Codex to debug this JavaScript function"

### codex_completion
General code generation and explanations:
- **Parameters**: `prompt` (string), `model` (optional), `images` (optional), `additional_args` (optional)
- **Example**: "Use OpenAI Codex to write a sorting algorithm"

## Available Models

### Reasoning Models (O-series)
- `o3`: Most powerful reasoning model
- `o3-mini`: Small alternative to o3
- `o1`: Previous full o-series reasoning model
- `o1-mini`: Small alternative to o1
- `o1-pro`: Version of o1 with more compute

### GPT Models
- `gpt-4.1`: Flagship GPT model for complex tasks
- `gpt-4o`: Fast, intelligent, flexible GPT model
- `gpt-4.1-mini`: Balanced for intelligence, speed, and cost
- `gpt-4o-mini`: Fast, affordable small model

## When to Use OpenAI Codex

Use OpenAI Codex when:
- You need a different perspective on code generation
- Complex algorithmic problems require reasoning models
- Debugging challenging issues
- Explaining complex code patterns
- User specifically requests OpenAI Codex usage
- Want to compare solutions from different AI models

## Usage Examples

The user can request OpenAI Codex by saying:
- "Use OpenAI Codex to write a Python sorting function"
- "Ask OpenAI Codex to explain this algorithm"
- "Use OpenAI Codex with the o3 model to debug this code"
- "Can you use OpenAI Codex to generate a React component?"