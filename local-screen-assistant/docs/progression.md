Milestone 0 — Project scaffold

Set up:

Tauri 2
React + TypeScript frontend
Rust backend
basic routing
tray shell
settings persistence
hotkey module stub
Milestone 1 — Capture foundation

Set up:

global hotkey registration
region capture flow
image save/temp handling
placeholder result popup
Milestone 2 — OCR

Set up:

OCR interface
one OCR provider
extracted text display
OCR error handling
Milestone 3 — Local indexing

Set up:

source folder registration
file discovery
txt/md/pdf parsing
chunking
metadata persistence
Milestone 4 — Retrieval + answer generation

Set up:

query from OCR text
retrieval pipeline
answer generation
citations UI

Do not jump straight into full AI workflow implementation on the first pass.
The biggest mistake here would be:

bad scaffold,
messy file organization,
hardcoded logic,
OCR/retrieval tightly coupled together too early.

You want strong foundations first.