# FFXIV Bot Search Implementation

## Overview

This document describes the complete implementation of the searchFFXIV function that improves the accuracy of the Discord bot by fetching context from external FFXIV sources before LLM calls.

## Architecture

The new system follows this flow:

```
user message
↓
searchFFXIV(userMessage)
↓
Context: {retrieved context}
User question: {userMessage}
Answer using the context above.
↓
call LLM with context
↓
format response using isotoad personality
```

## Components

### 1. FFXIV Search Service (`src/services/ffxiv-search.js`)

The main search service that implements the `searchFFXIV(query)` function with the following features:

#### External API Integration
- **Garland Tools API**: For items, quests, and game data
- **FFXIV Collect API**: For collectables, minions, and mounts
- **XIVAPI**: For comprehensive game data including quests and items
- **FFXIV Wiki API**: For wiki content and descriptions

#### Fallback System
- When external APIs fail or return no results, the system falls back to an internal knowledge base
- Internal knowledge base contains curated FFXIV information across 5 categories:
  - Expansions
  - Ultimate Raids
  - Job System
  - Gear and Equipment
  - Duties Overview

#### Smart Search Term Extraction
- Extracts relevant search terms from user queries using regex patterns
- Identifies specific content types (ultimates, trials, raids, etc.)
- Recognizes specific FFXIV names and locations
- Falls back to general keywords if no specific patterns match

#### Context Formatting
- Formats search results into a structured context block
- Groups results by source for clarity
- Includes source attribution for transparency
- Uses clear separators for LLM prompt injection

### 2. LLM Service Integration (`src/services/llm.js`)

Modified to use the new search function instead of the internal retrieval system:

#### Search Integration
- Imports and uses the FFXIV search service
- Calls `ffxivSearch.searchFFXIV(userMessage)` before generating LLM content
- Appends retrieved context to the system prompt
- Handles search errors gracefully (continues without context if search fails)

#### Context Injection
- Retrieved context is added to the system prompt before sending to OpenAI API
- Context is clearly marked with separators for the LLM to understand its purpose
- Maintains the bot's personality and response style

#### Updated System Prompts
- Added explicit instructions: "when context is provided, answer using only the provided context"
- Added: "do not invent or guess additional facts"
- Added: "if the context does not contain the answer, say you cannot verify it"
- These rules apply to both regular and special personality modes

## Usage Examples

### Example 1: Ultimate Raids Question

```
User: "What ultimates exist?"
↓
searchFFXIV("What ultimates exist?")
↓
Context:
--- FFXIV CONTEXT ---
Search query: "What ultimates exist?"

Relevant information from trusted FFXIV sources:

**Internal FFXIV Knowledge**:
1. Ultimate Raids
   The ultimate fights currently released in Final Fantasy XIV are: The Unending Coil of Bahamut, The Weapon's Refrain, The Epic of Alexander, Dragonsong's Reprise, and The Omega Protocol. These are the most challenging content in the game, requiring excellent coordination and knowledge of mechanics.

--- END CONTEXT ---

User question: "What ultimates exist?"
Answer using the context above.
↓
LLM generates response using factual context
↓
Bot responds with accurate information + personality
```

### Example 2: Gear Question

```
User: "How do I get better gear?"
↓
searchFFXIV("How do I get better gear?")
↓
Context:
--- FFXIV CONTEXT ---
Search query: "How do I get better gear?"

Relevant information from trusted FFXIV sources:

**Internal FFXIV Knowledge**:
1. Gear and Equipment
   Gear in FFXIV is categorized by item level (ilvl) and quality. Higher ilvl gear provides better stats. Gear can be obtained through dungeons, trials, raids, crafting, and various other activities. Relics are special weapon collections that require extensive grinding across multiple content types.

--- END CONTEXT ---

User question: "How do I get better gear?"
Answer using the context above.
↓
LLM generates response using factual context
↓
Bot responds with accurate advice + personality
```

## Benefits

1. **Real FFXIV Data**: Uses actual FFXIV APIs and databases instead of static knowledge base
2. **Extensible Architecture**: Easy to add new FFXIV sources and APIs
3. **Fallback Protection**: Internal knowledge base ensures functionality even when external APIs fail
4. **Source Transparency**: Clear attribution of information sources
5. **Structured Context**: Well-formatted context blocks for optimal LLM understanding
6. **Error Resilience**: Graceful handling of API failures and network issues

## API Sources

### External APIs (Primary)
- **Garland Tools**: https://garlandtools.org/api/
- **FFXIV Collect**: https://api.ffxivcollect.com/api/v3/
- **XIVAPI**: https://xivapi.com/
- **FFXIV Wiki**: https://ffxiv.gamerescape.com/w/api.php

### Internal Knowledge Base (Fallback)
- Curated FFXIV information across major content categories
- Keyword-based matching for relevance
- Maintained within the search service itself

## Error Handling

The system includes comprehensive error handling:

1. **API Failures**: Individual API failures don't break the search process
2. **Network Issues**: Graceful degradation to internal knowledge base
3. **Empty Results**: Fallback to internal knowledge base when external sources return nothing
4. **Parsing Errors**: Safe JSON parsing with fallbacks for malformed responses

## Future Enhancements

Potential improvements for the future:
1. **Caching**: Add caching for frequently requested information
2. **Rate Limiting**: Implement rate limiting for external API calls
3. **Additional Sources**: Integrate more FFXIV databases and wikis
4. **User Feedback**: Implement feedback system to improve search quality
5. **Semantic Search**: Add vector-based semantic search for better matching

## Files Modified

- `src/services/ffxiv-search.js` - New search service with external API integration
- `src/services/llm.js` - Modified to use new search function and updated system prompts

## Files Added

- `SEARCH_IMPLEMENTATION.md` - This documentation file
- `RETRIEVAL_SYSTEM.md` - Original retrieval system documentation

## Testing

The search function has been tested with various FFXIV questions and successfully:
- Extracts relevant search terms from user queries
- Searches multiple FFXIV sources
- Falls back to internal knowledge base when needed
- Formats context appropriately for LLM prompt injection
- Maintains system stability during API failures