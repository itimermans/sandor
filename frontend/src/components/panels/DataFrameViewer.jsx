import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { EditorProvider } from './plot/editor/EditorContext.jsx';
import { TransportClient } from '../../lib/transport/client.js';
import { parseArrowToColumns } from '../../lib/arrow/utils.js';

// Skeleton for a complex DataFrameViewer component
const DataFrameViewer = ({ index = 1 }) => {
    // Backend-fed dataset metadata and data cache
    const [datasets, setDatasets] = useState([]); // array of { dataset_id, columns }
    const [datasetColumnsMap, setDatasetColumnsMap] = useState({}); // { [datasetId]: string[] }
    const [tableCache, setTableCache] = useState({}); // { [datasetId]: { [col]: array } }

    // Dynamic traces state: [{ datasetId, x, y, name, color }]
    const [traces, setTraces] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { payload } = await TransportClient.listDatasets();
                if (!payload || !Array.isArray(payload) || payload.length === 0) return;
                if (cancelled) return;
                setDatasets(payload);
                const map = {};
                payload.forEach(d => { map[d.dataset_id] = d.columns; });
                setDatasetColumnsMap(map);
                // Initialize with a single default trace: first dataset, first two columns
                const d0 = payload[0];
                if (d0 && d0.columns && d0.columns.length > 0) {
                    const x0 = d0.columns[0];
                    const y0 = d0.columns[1] || d0.columns[0];
                    setTraces([{ datasetId: d0.dataset_id, x: x0, y: y0, name: 'Trace 1', color: '#1f77b4' }]);
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to load datasets', err);
            }
        })();
        return () => { cancelled = true };
    }, []);

    const [figure, setFigure] = useState(() => ({
        data: [
            {
                x: [],
                y: [],
                type: 'scattergl',
                mode: 'lines',
                name: `Trace 1`,
                line: { color: '#1f77b4' },
            }
        ],
        layout: {
            autosize: true,
            title: `Dataset`,
            showlegend: true,
            // Keep user UI interactions (zoom, legend visibility) across updates
            uirevision: 'dfv-1',
        },
        config: {
            responsive: true,
            displayModeBar: true,
            scrollZoom: true,
            editable: true,
        },
        revision: 0
    }));

    const ensureColumns = useCallback(async (datasetId, neededCols) => {
        if (!datasetId) return {};
        const dsCache = tableCache[datasetId] || {};
        const missing = neededCols.filter(c => !(c in dsCache));
        if (missing.length === 0) return {};
        const desc = {
            dataset_id: datasetId,
            columns: Array.from(new Set(missing)),
            row_range: [0, 200000],
            format_hint: 'arrow',
        };
        const buf = await TransportClient.fetchSlice(desc);
        const cols = parseArrowToColumns(buf);
        setTableCache(prev => ({ ...prev, [datasetId]: { ...(prev[datasetId] || {}), ...cols } }));
        return cols;
    }, [tableCache]);

    // Sync figure with traces: ensure data is loaded and update Plotly traces
    useEffect(() => {
        let cancelled = false;
        if (!traces.length || !datasets.length) return;
        (async () => {
            try {
                // Ensure needed columns exist in cache and accumulate a local merged cache
                const mergedCache = { ...tableCache };
                for (let i = 0; i < traces.length; i++) {
                    const tr = traces[i];
                    const cols = datasetColumnsMap[tr.datasetId] || [];
                    if (!cols.length) continue;
                    const fetched = await ensureColumns(tr.datasetId, [tr.x, tr.y]);
                    if (fetched && Object.keys(fetched).length) {
                        mergedCache[tr.datasetId] = {
                            ...(mergedCache[tr.datasetId] || {}),
                            ...fetched,
                        };
                    }
                    if (cancelled) return;
                }
                // Build figure.data from traces and cache
                setFigure(f => {
                    const newData = traces.map((tr, i) => {
                        const dsCache = (mergedCache[tr.datasetId] || tableCache[tr.datasetId]) || {};
                        const prev = f.data[i] || {};
                        return {
                            x: dsCache[tr.x] || [],
                            y: dsCache[tr.y] || [],
                            type: 'scattergl',
                            mode: 'lines',
                            name: tr.name || `Trace ${i + 1}`,
                            line: { color: tr.color || '#1f77b4' },
                            // Preserve legend visibility state if user toggled
                            visible: prev.visible,
                        };
                    });
                    const newTitle = traces[0]
                        ? `${traces[0].datasetId}: ${traces[0].y} vs ${traces[0].x}`
                        : 'Dataset';
                    return { ...f, data: newData, layout: { ...f.layout, title: newTitle }, revision: f.revision + 1 };
                });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to sync traces', err);
            }
        })();
        return () => { cancelled = true };
    }, [traces, datasets, datasetColumnsMap, tableCache, ensureColumns]);

    // Event handlers for future extensibility
    const handleInitialized = useCallback((fig, graphDiv) => {
        setFigure(f => ({ ...f, ...fig }));
        // Sync any user-edited trace names from the rendered figure into our traces state
        if (fig && Array.isArray(fig.data)) {
            setTraces(ts => {
                if (!ts || ts.length === 0) return ts;
                const next = ts.map((t, i) => {
                    const name = fig.data[i]?.name;
                    return name !== undefined && name !== t.name ? { ...t, name } : t;
                });
                // Only update if changed
                for (let i = 0; i < next.length; i++) {
                    if (next[i].name !== ts[i].name) return next;
                }
                return ts;
            });
        }
    }, []);
    const handleUpdate = useCallback((fig, graphDiv) => {
        setFigure(f => ({ ...f, ...fig }));
        // When plotly notifies of an update (e.g., legend edit), propagate changed trace names
        if (fig && Array.isArray(fig.data)) {
            setTraces(ts => {
                if (!ts || ts.length === 0) return ts;
                const next = ts.map((t, i) => {
                    const name = fig.data[i]?.name;
                    return name !== undefined && name !== t.name ? { ...t, name } : t;
                });
                // Only update state when there's an actual change to avoid loops
                let changed = false;
                if (next.length !== ts.length) changed = true;
                else {
                    for (let i = 0; i < next.length; i++) {
                        if (next[i].name !== ts[i].name) { changed = true; break; }
                    }
                }
                return changed ? next : ts;
            });
        }
    }, []);
    const handlePurge = useCallback((fig, graphDiv) => {
        // Cleanup logic if needed
    }, []);
    const handleError = useCallback((err) => {
        // Error handling logic
        // eslint-disable-next-line no-console
        console.error('Plotly error:', err);
    }, []);

    // Example: Responsive style
    const plotStyle = { width: '100%', height: '400px' };

    // Tab state
    const [activeTab, setActiveTab] = useState('Data');

    // Tab definitions
    const tabs = [
        { key: 'Data', label: 'Data' },
        { key: 'Layout', label: 'Layout' },
        { key: 'Config', label: 'Config' },
        { key: 'Frames', label: 'Frames' },
    ];

    // Handlers for basic controls
    const handleTitleChange = e => {
        setFigure(f => ({
            ...f,
            layout: { ...f.layout, title: e.target.value },
            revision: f.revision + 1
        }));
    };
    const handleLegendToggle = e => {
        setFigure(f => ({
            ...f,
            layout: { ...f.layout, showlegend: e.target.checked },
            revision: f.revision + 1
        }));
    };
    const handleEditableToggle = e => {
        setFigure(f => ({
            ...f,
            config: { ...f.config, editable: e.target.checked },
            revision: f.revision + 1
        }));
    };
    const handleScrollZoomToggle = e => {
        setFigure(f => ({
            ...f,
            config: { ...f.config, scrollZoom: e.target.checked },
            revision: f.revision + 1
        }));
    };
    // Trace row change handlers
    const updateTrace = (idx, patch) => {
        setTraces(ts => ts.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    };
    const onDatasetChange = (idx, newDatasetId) => {
        const cols = datasetColumnsMap[newDatasetId] || [];
        const x = cols[0];
        const y = cols[1] || cols[0];
        updateTrace(idx, { datasetId: newDatasetId, x, y });
        // no need to clear cache globally; ensureColumns will fetch if missing
    };
    const onXChange = (idx, newX) => updateTrace(idx, { x: newX });
    const onYChange = (idx, newY) => updateTrace(idx, { y: newY });
    const onNameChange = (idx, newName) => updateTrace(idx, { name: newName });
    const onColorChange = (idx, newColor) => updateTrace(idx, { color: newColor });
    const removeTrace = (idx) => {
        setTraces(ts => {
            const next = ts.filter((_, i) => i !== idx);
            if (next.length === 0 && datasets.length) {
                // keep at least one trace with defaults
                const d0 = datasets[0];
                const cols = d0?.columns || [];
                const x = cols[0];
                const y = cols[1] || cols[0];
                return [{ datasetId: d0.dataset_id, x, y, name: 'Trace 1', color: '#1f77b4' }];
            }
            return next;
        });
    };
    const addTrace = () => {
        if (!datasets.length) return;
        const d0 = datasets[0];
        const cols = d0.columns || [];
        const x = cols[0];
        const y = cols[1] || cols[0];
        setTraces(ts => ([...ts, { datasetId: d0.dataset_id, x, y, name: `Trace ${ts.length + 1}`, color: defaultColors[(ts.length) % defaultColors.length] }]));
    };

    const defaultColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

    // Tab content renderers
    const renderDataTab = () => (
        <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Dataset</th>
                        <th style={thStyle}>X column</th>
                        <th style={thStyle}>Y column</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Color</th>
                        <th style={thStyle}></th>
                    </tr>
                </thead>
                <tbody>
                    {traces.map((tr, i) => {
                        const dsCols = datasetColumnsMap[tr.datasetId] || [];
                        return (
                            <tr key={`trace-row-${i}`}>
                                <td style={tdStyle}>
                                    <select value={tr.datasetId} onChange={(e) => onDatasetChange(i, e.target.value)}>
                                        {datasets.map(d => (
                                            <option key={d.dataset_id} value={d.dataset_id}>{d.dataset_id}</option>
                                        ))}
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <select value={tr.x} onChange={(e) => onXChange(i, e.target.value)}>
                                        {dsCols.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <select value={tr.y} onChange={(e) => onYChange(i, e.target.value)}>
                                        {dsCols.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <input type="text" value={tr.name} onChange={(e) => onNameChange(i, e.target.value)} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="color" value={tr.color} onChange={(e) => onColorChange(i, e.target.value)} />
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                    <button onClick={() => removeTrace(i)} title="Remove trace">X</button>
                                </td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td colSpan={6} style={{ padding: '8px 4px' }}>
                            <button onClick={addTrace} title="Add trace">+ Add trace</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
    const renderLayoutTab = () => (
        <div>
            <label>
                <strong>Title:</strong>
                <input type="text" value={figure.layout.title} onChange={handleTitleChange} style={{ marginLeft: 8 }} />
            </label>
            <div style={{ marginTop: 12 }}>
                <label>
                    <input type="checkbox" checked={!!figure.layout.showlegend} onChange={handleLegendToggle} /> Show Legend
                </label>
            </div>
        </div>
    );
    const renderConfigTab = () => (
        <div>
            <label>
                <input type="checkbox" checked={!!figure.config.editable} onChange={handleEditableToggle} /> Editable
            </label>
            <div style={{ marginTop: 12 }}>
                <label>
                    <input type="checkbox" checked={!!figure.config.scrollZoom} onChange={handleScrollZoomToggle} /> Scroll Zoom
                </label>
            </div>
        </div>
    );
    const renderFramesTab = () => (
        <div>
            <em>No frame controls yet.</em>
        </div>
    );

    return (
        <EditorProvider figure={figure} setFigure={setFigure}>
            <div className="dataframe-viewer-panel">
                <h2>DataFrame Viewer</h2>
                <div className="dataframe-viewer-plot" style={{ padding: 12 }}>
                    <Plot
                        data={figure.data}
                        layout={figure.layout}
                        // frames={figure.frames}
                        config={figure.config}
                        revision={figure.revision}
                        style={plotStyle}
                        useResizeHandler={true}
                        onInitialized={handleInitialized}
                        onUpdate={handleUpdate}
                        onPurge={handlePurge}
                        onError={handleError}
                    />
                </div>
                <div className="dataframe-viewer-controls" style={{ padding: 12, marginTop: 16, borderTop: '1px solid #eee' }}>
                    <h3>Control Panel</h3>
                    <div className="dfv-tabs" style={{ display: 'flex', borderBottom: '2px solid #e0eaff', marginBottom: 12 }}>
                        {tabs.map(tab => (
                            <div
                                key={tab.key}
                                className={`dfv-tab${activeTab === tab.key ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '8px 24px',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab.key ? '3px solid #1976d2' : '3px solid transparent',
                                    color: activeTab === tab.key ? '#1976d2' : '#444',
                                    fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                                    background: 'none',
                                    transition: 'border-bottom 0.2s',
                                    marginRight: 4,
                                    userSelect: 'none',
                                }}
                            >
                                {tab.label}
                            </div>
                        ))}
                    </div>
                    <div className="dfv-tab-content" style={{ minHeight: 60, color: '#222', padding: '8px 0' }}>
                        {activeTab === 'Data' && renderDataTab()}
                        {activeTab === 'Layout' && renderLayoutTab()}
                        {activeTab === 'Config' && renderConfigTab()}
                        {activeTab === 'Frames' && renderFramesTab()}
                    </div>
                </div>
            </div>
        </EditorProvider>
    );
};

const thStyle = { textAlign: 'left', borderBottom: '1px solid #e5e5e5', padding: '6px 4px' };
const tdStyle = { borderBottom: '1px solid #f3f3f3', padding: '6px 4px' };

export default DataFrameViewer;
