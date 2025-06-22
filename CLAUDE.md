# Claude Development Guide for Roo Code

This document provides a comprehensive guide for Claude instances working on the Roo Code project. It covers the technology stack, architecture, development patterns, and key considerations for contributing effectively.

## Project Overview

**Roo Code** (previously Roo Cline) is an AI-powered autonomous coding agent that operates as a VS Code extension. It enables natural language interaction for code generation, debugging, file operations, terminal commands, and browser automation.

### Key Features

- Multi-mode AI assistant (Code, Architect, Ask, Debug modes)
- File read/write operations within VS Code workspace
- Terminal command execution
- Browser automation capabilities
- Model Context Protocol (MCP) integration
- Custom modes and instructions
- Multi-language support (18+ locales)
- Marketplace for modes and MCP servers

## Technology Stack

### Core Technologies

- **Runtime**: Node.js 20.19.2
- **Package Manager**: PNPM 10.8.1 (monorepo with workspaces)
- **Build System**: Turborepo for orchestration
- **Extension Framework**: VS Code Extension API
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Radix UI + Tailwind CSS 4.0
- **Language**: TypeScript 5.8.3

### Build Tools

- **Extension Bundling**: ESBuild (production) with custom plugins
- **Webview Bundling**: Vite 6.3.5 with React plugin
- **Styling**: Tailwind CSS 4.0 with @tailwindcss/vite
- **Code Analysis**: Tree-sitter for syntax parsing
- **Internationalization**: i18next

### AI Provider Support

Supports 15+ AI providers including:

- Anthropic (Claude) - Primary
- OpenAI (GPT models)
- AWS Bedrock
- Google Vertex AI & Gemini
- Local models (Ollama, LM Studio)
- Open source routers (OpenRouter, LiteLLM)

### Testing Framework

- **Unit Tests**: Jest (for Node.js code)
- **Frontend Tests**: Vitest (for React components)
- **E2E Tests**: VSCode Test Framework
- **Platform Support**: Linux, macOS, Windows with platform-specific test filtering

## Architecture Overview

### Monorepo Structure

```
Roo-Code/
├── src/                          # Main VS Code extension
├── webview-ui/                   # React frontend for webview
├── apps/
│   ├── vscode-e2e/              # E2E tests
│   ├── vscode-nightly/          # Nightly build variant
│   ├── web-docs/                # Documentation site
│   ├── web-evals/               # Evaluation frontend
│   └── web-roo-code/            # Marketing website
├── packages/
│   ├── types/                   # Shared TypeScript types
│   ├── build/                   # Build utilities
│   ├── config-eslint/           # ESLint configurations
│   ├── config-typescript/       # TypeScript configurations
│   ├── cloud/                   # Cloud service integration
│   ├── telemetry/               # Analytics and telemetry
│   ├── ipc/                     # Inter-process communication
│   └── evals/                   # Evaluation system
└── locales/                     # Internationalization
```

### Core Extension Architecture

#### 1. Entry Point (`src/extension.ts`)

- Initializes extension context
- Sets up output channel logging
- Loads environment variables
- Registers commands, providers, and services

#### 2. Core Modules (`src/core/`)

**ClineProvider** (`core/webview/ClineProvider.ts`)

- Main orchestrator for the webview interface
- Manages task stack and user interactions
- Handles API provider settings and configuration
- Implements telemetry and cloud service integration

**Task System** (`core/task/Task.ts`)

- Manages individual AI conversation sessions
- Handles tool execution and response processing
- Implements context tracking and sliding window
- Manages checkpoint/restore functionality

**Tool System** (`core/tools/`)

- Implements all available tools (file operations, commands, browser, MCP)
- Tool repetition detection and validation
- Each tool has its own TypeScript file with consistent interface

**Prompt System** (`core/prompts/`)

- Dynamic system prompt generation based on mode and context
- Modular prompt sections (capabilities, rules, objectives, etc.)
- Support for custom instructions and mode-specific behavior

#### 3. API Abstraction (`src/api/`)

- **Providers**: Unified interface for 15+ AI providers
- **Transform**: Request/response formatting, streaming, caching
- **Base Provider**: Common functionality across all providers
- **Router Provider**: Load balancing and fallback logic

#### 4. Integration Layer (`src/integrations/`)

- **Terminal**: Shell command execution and process management
- **Editor**: Diff views, decorations, code actions
- **Browser**: Puppeteer automation for web interactions
- **Workspace**: File system operations and tracking

#### 5. Services (`src/services/`)

- **MCP Hub**: Model Context Protocol server management
- **Code Index**: Semantic code search with embeddings
- **Marketplace**: Mode and MCP server installation
- **Checkpoints**: Git-based state management

### Frontend Architecture (`webview-ui/`)

#### React Component Structure

```
src/
├── components/
│   ├── chat/                    # Chat interface components
│   ├── common/                  # Reusable UI components
│   ├── history/                 # Task history management
│   ├── settings/                # Configuration UI
│   ├── marketplace/             # Marketplace interface
│   ├── mcp/                     # MCP server management
│   └── modes/                   # Mode selection UI
├── context/                     # React context providers
├── hooks/                       # Custom React hooks
├── utils/                       # Frontend utilities
└── i18n/                        # Internationalization setup
```

#### State Management

- React Context for global state
- TanStack Query for server state management
- Local state with React hooks
- VS Code API integration via message passing

## Development Commands

### Setup

```bash
# Install dependencies
pnpm install

# Development build with watch
pnpm bundle --watch

# Type checking with watch
pnpm watch:tsc
```

### Building & Testing

```bash
# Run all tests
pnpm test

# Lint code
pnpm lint

# Type checking
pnpm check-types

# Build for production
pnpm build

# Bundle extension
pnpm bundle

# Create VSIX package
pnpm vsix
```

### Development Workflow

```bash
# Clean build
pnpm clean

# Full development cycle
pnpm clean && pnpm lint && pnpm test && pnpm build

# Install in VS Code
pnpm vsix --out ../bin/roo-code.vsix && code --install-extension bin/roo-code.vsix
```

## Key Architectural Patterns

### 1. Mode System

The application supports multiple operational modes:

- **Code Mode**: General-purpose coding with full tool access
- **Architect Mode**: Planning and design with limited file editing
- **Ask Mode**: Question answering with read-only access
- **Debug Mode**: Systematic problem diagnosis
- **Custom Modes**: User-defined with configurable tool groups and prompts

### 2. Tool Groups

Tools are organized into logical groups:

- **Read**: File reading, search, code analysis
- **Edit**: File writing, content modification
- **Command**: Terminal execution
- **Browser**: Web automation
- **MCP**: External tool integration

### 3. Provider Abstraction

All AI providers implement a common interface:

```typescript
interface BaseProvider {
	createMessage(messages: ApiMessage[]): AsyncGenerator<ApiStreamResponse>
	validateSettings(settings: ProviderSettings): void
	getMaxTokens(): number
}
```

### 4. Message Flow

1. User input → WebView
2. WebView → Extension (via VS Code API)
3. Extension → Task processor
4. Task → Tool execution
5. Tool results → AI provider
6. AI response → WebView rendering

### 5. Internationalization

- 18+ supported languages
- JSON-based translation files
- Runtime language switching
- Locale-specific documentation

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint with custom rules (see `src/eslint.config.mjs`)
- Prettier for formatting
- Interface-first design patterns

### Testing Strategy

- Unit tests for core logic (Jest)
- Component tests for React UI (Vitest)
- Integration tests for VS Code functionality
- Platform-specific test filtering for Windows/Unix

### Error Handling

- Comprehensive error serialization
- Telemetry integration for error tracking
- User-friendly error messages
- Graceful degradation for provider failures

### File Organization

- Feature-based directory structure
- Consistent naming conventions (`camelCase` for files, `PascalCase` for classes)
- Co-located tests in `__tests__` directories
- Type definitions in dedicated files

### Performance Considerations

- Lazy loading for heavy dependencies (Tree-sitter, MCP)
- Webview resource optimization
- Token usage tracking and limits
- Sliding window for conversation context

## Common Development Tasks

### Adding a New AI Provider

1. Create provider class in `src/api/providers/`
2. Implement `BaseProvider` interface
3. Add provider configuration to types
4. Update provider router and settings UI
5. Add comprehensive tests

### Adding a New Tool

1. Create tool file in `src/core/tools/`
2. Implement tool interface with validation
3. Add tool to appropriate tool group
4. Update prompt system descriptions
5. Add unit tests and error handling

### Adding UI Components

1. Create React component in appropriate directory
2. Use Radix UI primitives for accessibility
3. Apply Tailwind CSS for styling
4. Add internationalization support
5. Write component tests

### Modifying System Prompts

1. Update relevant section in `src/core/prompts/sections/`
2. Ensure mode-specific customization
3. Test with different provider models
4. Update documentation if needed

## Important Considerations

### Security

- File access respects `.rooignore` patterns
- Protected directories prevent sensitive file access
- Command execution requires user approval
- Browser automation in sandboxed environment

### Compatibility

- VS Code version 1.84.0+ required
- Node.js 20.19.2 specific dependency
- Cross-platform terminal handling
- Provider-specific model limitations

### Performance

- Tree-sitter parsing for large codebases
- Streaming responses for better UX
- Efficient context window management
- Lazy loading of heavy dependencies

### Extensibility

- MCP protocol for external tools
- Custom mode definitions
- Provider plugin architecture
- Marketplace integration

## Debugging Tips

### Common Issues

1. **Extension not loading**: Check VS Code developer console
2. **Webview not rendering**: Verify Vite build output
3. **Tool execution failures**: Check terminal output and permissions
4. **Provider API errors**: Verify API keys and rate limits

### Development Tools

- VS Code Extension Host for debugging
- Chrome DevTools for webview debugging
- Output channel logging for extension logs
- Telemetry dashboard for usage analytics

This guide should help Claude instances understand the codebase structure, make informed decisions about code changes, and maintain consistency with the project's architecture and patterns.
