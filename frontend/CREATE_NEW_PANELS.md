# Creating New Panels in Sandor Dashboard

This guide explains how to add new panel types to the Sandor dashboard system. The component registry architecture makes it easy to add new visualizations and tools without modifying the layout system.

## 🏗️ Architecture Overview

The dashboard uses a **component registry pattern** that separates:
- **Layout Management**: React Grid Layout handles positioning, dragging, resizing
- **Component Logic**: Individual panels focus on their specific functionality
- **Registry System**: Central configuration that connects everything together

This design allows easy switching between layout frameworks and simple panel addition.

## 📋 Quick Steps

1. **Create your component** in `src/components/panels/`
2. **Import** it in `gridComponentRegistry.jsx`
3. **Add a type constant** to `GRID_COMPONENT_TYPES`
4. **Add configuration** to `GRID_COMPONENT_CONFIGS`

## 🛠️ Step-by-Step Tutorial

### Step 1: Create Your Panel Component

Create a new file: `frontend/src/components/panels/YourNewPanel.jsx`

```jsx
import React from 'react'

export default function YourNewPanel({ 
    title = "My Panel",
    data = [],
    backgroundColor = "#ffffff",
    showControls = false,
    ...otherProps 
}) {
    return (
        <div style={{ 
            padding: '15px', 
            backgroundColor,
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>{title}</h3>
            
            {/* Your panel content here */}
            <div style={{ flex: 1 }}>
                <p>Panel content goes here...</p>
                {data.length > 0 && (
                    <ul>
                        {data.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                )}
            </div>
            
            {showControls && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                    <button>Action 1</button>
                    <button>Action 2</button>
                </div>
            )}
        </div>
    )
}
```

### Step 2: Import Your Component

In `frontend/src/components/layout/gridComponentRegistry.jsx`, add your import:

```jsx
import React from 'react'
import ExamplePlotlyChart from '../ExamplePlotlyChart'
import PlaceholderPanel from '../panels/PlaceholderPanel'
import YourNewPanel from '../panels/YourNewPanel'  // ← Add this line
```

### Step 3: Add Component Type Constant

In the `GRID_COMPONENT_TYPES` object, add your panel type:

```jsx
export const GRID_COMPONENT_TYPES = {
    PLOTLY_CHART: 'plotly-chart',
    PLACEHOLDER: 'placeholder-panel',
    YOUR_NEW_PANEL: 'your-new-panel',  // ← Add this line
    // Add more panel types here...
}
```

**Naming Convention**: Use `SCREAMING_SNAKE_CASE` for the constant and `kebab-case` for the string value.

### Step 4: Add Component Configuration

In the `GRID_COMPONENT_CONFIGS` object, add your configuration:

```jsx
[GRID_COMPONENT_TYPES.YOUR_NEW_PANEL]: {
    component: YourNewPanel,
    displayName: 'Your Panel Name',
    description: 'Description that appears in toolbar tooltip',
    defaultProps: {
        title: 'Default Title',
        backgroundColor: '#f8f9fa',
        data: ['Sample item 1', 'Sample item 2'],
        showControls: true
    },
    grid: {
        defaultSize: { w: 6, h: 4 },    // width: 6 cols, height: 4 rows
        minSize: { w: 3, h: 2 },        // minimum size when resizing
        maxSize: { w: 12, h: 8 },       // maximum size when resizing
        resizable: true,                // can be resized
        draggable: true                 // can be dragged
    },
    icon: '📊',                         // emoji/icon for toolbar button
    category: 'visualization'           // category for organization
},
```

## ⚙️ Configuration Reference

### `defaultProps`
Default properties passed to your component when first created. These can be overridden per instance.

**Common props to include:**
- `title`: Display name for the panel
- `backgroundColor`: Panel background color
- `data`: Initial data for the component
- Any component-specific configuration

### `grid` Configuration

#### `defaultSize: { w, h }`
- `w`: Width in grid columns (1-12, where 12 = full width)
- `h`: Height in grid rows (each row ≈ 60px)

**Common sizes:**
- Small widget: `{ w: 3, h: 2 }`
- Medium panel: `{ w: 6, h: 4 }`
- Large visualization: `{ w: 8, h: 6 }`
- Full-width dashboard: `{ w: 12, h: 8 }`

#### `minSize/maxSize`
Defines resize limits to prevent panels from becoming unusable.

#### `resizable/draggable`
Control whether users can resize or move the panel.

### `icon`
Emoji or symbol displayed in the toolbar button. Keep it simple and recognizable.

**Suggested icons by category:**
- 📊 📈 📉 Charts and graphs
- 📋 📝 📄 Tables and lists  
- ⚙️ 🔧 🛠️ Settings and tools
- 📁 📂 🗂️ File management
- 🔍 🔎 🕵️ Search and analysis
- 📊 💹 📈 Financial data
- 🗺️ 🌍 📍 Maps and location

### `category`
Used for future organization and filtering.

**Standard categories:**
- `'visualization'`: Charts, graphs, plots
- `'data'`: Tables, lists, raw data display
- `'analysis'`: Statistical tools, calculations
- `'utility'`: Settings, controls, helpers
- `'io'`: File import/export, data sources

## 📚 Complete Examples

### Example 1: Data Table Panel

```jsx
// src/components/panels/DataTablePanel.jsx
import React, { useState } from 'react'

export default function DataTablePanel({ 
    title = "Data Table",
    data = [],
    columns = [],
    sortable = true,
    filterable = false 
}) {
    const [sortColumn, setSortColumn] = useState(null)
    const [sortDirection, setSortDirection] = useState('asc')

    const handleSort = (column) => {
        if (!sortable) return
        
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const sortedData = sortColumn 
        ? [...data].sort((a, b) => {
            const aVal = a[sortColumn]
            const bVal = b[sortColumn]
            const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
            return sortDirection === 'desc' ? -result : result
        })
        : data

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{title}</h3>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={col} 
                                    onClick={() => handleSort(col)}
                                    style={{ 
                                        padding: '8px', 
                                        borderBottom: '2px solid #dee2e6',
                                        cursor: sortable ? 'pointer' : 'default',
                                        textAlign: 'left'
                                    }}
                                >
                                    {col}
                                    {sortColumn === col && (
                                        <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, index) => (
                            <tr key={index}>
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                                        {row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
```

**Registry configuration:**
```jsx
[GRID_COMPONENT_TYPES.DATA_TABLE]: {
    component: DataTablePanel,
    displayName: 'Data Table',
    description: 'Sortable table for displaying tabular data',
    defaultProps: {
        title: 'Data Table',
        data: [
            { name: 'Alice', age: 30, city: 'New York' },
            { name: 'Bob', age: 25, city: 'Los Angeles' },
            { name: 'Charlie', age: 35, city: 'Chicago' }
        ],
        columns: ['name', 'age', 'city'],
        sortable: true,
        filterable: false
    },
    grid: {
        defaultSize: { w: 8, h: 5 },
        minSize: { w: 4, h: 3 },
        maxSize: { w: 12, h: 10 },
        resizable: true,
        draggable: true
    },
    icon: '📋',
    category: 'data'
},
```

### Example 2: Settings Panel

```jsx
// src/components/panels/SettingsPanel.jsx
import React, { useState } from 'react'

export default function SettingsPanel({ 
    title = "Settings",
    theme = 'light',
    autoSave = true,
    onSettingsChange
}) {
    const [settings, setSettings] = useState({ theme, autoSave })

    const handleChange = (key, value) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        onSettingsChange?.(newSettings)
    }

    return (
        <div style={{ padding: '15px', height: '100%' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{title}</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Theme:
                </label>
                <select 
                    value={settings.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                    style={{ width: '100%', padding: '5px' }}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => handleChange('autoSave', e.target.checked)}
                    />
                    Auto-save changes
                </label>
            </div>

            <button 
                style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px' 
                }}
                onClick={() => console.log('Settings saved:', settings)}
            >
                Save Settings
            </button>
        </div>
    )
}
```

## 🎯 Best Practices

### Component Design
1. **Make it responsive**: Use `height: '100%'` and `overflow: 'auto'` for scrollable content
2. **Handle empty data**: Provide meaningful defaults and empty states
3. **Use consistent styling**: Follow the existing visual patterns
4. **Keep it focused**: Each panel should have a single, clear purpose

### Props Design
1. **Provide sensible defaults**: Every prop should have a default value
2. **Use clear naming**: Props should be self-documenting
3. **Support customization**: Allow colors, titles, and behavior to be configured
4. **Handle callbacks**: Use optional callbacks for user interactions

### Performance
1. **Avoid heavy computations**: Move expensive operations to useEffect with dependencies
2. **Memoize when needed**: Use React.memo for components that re-render frequently
3. **Lazy load data**: For large datasets, implement pagination or virtualization

### Testing
1. **Test with different props**: Ensure your component works with various configurations
2. **Test empty states**: What happens when data is empty or undefined?
3. **Test responsiveness**: Does it work at different panel sizes?

## 🚀 After Creating Your Panel

Once you've completed the 4 steps:

1. ✅ **Automatic toolbar integration**: Your panel appears in the "Add Components" section
2. ✅ **Drag and drop support**: Users can add, move, and resize your panels
3. ✅ **Layout persistence**: Panel positions are maintained across sessions
4. ✅ **Close functionality**: Users can remove individual panels
5. ✅ **Registry validation**: Built-in validation ensures your configuration is correct

## 🔧 Troubleshooting

### Panel doesn't appear in toolbar
- Check that you imported the component correctly
- Verify the component type is added to `GRID_COMPONENT_TYPES`
- Ensure the configuration object is properly formatted

### Panel renders as "Unknown Component"
- Verify the component export (should be `export default`)
- Check that the component name in the registry matches the import
- Look for JavaScript errors in the browser console

### Panel doesn't resize properly
- Ensure your component uses `height: '100%'` on the root element
- Check that content is properly contained with `overflow: auto`
- Verify `defaultSize`, `minSize`, and `maxSize` are reasonable

### Props not working
- Check that prop names match between `defaultProps` and your component
- Ensure props have default values in your component
- Verify props are properly destructured in the component function

## 📖 Related Files

- **Main registry**: `frontend/src/components/layout/gridComponentRegistry.jsx`
- **Layout root**: `frontend/src/components/layout/GridLayoutRoot.jsx`
- **Example panels**: `frontend/src/components/panels/`
- **Styles**: `frontend/src/components/layout/GridLayoutRoot.css`

---

**Happy panel building! 🎉**

If you need help or run into issues, the registry system is designed to provide clear error messages and validation feedback.