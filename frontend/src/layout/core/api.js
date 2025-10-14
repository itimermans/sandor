// Layout Abstraction API (JSDoc types + minimal utilities)
// This file defines the shape of a layout manager used by the app.

/**
 * @typedef {Object} LayoutComponentDescriptor
 * @property {string} type - Must be 'component'.
 * @property {string} componentType - Registry name of the component.
 * @property {string} [title]
 * @property {any} [componentState]
 */

/**
 * @typedef {Object} LayoutContainerDescriptor
 * @property {'row'|'column'|'stack'} type
 * @property {(LayoutContainerDescriptor|LayoutComponentDescriptor)[]} content
 * @property {string} [title]
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {LayoutContainerDescriptor} root
 */

/**
 * @callback ComponentRenderFn
 * @param {HTMLElement} containerEl - Element to mount content into (100% sized)
 * @param {any} [state] - Optional initial state of the component
 * @returns {() => void | void} cleanup - Optional cleanup function to dispose resources
 */

/**
 * @interface LayoutManager
 * @property {(hostEl: HTMLElement) => void} init - Initialize layout inside host element
 * @property {(name: string, render: ComponentRenderFn) => void} registerComponent - Register a component factory by name
 * @property {(config: LayoutConfig) => void} loadLayout - Load a full layout configuration
 * @property {(item: LayoutComponentDescriptor) => void} addToRoot - Add a component to the root container (append)
 * @property {() => void} updateSize - Trigger a size/layout recalculation
 * @property {() => void} destroy - Dispose of the layout manager and all resources
 */

// This module only provides types and documentation for implementations.
export { }
