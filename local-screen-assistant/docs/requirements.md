# Requirements Document

## Project Title

Local Screen-to-Knowledge Assistant

## Document Purpose

This document defines the requirements for a Windows-first desktop application that runs in the background, allows the user to capture text from the screen with a global hotkey, and answers questions using user-selected local documents as the source of truth.

## Product Summary

The application is a tray-based desktop assistant for local knowledge retrieval. The user selects one or more folders on their machine as knowledge sources. The application indexes supported files from those folders. When the user presses a configured global hotkey, the app captures a screen region, extracts text from the image, uses that text as a query against the indexed knowledge base, and returns a cited answer.

The product is intended to be local-first, transparent, and user-controlled. The app should show the extracted text and the sources used to generate the answer.

## Goals

* Build a desktop utility that is always available through a global hotkey
* Allow the user to query their own local document collection from on-screen content
* Keep the app lightweight while idle and fast during capture-and-answer flows
* Return grounded answers with supporting citations
* Make the system modular so OCR, retrieval, and model providers can be replaced later

## Non-Goals for V1

* Cross-platform support beyond Windows
* Full conversational agent workflows
* Browser extension integration
* Cloud sync or team collaboration
* Hidden or stealth operation
* Support for every document format
* Fully autonomous answering without showing extracted text or evidence

## Target Users

* Students querying notes, slides, and course documents
* Developers querying local documentation, design notes, and project files
* Professionals querying SOPs, manuals, and internal reference materials
* Anyone who wants fast answers grounded in files already stored locally

## Core User Flow

1. User installs and launches the app.
2. User opens settings and selects one or more local folders.
3. The app indexes supported files from those folders.
4. The app continues running in the system tray.
5. User presses a configured global hotkey.
6. The app opens a region-selection overlay and captures a screenshot.
7. The app performs OCR on the captured image.
8. The extracted text is used as a query against the indexed documents.
9. The app retrieves relevant chunks and generates a grounded answer.
10. The app displays the answer, extracted text, and supporting citations in a popup window.
11. The user can review the result, copy the answer, and open supporting sources.

## Functional Requirements

### FR-1: Background Tray Application

The system shall run as a desktop application with a visible tray icon.

### FR-2: Settings Management

The system shall provide a settings window where the user can:

* Add and remove source folders
* Configure a global hotkey
* View indexing status
* Select OCR and model preferences
* Enable or disable startup behavior

### FR-3: Source Folder Registration

The system shall allow the user to register one or more local directories as knowledge sources.

### FR-4: Document Discovery

The system shall scan registered source folders and discover supported files.

### FR-5: Supported File Types for V1

The system shall support indexing the following file types in V1:

* `.txt`
* `.md`
* `.pdf`

### FR-6: File Parsing

The system shall extract text content and metadata from supported files.

### FR-7: Chunking

The system shall split parsed document content into chunks suitable for retrieval and answer grounding.

### FR-8: Metadata Storage

The system shall store file metadata, chunk metadata, indexing state, and settings locally.

### FR-9: Incremental Reindexing

The system shall detect added, changed, and removed files and update the index incrementally.

### FR-10: Global Hotkey

The system shall allow the user to configure and use a global hotkey even when the app is unfocused.

### FR-11: Region Capture

The system shall support region-based screen capture triggered by the global hotkey.

### FR-12: OCR Extraction

The system shall perform OCR on the captured image and produce extracted text.

### FR-13: OCR Review

The system shall display the extracted text to the user alongside or before the generated answer.

### FR-14: Query Construction

The system shall use the extracted text as the primary query input for retrieval.

### FR-15: Retrieval

The system shall retrieve relevant chunks from indexed local documents using a hybrid retrieval approach.

### FR-16: Grounded Answer Generation

The system shall generate answers using only the retrieved content as evidence.

### FR-17: Citations

The system shall display the supporting source documents and chunk references used for the answer.

### FR-18: Result Presentation

The system shall show results in a popup or small window containing:

* Extracted text
* Final answer
* Source citations
* Status or confidence indicator

### FR-19: Clipboard Support

The system shall allow the user to copy the final answer to the clipboard.

### FR-20: Notifications

The system shall notify the user when answer generation is complete.

### FR-21: Source Preview

The system should allow the user to inspect the supporting source snippet for each citation.

### FR-22: Error Handling

The system shall provide clear user-facing errors for:

* OCR failure
* Unsupported files
* Missing index
* No relevant source found
* Model failure

## Non-Functional Requirements

### NFR-1: Windows-First

The first release shall target Windows.

### NFR-2: Idle Efficiency

The application shall consume low CPU while idle.

### NFR-3: Startup Speed

The application should start quickly and enter tray mode without noticeable delay.

### NFR-4: Responsiveness

The capture-to-answer flow should feel responsive for small to medium document sets.

### NFR-5: Local-First Privacy

The default behavior shall keep documents, indexing data, and processing local unless the user explicitly enables a remote model provider.

### NFR-6: Transparency

The app shall show the extracted text and answer evidence so the user can verify the result.

### NFR-7: Reliability

The app shall recover gracefully from indexing errors, OCR failures, and unsupported content.

### NFR-8: Maintainability

The codebase shall be modular so OCR engines, model providers, and retrieval implementations can be swapped later.

### NFR-9: Security

The application shall avoid exposing unnecessary local capabilities and shall store only the minimum required local state.

### NFR-10: Extensibility

The architecture should support future additions such as new file types, reranking, multi-workspace support, and cloud model providers.

## Assumptions

* The user’s selected folders contain the information needed to answer many relevant questions.
* OCR quality is sufficient for most screen captures if the user selects a focused region.
* The app will initially be used on a single machine by a single user.
* Local indexing is acceptable as a setup step before querying.

## Constraints

* Initial platform is Windows only.
* V1 scope is limited to local files and local settings.
* V1 supports only a narrow set of document formats.
* The application must remain lightweight enough to run in the background.

## High-Level System Components

### 1. App Shell

Responsible for startup, tray lifecycle, settings, and window management.

### 2. Capture Service

Responsible for region selection and screen capture.

### 3. OCR Service

Responsible for text extraction and OCR normalization.

### 4. Indexing Pipeline

Responsible for file discovery, parsing, chunking, metadata storage, and incremental updates.

### 5. Retrieval Engine

Responsible for keyword search, semantic retrieval, and result ranking.

### 6. Answering Engine

Responsible for prompt construction, grounded answer generation, and citation packaging.

### 7. User Interface

Responsible for settings, indexing status, results display, and source preview.

## Data Requirements

The system shall maintain local application data for:

* Registered source folders
* Indexed file metadata
* Document chunks
* Embeddings or retrieval index references
* User settings
* Recent query runs and status

## Suggested Data Entities

### Source

* id
* path
* type
* last_modified
* content_hash
* indexed_at
* parse_status

### Chunk

* id
* source_id
* chunk_index
* text
* token_count
* page_number
* heading

### Settings

* key
* value

### Run

* id
* timestamp
* captured_image_path
* extracted_text
* answer
* status

## V1 Acceptance Criteria

The product will be considered functional for V1 when:

* The user can install and launch the app
* The app runs in the tray
* The user can register a local folder
* The app can index `.txt`, `.md`, and `.pdf` files from that folder
* The user can press a global hotkey and capture a screen region
* The app can extract text from the image
* The app can retrieve relevant chunks from the indexed data
* The app can generate a grounded answer with visible citations
* The app can display the result in a popup window

## Future Enhancements

* DOCX support
* Multiple workspaces
* Follow-up chat on top of retrieved sources
* Better OCR preprocessing
* Better ranking and reranking
* Optional cloud model providers
* Source filtering by folder or workspace
* Search history and saved runs
* Audio capture and transcription

## Open Questions

* Which OCR engine should be used first in V1?
* Should answer generation be local-only in the first implementation, or should cloud support exist behind a toggle?
* How should source preview work for PDFs in the first version?
* Should the result popup auto-close, stay pinned, or support both modes?
* How much query/run history should be stored locally?

## Initial V1 Recommendation

* Windows only
* Tray-based app
* Global hotkey
* Region capture only
* OCR plus hybrid retrieval
* Local file indexing for `.txt`, `.md`, and `.pdf`
* Answer popup with citations and copy support
* Local-first behavior by default
