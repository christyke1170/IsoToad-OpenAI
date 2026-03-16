# FFXIV Bot Retrieval System

## Overview

This document describes the implementation of the retrieval system that improves the accuracy of the Discord bot's FFXIV-related responses by fetching context before LLM calls.

## Problem Solved

Previously, the bot would send user questions directly to the LLM, which caused hallucinations for factual FFXIV questions. The new retrieval system adds a context-fetching step that provides the LLM with accurate information before generating responses.

## Architecture

```
user message
↓
detect factual question
↓
retrieve context
↓
call LLM with context
↓
format response using isotoad personality
```

## Components

### 1. Retrieval Service (`src/services/retrieval.js`)

The core service that handles context retrieval with the following features:

#### Knowledge Base
- Lightweight FFXIV knowledge base with 10 categories of information
- No vector database required - uses keyword matching for simplicity
- Categories include: expansions, duties, ultimates, jobs, gear, FATEs, raids, mechanics, patching, and endgame content

#### Factual Question Detection
- Detects FFXIV-related questions using keyword matching and pattern recognition
- Identifies specific FFXIV content references (e.g., E6S, T1, ARR, etc.)
- Filters out non-FFXIV questions to avoid unnecessary processing

#### Context Search and Formatting
- Searches knowledge base using relevance scoring
- Formats context for LLM prompt injection
- Returns up to 3 most relevant context entries

### 2. LLM Service Integration (`src/services/llm.js`)

Modified to include retrieval step before LLM calls:

#### Retrieval Integration
- Imports and uses the retrieval service
- Calls `retrieval.retrieveContext()` before generating LLM content
- Appends retrieved context to the system prompt
- Handles retrieval errors gracefully (continues without context if retrieval fails)

#### Context Injection
- Retrieved context is added to the system prompt before sending to OpenAI API
- Context is clearly marked with separators for the LLM to understand its purpose
- Maintains the bot's personality and response style

## Usage Examples

### Factual FFXIV Questions (Triggers Retrieval)

```
User: "What are ultimate raids?"
Bot: [Retrieves context about ultimate raids, then answers with factual information]
```

```
User: "How do I get better gear?"
Bot: [Retrieves context about gear and equipment, then provides accurate advice]
```

```
User: "What is E6S?"
Bot: [Recognizes specific FFXIV content reference, retrieves relevant context]
```

### Non-FFXIV Questions (No Retrieval)

```
User: "What do you think about pizza?"
Bot: [Processes normally without retrieval, maintains personality]
```

```
User: "How was your day?"
Bot: [Responds conversationally without context retrieval]
```

## Benefits

1. **Reduced Hallucinations**: Factual FFXIV questions get accurate answers from trusted context
2. **Performance**: Non-FFXIV questions work as before with no performance impact
3. **Lightweight**: No vector database required - uses simple keyword matching
4. **Extensible**: Easy to expand knowledge base with more FFXIV information
5. **Clear Context**: Context is clearly marked for the LLM to use appropriately

## Configuration

No additional configuration is required. The retrieval system is automatically integrated into the LLM service and activates when factual FFXIV questions are detected.

## Extending the Knowledge Base

To add more FFXIV information to the knowledge base:

1. Edit `src/services/retrieval.js`
2. Add new entries to the `initializeKnowledgeBase()` method
3. Each entry should have:
   - `id`: Unique identifier
   - `category`: Category (expansion, duty, ultimate, job, item, fate, raid, mechanic, patch, endgame)
   - `title`: Descriptive title
   - `content`: Detailed information about the topic

Example:
```javascript
{
  id: 'new_content_id',
  category: 'expansion',
  title: 'New Expansion Name',
  content: 'Detailed information about the new expansion...'
}
```

## Testing

The retrieval system can be tested using the test script (removed after testing) which verifies:
- Factual question detection accuracy
- Context retrieval functionality
- Integration with the LLM service

## Future Enhancements

Potential improvements for the future:
1. **Vector Database**: Could be upgraded to use a vector database for more sophisticated semantic search
2. **External APIs**: Could integrate with FFXIV databases or wikis for more comprehensive information
3. **User Feedback**: Could implement a feedback system to improve context quality over time
4. **Caching**: Could add caching for frequently requested context to improve performance

## Files Modified

- `src/services/retrieval.js` - New retrieval service
- `src/services/llm.js` - Modified to integrate retrieval system

## Files Added

- `RETRIEVAL_SYSTEM.md` - This documentation file