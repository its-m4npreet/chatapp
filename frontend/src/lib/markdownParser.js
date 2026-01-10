/**
 * Markdown Parser Utility for Chat Application
 * Handles markdown formatting for chat messages
 */

// Markdown patterns for parsing
const MARKDOWN_PATTERNS = {
  // Bold: **text**
  bold: {
    pattern: /\*\*([^*]+)\*\*/g,
    className: 'font-bold'
  },
  // Italic: *text*
  italic: {
    pattern: /\*([^*]+)\*/g,
    className: 'italic'
  },
  // Underline: __text__
  underline: {
    pattern: /__([^_]+)__/g,
    className: 'underline'
  },
  // Strikethrough: ~~text~~
  strikethrough: {
    pattern: /~~([^~]+)~~/g,
    className: 'line-through'
  },
  // Inline code: `code`
  inlineCode: {
    pattern: /`([^`]+)`/g,
    className: 'bg-gray-700/50 text-yellow-300 px-1 py-0.5 rounded font-mono text-sm'
  },
  // Highlight: `text`
  highlight: {
    pattern: /`([^`]+)`/g,
    className: 'bg-yellow-500/20 text-yellow-200 px-1 rounded'
  },
  // Code blocks: ```code```
  codeBlock: {
    pattern: /```([\s\S]*?)```/g,
    className: 'block bg-gray-900/80 text-gray-100 p-3 rounded-lg my-2 font-mono text-sm overflow-x-auto whitespace-pre-wrap'
  }
};

/**
 * Parse markdown text and return styled spans/elements
 * @param {string} text - The text to parse
 * @param {boolean} isCodeBlock - Whether this is inside a code block
 * @returns {Array} Array of text segments with styles
 */
export const parseMarkdown = (text) => {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: '' }];
  }

  const result = [];
  let remaining = text;

  // Track what we're inside of
  let inCodeBlock = false;
  let codeBlockContent = '';

  while (remaining.length > 0) {
    // Check for code blocks first (highest priority)
    const codeBlockMatch = remaining.match(/^```([\s\S]*?)```/);
    if (codeBlockMatch) {
      // Push any pending text
      if (codeBlockContent) {
        result.push({
          type: 'text',
          content: codeBlockContent,
          styles: inCodeBlock ? ['font-mono', 'text-sm'] : []
        });
        codeBlockContent = '';
      }
      
      // Add code block
      result.push({
        type: 'codeblock',
        content: codeBlockMatch[1],
        language: 'text'
      });
      
      remaining = remaining.slice(codeBlockMatch[0].length);
      continue;
    }

    // Check for bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      // Push remaining text before match
      if (boldMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, boldMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: boldMatch[1],
        styles: ['font-bold']
      });
      
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Check for italic: *text*
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    if (italicMatch) {
      // Push remaining text before match
      if (italicMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, italicMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: italicMatch[1],
        styles: ['italic']
      });
      
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Check for underline: __text__
    const underlineMatch = remaining.match(/__([^_]+)__/);
    if (underlineMatch) {
      // Push remaining text before match
      if (underlineMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, underlineMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: underlineMatch[1],
        styles: ['underline']
      });
      
      remaining = remaining.slice(underlineMatch.index + underlineMatch[0].length);
      continue;
    }

    // Check for strikethrough: ~~text~~
    const strikethroughMatch = remaining.match(/~~([^~]+)~~/);
    if (strikethroughMatch) {
      // Push remaining text before match
      if (strikethroughMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, strikethroughMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: strikethroughMatch[1],
        styles: ['line-through']
      });
      
      remaining = remaining.slice(strikethroughMatch.index + strikethroughMatch[0].length);
      continue;
    }

    // Check for highlight: `text`
    const highlightMatch = remaining.match(/`([^`]+)`/);
    if (highlightMatch) {
      // Push remaining text before match
      if (highlightMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, highlightMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: highlightMatch[1],
        styles: ['bg-yellow-500/20', 'text-yellow-200', 'px-1', 'rounded']
      });
      
      remaining = remaining.slice(highlightMatch.index + highlightMatch[0].length);
      continue;
    }

    // Check for inline code: `code`
    const inlineCodeMatch = remaining.match(/`([^`]+)`/);
    if (inlineCodeMatch) {
      // Push remaining text before match
      if (inlineCodeMatch.index > 0) {
        result.push({
          type: 'text',
          content: remaining.slice(0, inlineCodeMatch.index)
        });
      }
      
      result.push({
        type: 'text',
        content: inlineCodeMatch[1],
        styles: ['bg-gray-700/50', 'text-yellow-300', 'px-1', 'py-0.5', 'rounded', 'font-mono', 'text-sm']
      });
      
      remaining = remaining.slice(inlineCodeMatch.index + inlineCodeMatch[0].length);
      continue;
    }

    // No match found, add remaining text
    result.push({
      type: 'text',
      content: remaining
    });
    break;
  }

  return result;
};

/**
 * Apply markdown formatting to a text selection in input
 * @param {string} text - The current input value
 * @param {number} start - Selection start position
 * @param {number} end - Selection end position
 * @param {string} marker - The markdown marker to apply
 * @returns {object} New text value and selection range
 */
export const applyMarkdownFormatting = (text, start, end, marker) => {
  const selectedText = text.substring(start, end);
  const newText = 
    text.substring(0, start) + 
    marker + selectedText + marker + 
    text.substring(end);
  
  return {
    newText,
    newStart: start,
    newEnd: end + marker.length * 2
  };
};

/**
 * Quick formatting functions
 */
export const formatBold = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '**');

export const formatItalic = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '*');

export const formatUnderline = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '__');

export const formatStrikethrough = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '~~');

export const formatInlineCode = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '`');

export const formatHighlight = (text, start, end) => 
  applyMarkdownFormatting(text, start, end, '==');

/**
 * Get suggested markdown syntax for tooltips
 */
export const getMarkdownHelp = () => ({
  bold: {
    syntax: '**text**',
    example: '**Bold text**',
    description: 'Makes text bold'
  },
  italic: {
    syntax: '*text*',
    example: '*Italic text*',
    description: 'Makes text italic'
  },
  underline: {
    syntax: '__text__',
    example: '__Underlined text__',
    description: 'Underlines text'
  },
  strikethrough: {
    syntax: '~~text~~',
    example: '~~Strikethrough~~',
    description: 'Crosses out text'
  },
  inlineCode: {
    syntax: '`code`',
    example: '`const x = 1`',
    description: 'Inline code formatting'
  },
  highlight: {
    syntax: '`text`',
    example: '`Important note`',
    description: 'Highlights text'
  },
  codeBlock: {
    syntax: '```code```',
    example: '```\nfunction hello() {\n  console.log("Hi");\n}\n```',
    description: 'Multi-line code block'
  }
});

/**
 * Format message for display (sanitize and parse)
 * @param {string} content - Raw message content
 * @returns {Array} Parsed content segments
 */
export const formatMessage = (content) => {
  // Basic sanitization - remove potentially dangerous characters
  const sanitized = content
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
  
  return parseMarkdown(sanitized);
};

/**
 * Check if text contains markdown formatting
 * @param {string} text - Text to check
 * @returns {boolean} True if markdown detected
 */
export const hasMarkdown = (text) => {
  if (!text) return false;
  return (
    /\*{2}.+\*{2}/.test(text) ||  // **bold**
    /\*.+\*/.test(text) ||        // *italic*
    /_.+_/.test(text) ||          // _italic_
    /__.+__/.test(text) ||        // __underline__
    /~~.+~~/.test(text) ||        // ~~strikethrough~~
    /`.+`/.test(text)             // `code` or `highlight`
  );
};

export default {
  parseMarkdown,
  applyMarkdownFormatting,
  formatBold,
  formatItalic,
  formatUnderline,
  formatStrikethrough,
  formatInlineCode,
  formatHighlight,
  getMarkdownHelp,
  formatMessage,
  hasMarkdown
};

