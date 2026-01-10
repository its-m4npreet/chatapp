# TODO: Markdown Formatting Support Implementation

## Phase 1: Create Markdown Parser Utility
- [x] Create `frontend/src/lib/markdownParser.js` with parsing functions
- [x] Implement markdown regex patterns for bold, italic, underline, strikethrough, code, highlight
- [x] Add security sanitization to prevent XSS attacks
- [x] Create CSS styles for formatted text in `frontend/src/index.css`

## Phase 2: Add Dependencies
- [ ] Install `marked` for markdown parsing
- [ ] Install `dompurify` for HTML sanitization
- [ ] Install `highlight.js` for code syntax highlighting

## Phase 3: Update ChatView Component
- [ ] Import markdown parser and dependencies
- [ ] Add formatting toolbar buttons (Bold, Italic, Underline, Strikethrough, Code, Highlight)
- [ ] Implement text selection wrapper functions
- [ ] Update message rendering to display formatted text
- [ ] Add code syntax highlighting styles

## Phase 4: Update GroupChat Component
- [ ] Import markdown parser and dependencies
- [ ] Add formatting toolbar buttons
- [ ] Implement text selection wrapper functions
- [ ] Update message rendering to display formatted text
- [ ] Add code syntax highlighting styles

## Phase 5: Testing and Refinement
- [ ] Test all markdown formatting options
- [ ] Verify security sanitization
- [ ] Test code syntax highlighting
- [ ] Check mobile responsiveness
- [ ] Verify both ChatView and GroupChat work correctly

## Files to Modify:
- `chatapp/frontend/src/lib/markdownParser.js` (new file)
- `chatapp/frontend/src/index.css` (add markdown styles)
- `chatapp/frontend/src/components/ChatView.jsx` (add toolbar and update rendering)
- `chatapp/frontend/src/components/GroupChat.jsx` (add toolbar and update rendering)
- `chatapp/frontend/package.json` (add dependencies)

## Dependencies to Add:
- `marked`: Markdown parser
- `dompurify`: HTML sanitization
- `highlight.js`: Code syntax highlighting

