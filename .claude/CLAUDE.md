# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rhetoric Lens (舆论透镜)** - A Chrome extension that analyzes Twitter/X posts for rhetorical devices and manipulation tactics using AI. The extension visually overlays colored badges on tweets indicating rhetoric and manipulation scores with detailed tooltips.

## Architecture

### Core Components

1. **manifest.json** - Chrome extension manifest (v3)
   - Declares permissions: `activeTab`, `scripting`
   - Host permissions for x.com and API endpoints (localhost:11434 for Ollama, production API)
   - Content scripts injected into x.com pages

2. **content.js** - Main logic script running on Twitter/X pages
   - **Observer Pattern**: MutationObserver monitors DOM for dynamically loaded tweets
   - **Extractor**: Finds tweet text using `[data-testid="tweetText"]` selector
   - **Analyzer**: Calls Ollama API (model: `xiuci-pro`) for AI analysis
   - **Renderer**: Injects color-coded badges with tooltips
   - **Caching**: Uses `processedTweets` Set to prevent duplicate analysis

3. **styles.css** - Visual styling
   - `.ai-badge` - Color-coded score indicators (green/orange/red)
   - `.ai-tooltip` - Hover tooltips showing analysis details
   - Color thresholds: score ≥8 (red), 5-7 (orange), <5 (green)

4. **icon.png** - Extension icon (128x128px)

### Data Flow

```
Twitter Page Load/Scroll
  → MutationObserver detects new tweets
  → Extract text from tweet element
  → Check cache (processedTweets Set)
  → POST to Ollama API with forced JSON format
  → Parse response: {label, rhetoric_score, manipulation_score, reason}
  → Create badge with color based on max(rhetoric_score, manipulation_score)
  → Append badge to tweet element
```

### API Integration

**Endpoint**: `http://localhost:11434/api/chat` (Ollama)
**Model**: `xiuci-pro` (custom fine-tuned model)
**Request Format**:
```json
{
  "model": "xiuci-pro",
  "messages": [{"role": "user", "content": "<tweet text>"}],
  "format": "json",
  "stream": false
}
```

**Expected Response**:
```json
{
  "label": "<classification>",
  "rhetoric_score": 0-10,
  "manipulation_score": 0-10,
  "reason": "<explanation>"
}
```

## Development Setup

### Prerequisites
- Ollama running locally with `xiuci-pro` model loaded
- CORS configuration required for Ollama:
  - **Mac/Linux**: `launchctl setenv OLLAMA_ORIGINS "*"` then restart Ollama
  - **Windows**: Set environment variable `OLLAMA_ORIGINS=*`

### Loading Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" (top left)
4. Select the project directory

### Testing
- Open x.com in Chrome
- Scroll through feed to trigger analysis
- Check browser console for "Rhetoric Lens 已启动..." message
- Verify badges appear on tweets with colored indicators
- Hover over badges to see tooltips

## Technical Considerations

### Twitter/X DOM Structure
- Tweet containers: `article[data-testid="tweet"]`
- Tweet text: `[data-testid="tweetText"]`
- Twitter uses obfuscated class names - rely on `data-testid` attributes
- Infinite scroll requires MutationObserver for dynamic content

### Performance Optimization Strategies (Not Yet Implemented)
- **Debouncing**: Queue API requests to avoid overwhelming backend
- **Viewport Detection**: Only analyze visible tweets
- **Click-to-Analyze**: Add icon per tweet, analyze on user click instead of automatic
- **LocalStorage Caching**: Persist analysis results across sessions

### Deduplication
- Uses in-memory `Set` with full text as key (simple but functional)
- Production should use content hash for better collision handling
- DOM-level deduplication via `dataset.aiProcessed` prevents reprocessing same element

## Known Limitations

- CORS must be configured on Ollama side for browser requests
- No rate limiting implemented - rapid scrolling generates many concurrent requests
- No error UI - failed analyses silently fail with console logging
- Cache is session-only (cleared on page refresh)
- Badge insertion may conflict with Twitter UI updates

## API Endpoint Configuration

To switch between local and production:
- Edit `API_ENDPOINT` constant in `content.js`
- Update `host_permissions` in `manifest.json` to match API domain
- Ensure CORS headers allow extension origin
