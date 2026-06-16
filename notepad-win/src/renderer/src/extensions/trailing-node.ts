import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addOptions() {
    return {
      nodeType: 'paragraph',
      ignoredNodes: ['paragraph'],
    };
  },

  onCreate() {
    // Ensure trailing node on editor creation (startup/load)
    const { state, view } = this.editor;
    const lastNode = state.doc.lastChild;
    if (!lastNode) return;

    const disabledNodes = Object.keys(state.schema.nodes).filter(
      (key) => !this.options.ignoredNodes.includes(key)
    );

    if (disabledNodes.includes(lastNode.type.name)) {
      const nodeType = state.schema.nodes[this.options.nodeType];
      if (nodeType) {
        const tr = state.tr.insert(state.doc.content.size, nodeType.createAndFill()!);
        view.dispatch(tr);
      }
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(this.name);
    const disabledNodes = Object.keys(this.editor.schema.nodes).filter(
      (key) => !this.options.ignoredNodes.includes(key)
    );

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          // Run on every transaction (including switching content) to enforce the rule
          const lastNode = newState.doc.lastChild;
          if (!lastNode) return;

          const isIgnored = !disabledNodes.includes(lastNode.type.name);
          if (isIgnored) return;

          const nodeType = this.editor.schema.nodes[this.options.nodeType];
          if (!nodeType) return;

          return newState.tr.insert(newState.doc.content.size, nodeType.createAndFill()!);
        },
      }),
    ];
  },
});
