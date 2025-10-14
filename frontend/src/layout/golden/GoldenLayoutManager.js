import { GoldenLayout } from 'golden-layout'

// GoldenLayoutManager implements the LayoutManager interface defined in layout/core/api.js
export class GoldenLayoutManager {
    /** @type {GoldenLayout | null} */
    #layout = null
    /** @type {HTMLElement | null} */
    #host = null
    /** @type {(() => void) | null} */
    #addHandler = null
    /** @type {WeakMap<any, HTMLButtonElement>} */
    #stackButtons = new WeakMap()

    init(hostEl) {
        if (this.#layout) return
        this.#host = hostEl
        this.#layout = new GoldenLayout(hostEl)

        this.#layout.on('stackCreated', stack => {
            this.#ensureAddButton(stack)
        })

        this.#layout.on('initialised', () => {
            this.#refreshAddButtons()
        })
    }

    registerComponent(name, renderFn) {
        if (!this.#layout) throw new Error('Layout not initialized')
        this.#layout.registerComponentFactoryFunction(name, (container, state) => {
            const el = document.createElement('div')
            el.style.height = '100%'
            el.style.width = '100%'
            container.element.append(el)
            let cleanup
            try {
                cleanup = renderFn(el, state)
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Component render failed', e)
            }
            container.on('destroy', () => {
                try { cleanup && cleanup() } catch (_) { /* ignore */ }
            })
        })
    }

    loadLayout(config) {
        if (!this.#layout) throw new Error('Layout not initialized')
        this.#layout.loadLayout(config)
    }

    addToRoot(item) {
        if (!this.#layout) throw new Error('Layout not initialized')
        const rootItem = this.#layout.rootItem
        if (!rootItem) return
        rootItem.addItem(item)
    }

    updateSize() {
        if (this.#layout) this.#layout.updateSize()
    }

    destroy() {
        if (this.#layout) {
            try { this.#layout.destroy() } catch (_) { /* ignore */ }
            this.#layout = null
        }
        this.#host = null
        this.#addHandler = null
        this.#stackButtons = new WeakMap()
    }

    setAddComponentHandler(handler) {
        this.#addHandler = handler
        this.#refreshAddButtons()
    }

    #refreshAddButtons() {
        if (!this.#layout || !this.#addHandler) return
        const root = this.#layout.rootItem
        if (!root) return
        this.#visitStacks(root, stack => this.#ensureAddButton(stack))
    }

    #visitStacks(item, visitor) {
        if (!item) return
        const typeName = item.typeName || item.type
        if (typeName === 'stack') {
            visitor(item)
        }
        if (Array.isArray(item.contentItems)) {
            for (const child of item.contentItems) {
                this.#visitStacks(child, visitor)
            }
        }
    }

    #ensureAddButton(stack) {
        if (!this.#addHandler || !stack?.header?.controlsContainerElement) return
        const existing = this.#stackButtons.get(stack)
        if (existing && existing.isConnected) return

        const container = stack.header.controlsContainerElement
        const doc = container.ownerDocument
        const button = doc.createElement('button')
        button.type = 'button'
        button.className = 'gl-add-tab-btn'
        button.title = 'Add pane'
        button.textContent = '+'
        button.addEventListener('click', evt => {
            evt.stopPropagation()
            this.#addHandler && this.#addHandler()
        })

        container.appendChild(button)
        this.#stackButtons.set(stack, button)

        stack.on('destroy', () => {
            button.remove()
            this.#stackButtons.delete(stack)
        })
    }
}
