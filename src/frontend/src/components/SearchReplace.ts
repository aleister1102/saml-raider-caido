import type { Caido } from "@caido/sdk-frontend";

export interface SearchMatch {
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface SearchState {
  query: string;
  replaceText: string;
  matches: SearchMatch[];
  currentIndex: number;
  caseSensitive: boolean;
}

export const createSearchReplaceComponent = (
  caido: Caido<any>,
  editor: HTMLTextAreaElement,
  highlight: HTMLElement,
  onContentChange: () => void
) => {
  const container = document.createElement("div");
  container.className = "search-replace-container";

  const style = document.createElement("style");
  style.textContent = `
    .search-replace-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
    }
    .search-replace-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .search-replace-input {
      flex: 1;
      padding: 6px 8px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .search-replace-input::placeholder {
      color: var(--text-secondary);
    }
    .search-replace-controls {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .search-replace-count {
      font-size: 12px;
      color: var(--text-secondary);
      min-width: 60px;
      text-align: center;
    }
    .search-replace-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
    }
    .search-replace-toggle input {
      cursor: pointer;
    }
    .search-highlight {
      background-color: #ffd700;
      color: #000;
    }
    .search-highlight.current {
      background-color: #ff8c00;
      color: #fff;
    }
  `;
  container.appendChild(style);

  const state: SearchState = {
    query: "",
    replaceText: "",
    matches: [],
    currentIndex: -1,
    caseSensitive: false,
  };

  // First row: Search input and controls
  const searchRow = document.createElement("div");
  searchRow.className = "search-replace-row";
  container.appendChild(searchRow);

  const searchInput = document.createElement("input");
  searchInput.className = "search-replace-input";
  searchInput.type = "text";
  searchInput.placeholder = "Search...";
  searchRow.appendChild(searchInput);

  const searchControls = document.createElement("div");
  searchControls.className = "search-replace-controls";
  searchRow.appendChild(searchControls);

  const matchCount = document.createElement("div");
  matchCount.className = "search-replace-count";
  matchCount.textContent = "0 matches";
  searchControls.appendChild(matchCount);

  const prevBtn = caido.ui.button({
    label: "◀",
    variant: "tertiary",
    size: "small",
  });
  searchControls.appendChild(prevBtn);

  const nextBtn = caido.ui.button({
    label: "▶",
    variant: "tertiary",
    size: "small",
  });
  searchControls.appendChild(nextBtn);

  const caseToggle = document.createElement("label");
  caseToggle.className = "search-replace-toggle";
  const caseCheckbox = document.createElement("input");
  caseCheckbox.type = "checkbox";
  caseCheckbox.checked = false;
  caseToggle.appendChild(caseCheckbox);
  const caseLabel = document.createElement("span");
  caseLabel.textContent = "Aa";
  caseToggle.appendChild(caseLabel);
  searchControls.appendChild(caseToggle);

  // Second row: Replace input and buttons
  const replaceRow = document.createElement("div");
  replaceRow.className = "search-replace-row";
  container.appendChild(replaceRow);

  const replaceInput = document.createElement("input");
  replaceInput.className = "search-replace-input";
  replaceInput.type = "text";
  replaceInput.placeholder = "Replace with...";
  replaceRow.appendChild(replaceInput);

  const replaceBtn = caido.ui.button({
    label: "Replace",
    variant: "secondary",
    size: "small",
  });
  replaceRow.appendChild(replaceBtn);

  const replaceAllBtn = caido.ui.button({
    label: "Replace All",
    variant: "secondary",
    size: "small",
  });
  replaceRow.appendChild(replaceAllBtn);

  /**
   * Find all matches in the editor text
   */
  const findMatches = (): SearchMatch[] => {
    const text = editor.value;
    const query = state.query;

    if (!query) {
      return [];
    }

    const matches: SearchMatch[] = [];
    const flags = state.caseSensitive ? "g" : "gi";

    try {
      const regex = new RegExp(query, flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // Calculate line and column
        const beforeMatch = text.substring(0, start);
        const lines = beforeMatch.split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;

        matches.push({ start, end, line, column });
      }
    } catch (e) {
      // Invalid regex, ignore
    }

    return matches;
  };

  /**
   * Update highlights in the editor
   */
  const updateHighlights = () => {
    const rawText = editor.value;
    
    // Apply search highlights first on the raw text
    if (state.matches.length > 0) {
      const segments: Array<{ text: string; isMatch: boolean; isCurrent: boolean }> = [];
      let lastEnd = 0;

      for (let i = 0; i < state.matches.length; i++) {
        const match = state.matches[i];
        const isCurrent = i === state.currentIndex;

        // Add text before match
        if (match.start > lastEnd) {
          segments.push({ text: rawText.substring(lastEnd, match.start), isMatch: false, isCurrent: false });
        }

        // Add match
        segments.push({ text: rawText.substring(match.start, match.end), isMatch: true, isCurrent });

        lastEnd = match.end;
      }

      // Add remaining text
      if (lastEnd < rawText.length) {
        segments.push({ text: rawText.substring(lastEnd), isMatch: false, isCurrent: false });
      }

      // Now apply HTML escaping and syntax highlighting to each segment
      let html = "";
      for (const segment of segments) {
        let text = segment.text;
        // Escape HTML
        text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Apply syntax highlighting
        text = text.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="saml-hl-tag">$1</span>');
        text = text.replace(/([a-zA-Z0-9:-]+)(=)(&quot;.*?&quot;)/g, '<span class="saml-hl-attr">$1</span>$2<span class="saml-hl-val">$3</span>');
        text = text.replace(/(&lt;!--.*?--&gt;)/g, '<span class="saml-hl-comment">$1</span>');

        // Wrap in search highlight if needed
        if (segment.isMatch) {
          const className = segment.isCurrent ? "search-highlight current" : "search-highlight";
          html += `<span class="${className}">${text}</span>`;
        } else {
          html += text;
        }
      }

      highlight.innerHTML = html;
    } else {
      // No matches, just apply syntax highlighting
      let text = rawText;
      // Escape HTML
      text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Apply syntax highlighting
      text = text.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="saml-hl-tag">$1</span>');
      text = text.replace(/([a-zA-Z0-9:-]+)(=)(&quot;.*?&quot;)/g, '<span class="saml-hl-attr">$1</span>$2<span class="saml-hl-val">$3</span>');
      text = text.replace(/(&lt;!--.*?--&gt;)/g, '<span class="saml-hl-comment">$1</span>');

      highlight.innerHTML = text;
    }
  };

  /**
   * Update search state and highlights
   */
  const updateSearch = () => {
    state.query = searchInput.value;
    state.caseSensitive = caseCheckbox.checked;
    state.matches = findMatches();
    state.currentIndex = state.matches.length > 0 ? 0 : -1;

    matchCount.textContent = `${state.matches.length} match${state.matches.length !== 1 ? "es" : ""}`;
    updateHighlights();

    // Scroll to first match if found
    if (state.currentIndex >= 0) {
      scrollToMatch(state.currentIndex);
    }
  };

  /**
   * Scroll editor to show a specific match
   */
  const scrollToMatch = (index: number) => {
    if (index < 0 || index >= state.matches.length) return;

    const match = state.matches[index];
    const text = editor.value;
    const beforeMatch = text.substring(0, match.start);
    const lines = beforeMatch.split("\n");
    const lineNumber = lines.length - 1;
    const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);

    // Scroll to line
    editor.scrollTop = lineNumber * lineHeight;
    highlight.scrollTop = editor.scrollTop;
  };

  /**
   * Navigate to next match
   */
  const nextMatch = () => {
    if (state.matches.length === 0) return;
    state.currentIndex = (state.currentIndex + 1) % state.matches.length;
    updateHighlights();
    scrollToMatch(state.currentIndex);
  };

  /**
   * Navigate to previous match
   */
  const prevMatch = () => {
    if (state.matches.length === 0) return;
    state.currentIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length;
    updateHighlights();
    scrollToMatch(state.currentIndex);
  };

  /**
   * Replace current match
   */
  const replaceCurrent = () => {
    if (state.currentIndex < 0 || state.currentIndex >= state.matches.length) return;

    const match = state.matches[state.currentIndex];
    const before = editor.value.substring(0, match.start);
    const after = editor.value.substring(match.end);
    editor.value = before + replaceInput.value + after;

    // Recalculate matches with new text
    updateSearch();
    onContentChange();
  };

  /**
   * Replace all matches
   */
  const replaceAll = () => {
    if (state.matches.length === 0) return;

    let text = editor.value;
    const query = state.query;
    const replacement = replaceInput.value;

    if (!query) return;

    const flags = state.caseSensitive ? "g" : "gi";
    try {
      const regex = new RegExp(query, flags);
      text = text.replace(regex, replacement);
      editor.value = text;

      const count = state.matches.length;
      caido.window.showToast(`Replaced ${count} occurrence${count !== 1 ? "s" : ""}.`, {
        variant: "success",
      });

      // Recalculate matches
      updateSearch();
      onContentChange();
    } catch (e) {
      caido.window.showToast("Invalid search pattern.", { variant: "error" });
    }
  };

  // Event listeners
  searchInput.addEventListener("input", updateSearch);
  caseCheckbox.addEventListener("change", updateSearch);
  nextBtn.addEventListener("click", nextMatch);
  prevBtn.addEventListener("click", prevMatch);
  replaceBtn.addEventListener("click", replaceCurrent);
  replaceAllBtn.addEventListener("click", replaceAll);

  return {
    element: container,
    updateHighlights,
    getState: () => state,
    focusSearch: () => searchInput.focus(),
  };
};
