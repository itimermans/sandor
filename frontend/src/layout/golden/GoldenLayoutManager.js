import { GoldenLayout } from 'golden-layout'

// GoldenLayoutManager implements the LayoutManager interface defined in layout/core/api.js
export class GoldenLayoutManager {
    /** @type {GoldenLayout | null} */
    #layout = null
    /** @type {HTMLElement | null} */
    #host = null

    init(hostEl) {
        if (this.#layout) return
        this.#host = hostEl
        this.#layout = new GoldenLayout(hostEl)
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
    }
}
