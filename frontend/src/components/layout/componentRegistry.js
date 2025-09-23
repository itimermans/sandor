/**
 * componentRegistry.js
 * 
 * Centralized registry for Golden Layout component types and their factory functions.
 * This file decouples Golden Layout management from specific component implementations,
 * making it easy to add new panel types and test components independently.
 * 
 * To add a new window type:
 * 1. Create your component (e.g., src/components/panels/DataTablePanel.jsx)
 * 2. Import it below
 * 3. Add a key to COMPONENT_TYPES
 * 4. Add a factory function to componentFactories
 * 5. Use the type when creating panels: { type: 'component', componentType: COMPONENT_TYPES.DATA_TABLE, ... }
 */

import React from 'react'
import { createRoot } from 'react-dom/client'

// Import all panel components
import ExamplePlotlyChart from '../ExamplePlotlyChart'
import PlaceholderPanel from '../panels/PlaceholderPanel'

/**
 * Central registry of all component types supported by Golden Layout.
 * Use these constants instead of magic strings throughout the application.
 */
export const COMPONENT_TYPES = {
    PLOTLY_CHART: 'plotly-chart',
    PLACEHOLDER: 'placeholder-panel',
    // Add new component types here as you develop them:
    // DATA_TABLE: 'data-table',
    // FILE_BROWSER: 'file-browser',
    // SETTINGS_PANEL: 'settings-panel',
}

/**
 * Factory functions that create React components inside Golden Layout containers.
 * Each factory receives (container, componentState) from Golden Layout.
 * 
 * Best practices:
 * - Always set element dimensions to 100% for proper layout integration
 * - Use React 18 createRoot for mounting
 * - Clean up root on container destroy to prevent memory leaks
 * - Pass componentState as props to enable stateful panels
 * - Wrap components in error boundaries for production
 */
export const componentFactories = {
    [COMPONENT_TYPES.PLOTLY_CHART]: (container, componentState) => {
        const element = document.createElement('div')
        element.style.height = '100%'
        element.style.width = '100%'
        container.element.append(element)

        const root = createRoot(element)
        const index = componentState?.index ?? 1

        root.render(
            <ExamplePlotlyChart
                index={index}
                // Pass any additional state from Golden Layout
                {...componentState}
            />
        )

        // Critical: clean up on container destroy
        container.on('destroy', () => {
            try {
                root.unmount()
            } catch (error) {
                console.warn('Error unmounting Plotly chart:', error)
            }
        })
    },

    [COMPONENT_TYPES.PLACEHOLDER]: (container, componentState) => {
        const element = document.createElement('div')
        element.style.height = '100%'
        element.style.width = '100%'
        container.element.append(element)

        const root = createRoot(element)

        root.render(
            <PlaceholderPanel
                title={componentState?.title ?? 'Placeholder'}
                content={componentState?.content ?? 'This is a placeholder panel for testing.'}
                {...componentState}
            />
        )

        container.on('destroy', () => {
            try {
                root.unmount()
            } catch (error) {
                console.warn('Error unmounting placeholder panel:', error)
            }
        })
    },

    // Add new component factories here:
    // [COMPONENT_TYPES.DATA_TABLE]: (container, componentState) => {
    //     const element = document.createElement('div')
    //     element.style.height = '100%'
    //     element.style.width = '100%'
    //     container.element.append(element)
    //     
    //     const root = createRoot(element)
    //     root.render(<DataTablePanel data={componentState?.data} />)
    //     
    //     container.on('destroy', () => {
    //         try { root.unmount() } catch (e) { console.warn('Unmount error:', e) }
    //     })
    // },
}

/**
 * Register all component factories with a Golden Layout instance.
 * Call this once during layout initialization.
 * 
 * @param {GoldenLayout} layout - Golden Layout instance
 */
export function registerAllComponents(layout) {
    Object.entries(componentFactories).forEach(([componentType, factory]) => {
        layout.registerComponentFactoryFunction(componentType, factory)
    })
}

/**
 * Validate that all component types have corresponding factories.
 * Useful for catching configuration errors during development.
 * 
 * @returns {string[]} Array of component types missing factories
 */
export function validateRegistry() {
    const missingFactories = []

    Object.values(COMPONENT_TYPES).forEach(type => {
        if (!componentFactories[type]) {
            missingFactories.push(type)
        }
    })

    if (missingFactories.length > 0) {
        console.error('Missing component factories for types:', missingFactories)
    }

    return missingFactories
}

/**
 * Helper function to create a standard panel configuration.
 * Use this for consistent panel creation throughout the application.
 * 
 * @param {string} componentType - One of COMPONENT_TYPES values
 * @param {string} title - Panel title displayed in Golden Layout
 * @param {object} componentState - Props/state to pass to the component
 * @returns {object} Golden Layout item configuration
 */
export function createPanelConfig(componentType, title, componentState = {}) {
    return {
        type: 'component',
        componentType,
        title,
        componentState
    }
}