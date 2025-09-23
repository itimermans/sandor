import React, { useState, useCallback, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import {
    GRID_COMPONENT_TYPES,
    createGridComponent,
    createGridItem,
    getAvailableComponents,
    getComponentInfo,
    validateGridRegistry
} from './gridComponentRegistry'
import 'react-grid-layout/css/styles.css'
import './GridLayoutRoot.css'
// Note: resize-handle.css doesn't exist in react-grid-layout package
// The resize handles are styled within the main styles.css file

const ResponsiveGridLayout = WidthProvider(Responsive)

/**
 * GridLayoutRoot.jsx
 * 
 * Clean React Grid Layout wrapper that delegates all component rendering to the registry system.
 * This component only handles:
 * - Grid layout management and configuration
 * - Item addition/removal
 * - Layout persistence and responsiveness
 * - Toolbar for adding new panels
 * 
 * All specific component logic is handled by gridComponentRegistry.js
 * 
 * Key Features:
 * - Responsive breakpoints for different screen sizes
 * - Drag and drop panel management
 * - Layout state management
 * - Easy component addition via toolbar
 */

export default function GridLayoutRoot({
    className = '',
    style = {},
    initialLayout = null,
    onLayoutChange = null,
    ...otherProps
}) {
    // Default layout configuration - single source of truth
    // Change this object to modify both initial layout and reset behavior
    const DEFAULT_LAYOUT_CONFIG = useMemo(() => ({
        componentData: {
            'main-chart': {
                componentType: GRID_COMPONENT_TYPES.PLOTLY_CHART,
                componentProps: { index: 1 },
                displayName: 'Chart',
                icon: '📊'
            },
            'welcome': {
                componentType: GRID_COMPONENT_TYPES.PLACEHOLDER,
                componentProps: {
                    title: 'Welcome to Sandor',
                    content: 'Your data analysis dashboard. Add more panels using the toolbar above.',
                    backgroundColor: '#e8f4fd'
                },
                displayName: 'Welcome',
                icon: '👋'
            },
            'initial-viewer': {
                componentType: GRID_COMPONENT_TYPES.DATA_VIEWER,
                componentProps: { index: 2 },
                displayName: 'Data Viewer',
                icon: '📊'
            },
        },
        layouts: {
            lg: [
                { i: 'initial-viewer', x: 0, y: 0, w: 10, h: 16 },    // Large chart on left
                // { i: 'welcome', x: 8, y: 0, w: 4, h: 6 }        // Welcome panel on right
            ]
        },
        nextId: 3
    }), [])

    // Component data storage (separate from layout positioning)
    const [componentData, setComponentData] = useState(DEFAULT_LAYOUT_CONFIG.componentData)

    // Layout state management (only positioning data)
    const [layouts, setLayouts] = useState(() => {
        if (initialLayout) return initialLayout
        return DEFAULT_LAYOUT_CONFIG.layouts
    })

    const [nextId, setNextId] = useState(DEFAULT_LAYOUT_CONFIG.nextId) // For generating unique IDs

    // Validate registry on mount
    useMemo(() => {
        const errors = validateGridRegistry()
        if (errors.length > 0) {
            console.error('Grid registry validation failed:', errors)
        }
    }, [])

    // Handle layout changes
    const handleLayoutChange = useCallback((newLayout, allLayouts) => {
        setLayouts(allLayouts)
        if (onLayoutChange) {
            onLayoutChange(newLayout, allLayouts)
        }
    }, [onLayoutChange])

    // Add new component to grid
    const addComponent = useCallback((componentType) => {
        const newId = `${componentType}-${nextId}`
        const currentLayout = layouts.lg || []

        // Find a good position for the new item (simple algorithm)
        const maxY = currentLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0)

        // Get component info from registry
        const componentInfo = getComponentInfo(componentType)
        if (!componentInfo) {
            console.error(`Unknown component type: ${componentType}`)
            return
        }

        // Add component data
        setComponentData(prev => ({
            ...prev,
            [newId]: {
                componentType,
                componentProps: componentInfo.defaultProps || {},
                displayName: componentInfo.displayName,
                icon: componentInfo.icon
            }
        }))

        // Add layout positioning
        const newLayoutItem = {
            i: newId,
            x: 0,
            y: maxY,
            w: componentInfo.defaultSize?.w || 6,
            h: componentInfo.defaultSize?.h || 4
        }

        const newLayouts = {
            ...layouts,
            lg: [...currentLayout, newLayoutItem]
        }
        setLayouts(newLayouts)
        setNextId(prev => prev + 1)
    }, [layouts, nextId])

    // Remove component from grid
    const removeComponent = useCallback((itemId) => {
        // Remove from layout
        const newLayouts = {
            ...layouts,
            lg: (layouts.lg || []).filter(item => item.i !== itemId)
        }
        setLayouts(newLayouts)

        // Remove from component data
        setComponentData(prev => {
            const newData = { ...prev }
            delete newData[itemId]
            return newData
        })
    }, [layouts])

    // Clear all components
    const clearLayout = useCallback(() => {
        setLayouts({ lg: [] })
        setComponentData({})
    }, [])

    // Reset to default layout - now uses the single source of truth!
    const resetLayout = useCallback(() => {
        setLayouts(DEFAULT_LAYOUT_CONFIG.layouts)
        setComponentData(DEFAULT_LAYOUT_CONFIG.componentData)
        setNextId(DEFAULT_LAYOUT_CONFIG.nextId)
    }, [DEFAULT_LAYOUT_CONFIG])

    // Get available components for toolbar
    const availableComponents = useMemo(() => getAvailableComponents(), [])

    // Render grid items
    const renderGridItem = useCallback((item) => {
        // Get component data from our separate state
        const compData = componentData[item.i]

        if (!compData) {
            console.error(`No component data found for item: ${item.i}`)
            return (
                <div key={item.i} className="grid-item">
                    <div className="grid-item-header">
                        <div className="grid-item-drag-handle" title="Drag to move panel">
                            <span className="drag-icon">⋮⋮</span>
                        </div>
                        <span className="grid-item-title">❌ Missing Component Data</span>
                        <button
                            className="grid-item-remove"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeComponent(item.i)
                            }}
                            title="Remove panel"
                        >
                            ×
                        </button>
                    </div>
                    <div className="grid-item-content">
                        <div>Error: Component data not found for ID: {item.i}</div>
                    </div>
                </div>
            )
        }

        const { componentType, componentProps, displayName, icon } = compData

        return (
            <div key={item.i} className="grid-item">
                {/* Item header with title and controls */}
                <div className="grid-item-header">
                    <div className="grid-item-drag-handle" title="Drag to move panel">
                        <span className="drag-icon">⋮⋮</span>
                    </div>
                    <span className="grid-item-title">
                        {icon} {displayName}
                    </span>
                    <button
                        className="grid-item-remove"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeComponent(item.i)
                        }}
                        title="Remove panel"
                    >
                        ×
                    </button>
                </div>

                {/* Item content */}
                <div className="grid-item-content">
                    {createGridComponent(componentType, componentProps, item.i)}
                </div>
            </div>
        )
    }, [removeComponent, componentData])

    // Grid layout configuration
    const gridProps = {
        className: `layout ${className}`,
        style: {
            minHeight: '500px',
            ...style
        },
        layouts,
        onLayoutChange: handleLayoutChange,
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
        cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
        rowHeight: 60,
        margin: [10, 10],
        draggableHandle: '.grid-item-drag-handle',
        ...otherProps
    }

    return (
        <div className="grid-layout-root">
            {/* Toolbar */}
            <div className="grid-toolbar">
                <div className="grid-toolbar-section">
                    <h3>Add Components:</h3>
                    {availableComponents.map(comp => (
                        <button
                            key={comp.type}
                            className="grid-toolbar-button"
                            onClick={() => addComponent(comp.type)}
                            title={comp.description}
                        >
                            {comp.icon} {comp.displayName}
                        </button>
                    ))}
                </div>

                <div className="grid-toolbar-section">
                    <h3>Layout Controls:</h3>
                    <button className="grid-toolbar-button secondary" onClick={resetLayout}>
                        🔄 Reset
                    </button>
                    <button className="grid-toolbar-button danger" onClick={clearLayout}>
                        🗑️ Clear All
                    </button>
                </div>

                <div className="grid-toolbar-section">
                    <span className="grid-info">
                        {layouts.lg?.length || 0} panels • Drag headers to move • Drag corners to resize
                    </span>
                </div>
            </div>

            {/* Grid Layout */}
            <ResponsiveGridLayout {...gridProps}>
                {(layouts.lg || []).map(renderGridItem)}
            </ResponsiveGridLayout>
        </div>
    )
}