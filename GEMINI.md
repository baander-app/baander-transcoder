# Gemini Media Transcoder and Web Server

This project serves as a comprehensive solution for on-the-fly media transcoding and delivery. It functions as both a
media transcoder and a web server, enabling dynamic conversion and streaming of media content via a robust CLI
interface.

## Key Features:

- **On-the-fly Transcoding:** Converts media into various formats and resolutions as needed, reducing storage
  requirements and improving compatibility across devices.
- **Web Server:** Serves transcoded media and other static assets via Express.js, facilitating easy access and streaming
  through a web interface.
- **CLI Interface:** A single entry point (`baander-transcoder`) managing multiple commands for initialization, serving,
  and maintenance.
- **Cluster Support:** specialized worker processes for web serving and transcoding tasks to optimize performance.

## Project Structure:

### Core

- `src/main.ts`: Main CLI entry point. Orchestrates command registration and execution.
- `src/config.ts`: Configuration interface and loading logic.
- `src/api/`: API definitions.

### CLI Commands (`src/commands/`)

- `init.ts`: Provisions default configuration.
- `serve.ts`: Starts the web server and transcoder cluster.
- `clearCache.ts`: Clears generated media cache.

### Logic Layers

- `src/controllers/`: **Transport Layer**. Handles HTTP requests and CLI interactions. Delegates business logic to
  services.
  - `hls.ts`: Handles HLS streaming requests (master playlists, media playlists, segments).
  - `dash.ts`: Handles DASH streaming requests (manifests, chunks).
  - `stream.ts`: Handles direct stream endpoints.
  - `audio.ts`: Handles audio-specific streaming.
  - `caption.ts`: Handles subtitle delivery.
  - `library.ts`: Manages media library browsing.
  - `monitor.ts`: System monitoring endpoints.
- `src/services/`: **Business Logic Layer**. Pure logic, agnostic of the transport layer (Express/CLI).
  - `transcoder.ts`: Manages transcoding sessions, throttling, and session reuse.
  - `segmenter.ts`: (Worker Logic) Wraps FFmpeg process management.
  - `ffmpeg.ts`: Wrapper for FFmpeg operations (probe, frame extraction).
  - `hls.ts`, `dash.ts`: Playlist and manifest generation logic.
  - `media.ts`, `metadata.ts`: Media file analysis and metadata management.
  - `cleanupManager.ts`: Manages cache cleanup.
  - `queueManager.ts`: Application-level queue management.
  - `router.ts`: Centralized routing logic.
- `src/queue/`: **Job Queue System**.
  - `queueManager.ts`: Manages task queues (priorities, concurrency).
  - `worker.ts`: Worker implementation for processing queue jobs.
  - `pool.ts`: Manages a pool of workers.
- `src/workers/`: **Background Workers**.
  - `segmenter.ts`: Dedicated worker for executing FFmpeg segmentation (HLS/DASH).
  - `metadataWorker.ts`: Background worker for generating trickplay images and metadata.

### Utilities

- `src/indexing/`: Handles media file indexing.
- `src/state/`: Manages application state persistence.
- `src/video/`: Video-related utilities and initialization.

### Testing

- `tests/`: Unit tests using **Vitest**.
  - `controllers/`: Tests for HTTP endpoints.
  - `services/`: Tests for core business logic (transcoder, ffmpeg, router).

## Code Style & Standards

Indent style: space
Indent size: 2
NEVER use the any tpe

### Language & Runtime

- **TypeScript:** All source code must be written in TypeScript.
- **Strict Mode:** `tsconfig.json` enables strict type checking.
- **Node.js:** Targeted for modern Node.js environments.

### Architecture Patterns

- **Controller-Service Separation:**
  - **Controllers** (e.g., `src/controllers/hls.ts`) are responsible for handling HTTP Request/Response objects,
    parsing parameters, and sending responses. They **must not** contain core business logic.
  - **Services** (e.g., `src/services/transcoder.ts`) contain the business logic. They **must not** depend on Express `req`/
    `res` objects. They should return data (objects, strings, paths) or throw errors.
- **Dependency Injection:** Prefer passing dependencies (like configuration) to functions/classes rather than importing
  global state where possible.

### Error Handling

- **Services:** Should throw specific `Error` objects with descriptive messages when operations fail.
- **Controllers:** Should catch errors from services and map them to appropriate HTTP status codes (e.g., 404 for
  missing files, 500 for transcoding errors) and log them to `console.error` or the logger service.
- **Workers:** Must capture and propagate specific error details (including `stderr` from subprocesses) back to the main
  process via IPC.

### Testing

- **Framework:** **Vitest** is the designated test runner.
- **Location:** Tests are located in the `tests/` directory, mirroring the `src/` structure where appropriate.
- **Requirement:** New features and critical bug fixes (especially in workers/services) must include unit tests.

### Build & Dependency Management

- **Package Manager:** **Yarn** is used for dependency management and scripting.

### Configuration

- **config.json:** The source of truth for runtime settings.
- **Defaults:** The application must be able to provision a sensible default configuration if none exists (via `init`
  command).
- **Throttling:** Transcoding is throttled based on buffer duration (seconds) using `throttleBufferSize` (pause threshold) and `minThrottleBufferSize` (resume threshold).
- **Paths:** External binary paths (ffmpeg, ffprobe) should be configurable.

## Gemini Interaction Guidelines

When interacting with the Gemini agent, it is crucial to foster clear and efficient communication, especially when making modifications or implementing new features. To prevent misunderstandings and unnecessary rework, the agent should adhere to the following principles:

- **Clarify Ambiguity:** If a request is unclear, vague, or open to multiple interpretations, the agent must ask clarifying questions to ensure a shared understanding of the task before proceeding.
- **Confirm Scope:** Before undertaking significant actions, especially those that might extend beyond the explicit request or involve substantial changes, the agent must confirm the scope of the task with the user.
- **Validate Assumptions:** If the agent needs to make assumptions about existing code, design patterns, or desired outcomes due to incomplete information, it must state these assumptions clearly and seek validation from the user before implementing changes.
- **Permission for Deletion:** The agent must never delete or revert any code or files it has created or modified without explicit permission from the user. If a task requires discarding previous work, the agent must ask for confirmation first.
