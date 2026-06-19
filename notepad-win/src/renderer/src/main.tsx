import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global safety monkey-patch to prevent React rendering crashes when third-party libraries
// or extensions modify the DOM underneath React's feet.
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Prevented invalid removeChild call on parent', this, 'for child', child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any) as any;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Prevented invalid insertBefore call on parent', this, 'for referenceNode', referenceNode);
      }
      return originalInsertBefore.call(this, newNode, this.firstChild) as any;
    }
    return originalInsertBefore.apply(this, arguments as any) as any;
  };
}

createRoot(document.getElementById('root')!).render(<App />)

