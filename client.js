window.__ModuleLoader__.load({
  id: 'dsh-cherry-quote',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const SOURCE = '引用消息';
    const CHIP = '[data-composer-chip="' + SOURCE + '"]';
    const OPEN = '<blockquote data-cherry-quote="1">';
    const CLOSE = '</blockquote>';
    const MAX_QUOTE = 16000;
    const CSS_ID = 'dsh-cherry-quote/client.css';

    const CSS = `
.dshCherryQuoteChip{display:inline-flex;align-items:center;gap:3px;vertical-align:baseline;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);border-radius:var(--dsw-radius-sm);padding:0 6px;font:inherit;line-height:1.5;white-space:nowrap;cursor:default}
.dshCherryQuoteChipIcon{font-size:.82em;opacity:.8}
[data-composer-chip="引用消息"]{background:rgba(47,111,237,.14)!important;background-image:none!important;box-shadow:inset 0 0 0 1px rgba(47,111,237,.28)!important;color:#2f6fed;border-radius:var(--dsw-radius-sm);padding:0 4px;line-height:1.5;cursor:default}
[data-composer-chip="引用消息"]:hover{background:rgba(47,111,237,.14)!important;background-image:none!important;box-shadow:inset 0 0 0 1px rgba(47,111,237,.28)!important}
[data-composer-chip="引用消息"]>span{background:transparent!important}
[data-composer-chip="引用消息"]>span>span:first-child{display:none}
[data-composer-chip="引用消息"]::after{content:"✕";margin-left:5px;font-size:10px;line-height:1;color:var(--dsw-alias-label-tertiary);opacity:.55;cursor:pointer}
[data-composer-chip="引用消息"]:hover::after{opacity:1}
.dshCherryQuoteTip{position:fixed;z-index:90;display:none;box-sizing:border-box;max-width:420px;max-height:260px;overflow:auto;padding:10px 12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);box-shadow:0 8px 24px rgb(0 0 0 / .16);font:var(--dsw-font-xs-13);pointer-events:none;white-space:pre-wrap;word-break:break-word}
.dshCherryQuoteTipLabel{display:block;margin-bottom:4px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dshCherryMenu{position:fixed;z-index:95;display:none;flex-direction:column;min-width:128px;padding:4px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);box-shadow:0 8px 24px rgb(0 0 0 / .16)}
.dshCherryMenuItem{appearance:none;border:0;background:0 0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);text-align:left;padding:6px 10px;border-radius:var(--dsw-radius-sm);cursor:pointer}
.dshCherryMenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
`;

    function injectCss() {
      if (typeof document === 'undefined') return;
      if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') !== null) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-cherry-quote';
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function normalizeText(value) {
      return String(value === undefined || value === null ? '' : value)
        .replace(/\r\n?/g, '\n')
        .trim();
    }

    function escapeQuoteBody(text) {
      return text.replace(/<\/blockquote>/gi, '&lt;/blockquote&gt;');
    }

    function unescapeQuoteBody(text) {
      return text.replace(/&lt;\/blockquote&gt;/gi, '</blockquote>');
    }

    function buildPromptText(text) {
      return OPEN + '\n\n' + escapeQuoteBody(normalizeText(text)) + '\n\n' + CLOSE;
    }

    function roleLabel(role) {
      return role === 'user' ? '用户' : 'AI';
    }

    function brief(text, limit = 24) {
      const flat = normalizeText(text).replace(/\s+/g, ' ');
      return flat.length > limit ? flat.slice(0, limit) + '…' : flat;
    }

    function buildReference(rawText, role = 'assistant', seq = 0, index = 1) {
      const original = normalizeText(rawText);
      const truncated = original.length > MAX_QUOTE;
      const text = truncated ? original.slice(0, MAX_QUOTE) + '…' : original;
      return {
        source: SOURCE,
        ref: JSON.stringify({ role, seq, text }),
        label: '引用',
        clipboardText: '【引用 · ' + roleLabel(role) + '】',
      };
    }

    function parseRef(ref) {
      try {
        const value = JSON.parse(ref);
        if (value === null || typeof value !== 'object') return undefined;
        if (typeof value.text !== 'string') return undefined;
        const text = value.text;
        const promptText = typeof value.promptText === 'string' && value.promptText !== ''
          ? value.promptText
          : buildPromptText(text);
        return {
          v: value.v === 1 ? 1 : 1,
          text,
          promptText,
          truncated: value.truncated === true,
        };
      } catch (_error) {
        return undefined;
      }
    }

    function nextUserQuote(text, from) {
      const start = String(text).indexOf(OPEN, from);
      if (start < 0) return undefined;
      const end = String(text).indexOf(CLOSE, start + OPEN.length);
      if (end < 0) return undefined;
      const body = unescapeQuoteBody(String(text).slice(start + OPEN.length, end))
        .replace(/^\n+|\n+$/g, '');
      if (body === '') return undefined;
      return {
        start,
        end: end + CLOSE.length,
        data: { text: body },
      };
    }

    function removeQuoteFromDraft(draft, occurrences, index) {
      const ours = (occurrences === undefined || occurrences === null ? [] : occurrences)
        .filter((occurrence) => occurrence !== null && typeof occurrence === 'object' && occurrence.source === SOURCE);
      const target = ours[index];
      if (target === undefined) return undefined;
      const text = String(draft).slice(0, target.offset) + String(draft).slice(target.offset + target.length);
      const references = [];
      for (const occurrence of occurrences) {
        if (occurrence === target) continue;
        references.push({
          ...occurrence,
          offset: occurrence.offset > target.offset
            ? occurrence.offset - target.length
            : occurrence.offset,
        });
      }
      return { text, references };
    }

    function sessionOf(node) {
      const host = node === null || node === undefined || typeof node.closest !== 'function'
        ? null
        : node.closest('[data-conversation-session]');
      const id = host === null ? null : host.getAttribute('data-conversation-session');
      return id === null || id === '' ? undefined : id;
    }

    function readInputState(shell) {
      const store = shell === undefined ? undefined : shell.state;
      if (store === undefined) return undefined;
      try {
        if (typeof store.getSnapshot === 'function') return store.getSnapshot();
        if (typeof store.get === 'function') return store.get();
      } catch (_error) {
        return undefined;
      }
      return undefined;
    }

    function sessionInput(ctx, sessionId) {
      try {
        const actx = ctx.sessions.scope(sessionId);
        if (actx === undefined) return undefined;
        const shell = actx.get('conversation')?.input?.for(actx);
        if (shell === undefined) return undefined;
        return { actx, shell, actions: shell.actions, state: readInputState(shell) };
      } catch (_error) {
        return undefined;
      }
    }

    function nodeText(node) {
      const data = node === undefined ? undefined : node.data;
      if ((node.kind === 'user' || node.kind === 'steering') && data !== undefined && Array.isArray(data.content)) {
        const text = data.content
          .filter((block) => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
          .map((block) => block.text)
          .join('')
          .trim();
        return text === '' ? undefined : { role: 'user', seq: data.seq, text };
      }
      if (node.kind !== 'assistant-step') return undefined;
      const finalNode = data === undefined ? undefined : data.finalNode;
      if (finalNode === undefined || finalNode.messageId === undefined) return undefined;
      const text = (finalNode.blocks === undefined || finalNode.blocks === null ? [] : finalNode.blocks)
        .flatMap((block) => (block !== null && typeof block === 'object' && block.kind === 'text' ? [block.text] : []))
        .join('')
        .trim();
      return text === '' ? undefined : { role: 'assistant', seq: finalNode.seq, text, messageId: finalNode.messageId };
    }

    function chatRows(ctx, sessionId) {
      let snapshot;
      try {
        const binding = ctx.uiConversation.binding(sessionId);
        try {
          binding.activate('chat');
        } catch (_error) {
          // Chat target may be absent in a non-chat view; quoting then falls back to the selection text.
        }
        snapshot = binding.target('chat').getSnapshot();
      } catch (_error) {
        return [];
      }
      if (snapshot === undefined || snapshot === null) return [];
      const rows = [];
      for (const key of snapshot.order === undefined ? [] : snapshot.order) {
        const node = snapshot.nodes === undefined || typeof snapshot.nodes.get !== 'function'
          ? undefined
          : snapshot.nodes.get(key);
        if (node === undefined) continue;
        const row = nodeText(node);
        if (row !== undefined) rows.push({ ...row, key });
      }
      rows.sort((left, right) => Number(right.seq || 0) - Number(left.seq || 0));
      return rows;
    }

    function findRow(ctx, sessionId, key) {
      return chatRows(ctx, sessionId).find((row) => row.key === key);
    }

    function selectionInfo() {
      if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return undefined;
      const selection = window.getSelection();
      if (selection === null || selection === undefined || selection.isCollapsed !== false) return undefined;
      const text = normalizeText(selection.toString());
      if (text === '') return undefined;
      const anchor = selection.anchorNode;
      const element = anchor === null || anchor === undefined
        ? null
        : anchor.nodeType === 3
          ? anchor.parentElement
          : anchor;
      const flow = element === null || element === undefined || typeof element.closest !== 'function'
        ? null
        : element.closest('[data-chat-flow-kind]');
      if (flow === null) return undefined;
      const host = flow.closest('[data-conversation-session]');
      if (host === null) return undefined;
      const sessionId = host.getAttribute('data-conversation-session');
      if (sessionId === null || sessionId === '') return undefined;
      const key = flow.getAttribute('data-chat-node-key');
      if (key === null || key === '') return undefined;
      return {
        text,
        sessionId,
        key,
        role: flow.getAttribute('data-chat-flow-kind') === 'user' ? 'user' : 'assistant',
      };
    }

    function insertSpaceAfterQuote(draft, occurrences, ref) {
      const list = Array.isArray(occurrences) ? occurrences : [];
      const ours = list.filter((occurrence) => occurrence !== null && typeof occurrence === 'object' && occurrence.source === SOURCE);
      let target = null;
      for (let index = ours.length - 1; index >= 0; index -= 1) {
        if (ours[index].ref === ref) {
          target = ours[index];
          break;
        }
      }
      if (target === null) return undefined;
      const position = target.offset + target.length;
      const text = String(draft).slice(0, position) + ' ' + String(draft).slice(position);
      const references = list.map((occurrence) => ({
        ...occurrence,
        offset: occurrence.offset >= position ? occurrence.offset + 1 : occurrence.offset,
      }));
      return { text, references };
    }

    function scheduleTrailingSpace(ctx, sessionId, reference) {
      const attempt = (tries) => {
        const scope = sessionInput(ctx, sessionId);
        if (scope === undefined || scope.state === undefined) {
          if (tries < 4) setTimeout(() => attempt(tries + 1), 30);
          return;
        }
        const result = insertSpaceAfterQuote(scope.state.draft, scope.state.occurrences, reference.ref);
        if (result === undefined) {
          if (tries < 4) setTimeout(() => attempt(tries + 1), 30);
          return;
        }
        try {
          scope.actions.setDraft({ text: result.text, references: result.references });
          scope.shell.focus?.();
        } catch (_error) {
          // The quote is still inserted; only the trailing space failed.
        }
      };
      setTimeout(() => attempt(0), 0);
    }

    function insertQuote(ctx, info) {
      if (info === undefined || info.text === undefined || info.text === '') return;
      const scope = sessionInput(ctx, info.sessionId);
      if (scope === undefined) return;
      let span;
      try {
        span = scope.actions.captureInsertion();
      } catch (_error) {
        span = undefined;
      }
      const existing = scope.state === undefined || scope.state.occurrences === undefined
        ? []
        : scope.state.occurrences.filter((occurrence) => occurrence.source === SOURCE);
      const reference = buildReference(info.text, info.role, 0, existing.length + 1);
      try {
        if (scope.actx.bail('slash/input-insert-reference', { reference, span }) === true) {
          try { scope.shell.focus?.(); } catch (_error) { /* noop */ }
          return;
        }
      } catch (_error) {
        // Fall through to plain text.
      }
      try {
        scope.actions.insertText('引用', span);
      } catch (_error) {
        // Composer unavailable; nothing to insert.
      }
      try { scope.shell.focus?.(); } catch (_error) { /* noop */ }
    }

    function chipsInSession(sessionId) {
      const hosts = document.querySelectorAll('[data-conversation-session]');
      for (const host of hosts) {
        if (host.getAttribute('data-conversation-session') === sessionId) {
          return Array.from(host.querySelectorAll(CHIP));
        }
      }
      return [];
    }

    function chipIndex(chip) {
      const sessionId = sessionOf(chip);
      if (sessionId === undefined) return -1;
      return chipsInSession(sessionId).indexOf(chip);
    }

    function dropQuote(ctx, sessionId, index) {
      if (sessionId === undefined || index < 0) return false;
      const scope = sessionInput(ctx, sessionId);
      if (scope === undefined || scope.state === undefined) return false;
      const result = removeQuoteFromDraft(scope.state.draft, scope.state.occurrences, index);
      if (result === undefined) return false;
      try {
        scope.actions.setDraft({ text: result.text, references: result.references });
        scope.shell.focus?.();
        return true;
      } catch (_error) {
        // Keep the draft untouched if the composer rejects the rewrite.
        return false;
      }
    }

    function positionMenu(menu, x, y) {
      menu.style.display = 'flex';
      const rect = menu.getBoundingClientRect();
      const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
      const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
    }

    function mountSelectionMenu(ctx) {
      const menu = document.createElement('div');
      menu.className = 'dshCherryMenu';
      menu.setAttribute('role', 'menu');

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'dshCherryMenuItem';
      copy.setAttribute('role', 'menuitem');
      copy.textContent = '复制';

      const quote = document.createElement('button');
      quote.type = 'button';
      quote.className = 'dshCherryMenuItem';
      quote.setAttribute('role', 'menuitem');
      quote.textContent = '引用';

      menu.appendChild(copy);
      menu.appendChild(quote);
      document.body.appendChild(menu);

      let pending;
      const hide = () => {
        pending = undefined;
        menu.style.display = 'none';
      };

      copy.addEventListener('click', () => {
        const text = pending === undefined ? '' : pending.text;
        hide();
        if (text !== '' && typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
          navigator.clipboard.writeText(text).catch(() => undefined);
        }
      });
      quote.addEventListener('click', () => {
        const target = pending;
        hide();
        if (target !== undefined) insertQuote(ctx, target);
      });

      const onContextMenu = (event) => {
        const info = selectionInfo();
        if (info === undefined) return;
        event.preventDefault();
        pending = info;
        positionMenu(menu, event.clientX, event.clientY);
      };
      const onPointerDown = (event) => {
        if (!menu.contains(event.target)) hide();
      };
      const onKeyDown = (event) => {
        if (event.key === 'Escape') hide();
      };
      const onScroll = () => hide();

      document.addEventListener('contextmenu', onContextMenu, true);
      document.addEventListener('mousedown', onPointerDown, true);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('scroll', onScroll, true);

      return () => {
        hide();
        document.removeEventListener('contextmenu', onContextMenu, true);
        document.removeEventListener('mousedown', onPointerDown, true);
        document.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('scroll', onScroll, true);
        menu.remove();
      };
    }

    function mountChipTooltip(ctx) {
      const tip = document.createElement('div');
      tip.className = 'dshCherryQuoteTip';
      const label = document.createElement('span');
      label.className = 'dshCherryQuoteTipLabel';
      label.textContent = '引用';
      const body = document.createElement('span');
      tip.appendChild(label);
      tip.appendChild(body);
      document.body.appendChild(tip);

      const hide = () => {
        tip.style.display = 'none';
      };
      const position = (chip) => {
        const rect = chip.getBoundingClientRect();
        tip.style.left = '0px';
        tip.style.top = '0px';
        tip.style.display = 'block';
        const own = tip.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - own.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - own.width - 8));
        let top = rect.top - own.height - 8;
        if (top < 8) top = rect.bottom + 8;
        top = Math.max(8, Math.min(top, window.innerHeight - own.height - 8));
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      };
      const show = (chip, text) => {
        body.textContent = text;
        position(chip);
      };
      const onOver = (event) => {
        const target = event.target;
        const chip = target === null || target === undefined || typeof target.closest !== 'function'
          ? null
          : target.closest(CHIP);
        if (chip === null) return;
        const sessionId = sessionOf(chip);
        if (sessionId === undefined) return;
        const scope = sessionInput(ctx, sessionId);
        if (scope === undefined || scope.state === undefined) return;
        const chips = chipsInSession(sessionId);
        const index = chips.indexOf(chip);
        if (index < 0) return;
        const ours = (scope.state.occurrences === undefined ? [] : scope.state.occurrences)
          .filter((occurrence) => occurrence.source === SOURCE);
        const quote = ours[index] === undefined ? undefined : parseRef(ours[index].ref);
        if (quote === undefined) return;
        show(chip, quote.text);
      };
      const onOut = (event) => {
        const chip = event.target === null || event.target === undefined || typeof event.target.closest !== 'function'
          ? null
          : event.target.closest(CHIP);
        if (chip === null) return;
        if (event.relatedTarget !== null && event.relatedTarget !== undefined && chip.contains(event.relatedTarget)) return;
        hide();
      };
      const onKeyDown = (event) => {
        if (event.key === 'Escape') hide();
      };
      const onScroll = () => hide();
      const onDown = () => hide();

      document.addEventListener('mouseover', onOver, true);
      document.addEventListener('mouseout', onOut, true);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('mousedown', onDown, true);
      window.addEventListener('scroll', onScroll, true);

      return () => {
        hide();
        document.removeEventListener('mouseover', onOver, true);
        document.removeEventListener('mouseout', onOut, true);
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('mousedown', onDown, true);
        window.removeEventListener('scroll', onScroll, true);
        tip.remove();
      };
    }

    function mountChipClose(ctx) {
      const onDown = (event) => {
        const target = event.target;
        const chip = target === null || target === undefined || typeof target.closest !== 'function'
          ? null
          : target.closest(CHIP);
        if (chip === null) return;
        const rect = chip.getBoundingClientRect();
        if (event.clientX < rect.right - 20) return;
        event.preventDefault();
        event.stopPropagation();
        const sessionId = sessionOf(chip);
        if (sessionId === undefined) return;
        dropQuote(ctx, sessionId, chipIndex(chip));
      };
      document.addEventListener('mousedown', onDown, true);
      return () => document.removeEventListener('mousedown', onDown, true);
    }

    function adjacentChip(direction) {
      const selection = window.getSelection();
      if (selection === null || selection === undefined || selection.isCollapsed !== true || selection.rangeCount === 0) {
        return null;
      }
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === 1) {
        const index = range.startOffset;
        return direction === 'before'
          ? elementChip(index > 0 ? node.childNodes[index - 1] : null, 'last')
          : elementChip(node.childNodes[index] === undefined ? null : node.childNodes[index], 'first');
      }
      if (node.nodeType !== 3) return null;
      const text = node.textContent === null ? '' : node.textContent;
      const ignorable = (value) => value === '' || value === '\u200b' || value === '\ufeff';
      if (direction === 'before') {
        if (range.startOffset !== 0) return null;
        let previous = node.previousSibling;
        while (previous !== null && previous.nodeType === 3 && ignorable(previous.textContent || '')) {
          previous = previous.previousSibling;
        }
        const chip = elementChip(previous, 'last');
        if (chip !== null) return chip;
        return elementChip(node.parentElement === null ? null : node.parentElement.previousElementSibling, 'last');
      }
      if (range.startOffset !== text.length) return null;
      let next = node.nextSibling;
      while (next !== null && next.nodeType === 3 && ignorable(next.textContent || '')) {
        next = next.nextSibling;
      }
      const chip = elementChip(next, 'first');
      if (chip !== null) return chip;
      return elementChip(node.parentElement === null ? null : node.parentElement.nextElementSibling, 'first');
    }

    function selectedChip() {
      const selection = window.getSelection();
      if (selection === null || selection === undefined || selection.isCollapsed !== false || selection.rangeCount === 0) {
        return null;
      }
      const range = selection.getRangeAt(0);
      const selectedText = normalizeText(selection.toString());
      if (selectedText !== '' && selectedText !== '引用' && selectedText !== '❝引用') return null;
      let found = null;
      for (const chip of document.querySelectorAll(CHIP)) {
        try {
          if (range.intersectsNode(chip) === true) {
            if (found !== null) return null;
            found = chip;
          }
        } catch (_error) {
          return null;
        }
      }
      return found;
    }

    function chipByRange(direction) {
      const selection = window.getSelection();
      if (selection === null || selection === undefined || selection.isCollapsed !== true || selection.rangeCount === 0) {
        return null;
      }
      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      const element = container.nodeType === 3 ? container.parentElement : container;
      const root = element === null || element === undefined || typeof element.closest !== 'function'
        ? document
        : element.closest('[data-conversation-session]') ?? document;
      let found = null;
      for (const chip of root.querySelectorAll(CHIP)) {
        if (chip.contains(range.startContainer)) {
          found = chip;
          continue;
        }
        try {
          const probe = document.createRange();
          if (direction === 'before') {
            probe.setStartAfter(chip);
            probe.setEnd(range.startContainer, range.startOffset);
          } else {
            probe.setStart(range.startContainer, range.startOffset);
            probe.setEndBefore(chip);
          }
          const between = probe.toString().replace(/[\u200b\ufeff]/g, '');
          if (between === '') found = chip;
        } catch (_error) {
          // The caret is on the other side of the chip; not a boundary.
        }
      }
      return found;
    }

    function elementChip(node, edge) {
      if (node === null || node === undefined || node.nodeType !== 1) return null;
      if (typeof node.matches === 'function' && node.matches(CHIP)) return node;
      const child = edge === 'last' ? node.lastElementChild : node.firstElementChild;
      return child !== null && child !== undefined && typeof child.matches === 'function' && child.matches(CHIP)
        ? child
        : null;
    }

    function mountChipCursor() {
      const onMove = (event) => {
        const chip = event.target === null || event.target === undefined || typeof event.target.closest !== 'function'
          ? null
          : event.target.closest(CHIP);
        if (chip === null) return;
        const rect = chip.getBoundingClientRect();
        chip.style.cursor = event.clientX >= rect.right - 20 ? 'pointer' : 'default';
      };
      const onOut = (event) => {
        const chip = event.target === null || event.target === undefined || typeof event.target.closest !== 'function'
          ? null
          : event.target.closest(CHIP);
        if (chip !== null) chip.style.cursor = '';
      };
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseout', onOut, true);
      return () => {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('mouseout', onOut, true);
      };
    }

    function mountChipAtomic() {
      const mark = () => {
        for (const chip of document.querySelectorAll(CHIP)) {
          if (chip.getAttribute('contenteditable') !== 'false') {
            chip.setAttribute('contenteditable', 'false');
            chip.setAttribute('spellcheck', 'false');
          }
        }
      };
      mark();
      const observer = new MutationObserver(mark);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    function mountKeyboardDelete(ctx) {
      const editableActive = () => {
        const active = document.activeElement;
        if (active !== null && active !== undefined && (
          active.isContentEditable === true ||
          (typeof active.closest === 'function' && active.closest('[contenteditable="true"]') !== null)
        )) return true;
        const selection = window.getSelection();
        const anchor = selection === null || selection === undefined ? null : selection.anchorNode;
        const element = anchor === null || anchor === undefined
          ? null
          : anchor.nodeType === 3
            ? anchor.parentElement
            : anchor;
        return element !== null && element !== undefined && typeof element.closest === 'function'
          ? element.closest('[contenteditable="true"]') !== null
          : false;
      };
      const onKeyDown = (event) => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
        if (editableActive() === false) return;
        const direction = event.key === 'Backspace' ? 'before' : 'after';
        const chip = adjacentChip(direction) ?? chipByRange(direction);
        if (chip === null) return;
        const sessionId = sessionOf(chip);
        if (sessionId === undefined) return;
        if (dropQuote(ctx, sessionId, chipIndex(chip)) !== true) return;
        event.preventDefault();
        event.stopPropagation();
      };
      const onKeyUp = (event) => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
        if (editableActive() === false) return;
        const chip = selectedChip();
        if (chip === null) return;
        const sessionId = sessionOf(chip);
        if (sessionId === undefined) return;
        dropQuote(ctx, sessionId, chipIndex(chip));
      };
      const onBeforeInput = (event) => {
        const backward = event.inputType === 'deleteContentBackward';
        const forward = event.inputType === 'deleteContentForward';
        if (!backward && !forward) return;
        if (event.isComposing) return;
        const direction = backward ? 'before' : 'after';
        const chip = adjacentChip(direction) ?? chipByRange(direction) ?? selectedChip();
        if (chip === null) return;
        const sessionId = sessionOf(chip);
        if (sessionId === undefined) return;
        if (dropQuote(ctx, sessionId, chipIndex(chip)) !== true) return;
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('keyup', onKeyUp, true);
      document.addEventListener('beforeinput', onBeforeInput, true);
      return () => {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        document.removeEventListener('beforeinput', onBeforeInput, true);
      };
    }

    function QuoteChip({ node }) {
      const text = node !== null && node !== undefined && node.data !== undefined && typeof node.data.text === 'string'
        ? node.data.text
        : '';
      return h('span', { className: 'dshCherryQuoteChip', title: text },
        h('span', { className: 'dshCherryQuoteChipIcon', 'aria-hidden': true }, '❝'),
        h('span', null, '引用'));
    }

    function userQuoteRule() {
      return {
        id: 'cherry-quote',
        order: 20,
        match(text, from) {
          const candidate = nextUserQuote(text, from);
          if (candidate === undefined) return undefined;
          return {
            id: 'cherry-quote',
            start: candidate.start,
            end: candidate.end,
            data: candidate.data,
          };
        },
      };
    }

    function registerSource(ctx) {
      const source = {
        trigger: '@',
        name: SOURCE,
        order: 10,
        showGroupTitle: false,
        candidates(session, { query }) {
          let rows;
          try {
            rows = chatRows(ctx, session.sessionId);
          } catch (_error) {
            return [];
          }
          const needle = (query === undefined || query === null ? '' : String(query)).trim().toLowerCase();
          const matched = needle === '' ? rows : rows.filter((row) => row.text.toLowerCase().includes(needle));
          return matched.slice(0, 12).map((row) => ({
            name: brief(row.text, 60),
            description: roleLabel(row.role),
            value: JSON.stringify({ key: row.key }),
          }));
        },
        onPick({ candidate, session }) {
          let value;
          try {
            value = JSON.parse(candidate.value);
          } catch (_error) {
            return undefined;
          }
          let rows;
          try {
            rows = chatRows(ctx, session.sessionId);
          } catch (_error) {
            return undefined;
          }
          const row = rows.find((entry) => entry.key === value.key);
          if (row === undefined) return undefined;
          const scope = sessionInput(ctx, session.sessionId);
          const existing = scope === undefined || scope.state === undefined || scope.state.occurrences === undefined
            ? []
            : scope.state.occurrences.filter((occurrence) => occurrence.source === SOURCE);
          return { insert: buildReference(row.text, row.role, row.seq, existing.length + 1) };
        },
        codec: {
          clipboardText() {
            return '引用';
          },
          serialize(ref) {
            const quote = parseRef(ref);
            return Promise.resolve(quote === undefined ? '' : quote.promptText);
          },
        },
      };
      return ctx.effect(
        () => ctx.get('inputTriggers').registerSource(source),
        'cherry-quote: input source',
      );
    }

    return {
      inject: ['slots', 'inputTriggers', 'sessions', 'uiConversation'],
      apply(ctx) {
        injectCss();

        try {
          ctx.uiConversation.userText.register(userQuoteRule());
        } catch (error) {
          console.warn('[cherry-quote] user text rule unavailable', error);
        }

        ctx.slots.inject('conversation.user.text.node', function* () {
          yield ctx.slots.register({
            name: 'conversation.user.text.node',
            key: 'cherry-quote',
          }, QuoteChip);
        });

        ctx.effect(() => mountSelectionMenu(ctx), 'cherry-quote: selection menu');
        ctx.effect(() => mountChipTooltip(ctx), 'cherry-quote: chip tooltip');
        ctx.effect(() => mountChipClose(ctx), 'cherry-quote: chip close');
        ctx.effect(() => mountChipCursor(), 'cherry-quote: chip cursor');
        try {
          registerSource(ctx);
        } catch (error) {
          console.warn('[cherry-quote] input source unavailable', error);
        }
      },
      __test: {
        normalizeText,
        escapeQuoteBody,
        unescapeQuoteBody,
        buildPromptText,
        buildReference,
        parseRef,
        nextUserQuote,
        removeQuoteFromDraft,
        insertSpaceAfterQuote,
      },
    };
  },
});
