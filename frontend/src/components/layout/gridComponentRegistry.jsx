/**
 * gridComponentRegistry.js
 * 
 * Layout-agnostic component registry for grid-based layouts.
 * This registry is designed to be independent of the specific layout library used,
 * making it easy to switch between React Grid Layout, CSS Grid, or other systems.
 * 
 * Architecture Benefits:
 * - Clean separation between layout management and component logic
 * - Easy to swap layout systems (React Grid Layout → Allotment → CSS Grid, etc.)
 * - Components can be tested independently
 * - Consistent component registration pattern
 * 
 * To add a new panel type:
 * 1. Create your component (e.g., src/components/panels/DataTablePanel.jsx)
 * 2. Import it below
 * 3. Add a key to GRID_COMPONENT_TYPES
 * 4. Add an entry to GRID_COMPONENT_CONFIGS
 */

import React from 'react'
import ExamplePlotlyChart from '../ExamplePlotlyChart'
import PlaceholderPanel from '../panels/PlaceholderPanel'

/**
 * Central registry of all component types supported by grid layouts.
 * Use these constants instead of magic strings throughout the application.
 */
export const GRID_COMPONENT_TYPES = {
    PLOTLY_CHART: 'plotly-chart',
    PLACEHOLDER: 'placeholder-panel',
    // Add new component types here as you develop them:
    // DATA_TABLE: 'data-table',
    // FILE_BROWSER: 'file-browser',
    // SETTINGS_PANEL: 'settings-panel',
    // METRICS_DASHBOARD: 'metrics-dashboard',
}

/**
 * Component configurations including metadata for layout systems.
 * Each entry defines how a component should behave in different layout contexts.
 */
export const GRID_COMPONENT_CONFIGS = {
    [GRID_COMPONENT_TYPES.PLOTLY_CHART]: {
        component: ExamplePlotlyChart,
        displayName: 'Plotly Chart',
        description: 'Interactive data visualization chart',
        defaultProps: {
            index: 1
        },
        // Grid layout specific properties
        grid: {
            defaultSize: { w: 6, h: 4 }, // width: 6 columns, height: 4 rows
            minSize: { w: 3, h: 2 },
            maxSize: { w: 12, h: 8 },
            resizable: true,
            draggable: true
        },
        // Future layout system properties can be added here
        // dock: { ... }, // For docking layouts
        // split: { ... }, // For split-pane layouts
        icon: '📊',
        category: 'visualization'
    },

    [GRID_COMPONENT_TYPES.PLACEHOLDER]: {
        component: PlaceholderPanel,
        displayName: 'Placeholder Panel',
        description: 'Lightweight panel for testing and prototyping',
        defaultProps: {
            title: 'Test Panel',
            content: 'This is a placeholder for testing layouts',
            showControls: true,
            backgroundColor: '#f8f9fa'
        },
        grid: {
            defaultSize: { w: 4, h: 3 },
            minSize: { w: 2, h: 2 },
            maxSize: { w: 8, h: 6 },
            resizable: true,
            draggable: true
        },
        icon: '🔲',
        category: 'utility'
    },

    // Template for adding new components:
    // [GRID_COMPONENT_TYPES.DATA_TABLE]: {
    //     component: DataTablePanel,
    //     displayName: 'Data Table',
    //     description: 'Tabular data display with sorting and filtering',
    //     defaultProps: {
    //         data: [],
    //         sortable: true,
    //         filterable: true
    //     },
    //     grid: {
    //         defaultSize: { w: 8, h: 5 },
    //         minSize: { w: 4, h: 3 },
    //         maxSize: { w: 12, h: 10 },
    //         resizable: true,
    //         draggable: true
    //     },
    //     icon: '📋',
    //     category: 'data'
    // },
}

/**
 * Get component information from the registry.
 * 
 * @param {string} componentType - One of GRID_COMPONENT_TYPES values
 * @returns {object} Component configuration object
 */
export function getComponentInfo(componentType) {
    const config = GRID_COMPONENT_CONFIGS[componentType]

    if (!config) {
        console.warn(`Component type ${componentType} not found`)
        return null
    }

    return {
        component: config.component,
        displayName: config.displayName,
        description: config.description,
        defaultProps: config.defaultProps || {},
        defaultSize: config.grid?.defaultSize || { w: 6, h: 4 },
        icon: config.icon || '🔲',
        category: config.category || 'unknown'
    }
}

/**
 * Create a React element for a given component type with props.
 * This function abstracts component creation from layout specifics.
 * 
 * @param {string} componentType - One of GRID_COMPONENT_TYPES values
 * @param {object} props - Props to pass to the component
 * @param {string} key - React key for the component
 * @returns {React.Element} Rendered component
 */
export function createGridComponent(componentType, props = {}, key = null) {
    const config = GRID_COMPONENT_CONFIGS[componentType]

    if (!config) {
        console.error(`Unknown component type: ${componentType}`)
        return (
            <div key={key} style={{
                padding: '20px',
                backgroundColor: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '4px',
                color: '#c62828'
            }}>
                <h3>Unknown Component</h3>
                <p>Component type "{componentType}" not found in registry.</p>
            </div>
        )
    }

    const Component = config.component
    const mergedProps = { ...config.defaultProps, ...props }

    return React.createElement(Component, { key, ...mergedProps })
}

/**
 * Get layout-specific configuration for a component type.
 * 
 * @param {string} componentType - One of GRID_COMPONENT_TYPES values
 * @param {string} layoutType - Layout system type ('grid', 'dock', 'split', etc.)
 * @returns {object} Layout configuration object
 */
export function getLayoutConfig(componentType, layoutType = 'grid') {
    const config = GRID_COMPONENT_CONFIGS[componentType]

    if (!config) {
        console.warn(`Component type ${componentType} not found`)
        return null
    }

    return config[layoutType] || null
}

/**
 * Create a grid item configuration for React Grid Layout.
 * 
 * @param {string} componentType - One of GRID_COMPONENT_TYPES values
 * @param {string} id - Unique identifier for this grid item
 * @param {object} position - Grid position { x, y, w, h }
 * @param {object} componentProps - Props to pass to the component
 * @returns {object} Grid item configuration
 */
export function createGridItem(componentType, id, position = null, componentProps = {}) {
    const config = GRID_COMPONENT_CONFIGS[componentType]

    if (!config) {
        console.error(`Cannot create grid item for unknown component type: ${componentType}`)
        return null
    }

    const gridConfig = config.grid
    const finalPosition = position || {
        x: 0,
        y: 0,
        ...gridConfig.defaultSize
    }

    return {
        // React Grid Layout properties
        i: id,
        x: finalPosition.x,
        y: finalPosition.y,
        w: finalPosition.w,
        h: finalPosition.h,
        minW: gridConfig.minSize?.w,
        minH: gridConfig.minSize?.h,
        maxW: gridConfig.maxSize?.w,
        maxH: gridConfig.maxSize?.h,
        isResizable: gridConfig.resizable !== false,
        isDraggable: gridConfig.draggable !== false,

        // Custom properties for component creation
        componentType,
        componentProps: { ...config.defaultProps, ...componentProps },
        displayName: config.displayName,
        icon: config.icon
    }
}

/**
 * Get all available component types with their metadata.
 * Useful for building component selection UIs.
 * 
 * @returns {Array} Array of component metadata objects
 */
export function getAvailableComponents() {
    return Object.entries(GRID_COMPONENT_CONFIGS).map(([type, config]) => ({
        type,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        category: config.category,
        defaultSize: config.grid?.defaultSize
    }))
}

/**
 * Validate that all component types have valid configurations.
 * Useful for catching configuration errors during development.
 * 
 * @returns {string[]} Array of validation errors
 */
export function validateGridRegistry() {
    const errors = []

    Object.entries(GRID_COMPONENT_TYPES).forEach(([key, type]) => {
        const config = GRID_COMPONENT_CONFIGS[type]

        if (!config) {
            errors.push(`Missing configuration for component type: ${type}`)
            return
        }

        if (!config.component) {
            errors.push(`Missing component class for type: ${type}`)
        }

        if (!config.grid) {
            errors.push(`Missing grid configuration for type: ${type}`)
        }

        if (!config.displayName) {
            errors.push(`Missing displayName for type: ${type}`)
        }
    })

    if (errors.length > 0) {
        console.error('Grid registry validation errors:', errors)
    }

    return errors
}