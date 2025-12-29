# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running

- `yarn build` - Compile TypeScript to `dist/` directory
- `yarn dev` - Run in development mode using tsx (no compilation step)
- `yarn dev serve` - Run in development mode to serve the app
- `yarn dev clear-cache` - Run in development mode to clear application cache
- `node dist/main.js init` - Initialize configuration (creates config.json)
- `node dist/main.js serve` - Start the web server and transcoder cluster
- `yarn test` - Run unit tests using Vitest

### Package Management

- **Always use `yarn`**, never `npm`

## Architecture Overview

This is a **multi-process video transcoding application** that provides on-the-fly HLS/DASH streaming with adaptive
bitrate support.

### Core Architecture Pattern: Clustered Microservices

**Three Worker Types:**

1. **Web Worker**: HTTP server serving API endpoints and static files
2. **Transcoder Worker**: Manages video transcoding sessions and FFmpeg processes
3. **Queue Worker**: Handles background task processing with priority queues

**Communication:** Workers communicate via Node.js inter-process communication (IPC) messaging.

### Key Services

**Transcoding Engine (`src/services/transcoder.ts`)**

- Session-based transcoding with dynamic session reuse
- Supports HLS and DASH adaptive streaming formats
- Multiple quality variants (original, 1080p, 720p, 480p)
- Hardware acceleration support (NVENC, QSV, VAAPI, VideoToolbox)
- Real-time segment generation with intelligent buffering

**Session Management (`src/session/`)**

- Sophisticated lifecycle management with user tracking
- Session restart strategies for seamless quality transitions
- Timeout-based cleanup and activity monitoring
- Session affinity for request routing optimization

**Queue System (`src/queue/`)**

- Priority-based task queues with rate limiting
- Worker pool for concurrent processing
- Metrics tracking and monitoring

### Data Flow

```
HTTP Request → Web Worker → API Router → Controller → Transcoder Service
→ Session Manager → Worker Process (IPC) → FFmpeg Process → Segment Files
→ HTTP Response (segment data/manifests)
```

### Configuration Structure

**Primary Config:** `config.json` - Source of truth for all settings

**Key Configuration Areas:**

- **Folder Definitions**: Multiple video folders with individual scan intervals
- **Transcoding Options**: Segment duration, codecs, quality variants, hardware acceleration
- **HTTP Settings**: Rate limiting, caching, server configuration

**Default Provisioning:** Application creates sensible default config if none exists via `init` command.

## Development Guidelines

### Code Organization

**Strict Controller-Service Separation:**

- **Controllers** (`src/controllers/`): Handle HTTP req/res objects only. No business logic.
- **Services** (`src/services/`): Pure business logic, Express-agnostic. Return data or throw errors.
- **Workers** (`src/workers/`): Background processes for FFmpeg operations and metadata processing.

**Error Handling:**

- Services throw specific `Error` objects with descriptive messages
- Controllers catch errors and map to appropriate HTTP status codes
- Workers must propagate error details via IPC

### Language Standards

- **TypeScript Only**: All source code in strict mode
- **Indent Style**: 2 spaces, never tabs
- **Type Safety**: NEVER use `any` type
- **No Global State**: Prefer dependency injection over global imports

### Session Management Patterns

**Session Reuse Strategy:**

- Create new sessions only when necessary
- Reuse existing sessions for same video/quality combination
- Implement smart restart when users request segments far ahead
- Track user activity for cleanup and optimization

**Session Lifecycle:**

1. Creation on first segment request
2. Active transcoding with user tracking
3. Restart on quality change or large seek
4. Timeout-based cleanup when inactive

### Hardware Acceleration

Configure in `config.json` transcoding options:

```json
{
  "transcoding": {
    "hardwareAcceleration": "nvenc",
    // or "qsv", "vaapi", "videotoolbox"
    "codec": "h264",
    // or "h265", "vp9", "av1"
    "preset": "fast"
  }
}
```

### Testing Framework

**Vitest** with tests in `tests/` directory mirroring `src/` structure. New features and critical bug fixes must include
unit tests.

### Common Extension Points

- **New Streaming Formats**: Extend `src/services/hls.ts` or `src/services/dash.ts`
- **Custom Transcoding**: Modify `src/services/transcoder.ts` strategies
- **Session Management**: Enhance `src/session/` classes
- **Worker Types**: Add new workers in `src/workers/`

### Important Development Notes

- **Multi-Process Debugging**: Use process-specific logging for debugging worker communication
- **FFmpeg Integration**: All FFmpeg operations happen in dedicated worker processes
- **State Management**: Persistent state across process restarts via `src/state/`
- **File Organization**: Segments stored using hashed session IDs for efficient lookup
- **Cleanup Strategy**: Automatic cleanup of unused sessions and temporary files

The architecture is designed for scalability, handling multiple concurrent streams while maintaining high performance
through intelligent session reuse and multi-process isolation.