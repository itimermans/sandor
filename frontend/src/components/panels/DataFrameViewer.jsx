import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { EditorProvider } from './plot/editor/EditorContext.jsx';
import { TransportClient } from '../../lib/transport/client.js';
import { parseArrowToColumns } from '../../lib/arrow/utils.js';

// Skeleton for a complex DataFrameViewer component
const DataFrameViewer = ({ index = 1 }) => {
    // Backend-fed dataset metadata and data
    const [datasets, setDatasets] = useState([]);
    const [datasetId, setDatasetId] = useState('');
    const [columns, setColumns] = useState([]);
    const [table, setTable] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { payload } = await TransportClient.listDatasets();
                if (!payload || !Array.isArray(payload) || payload.length === 0) return;
                if (cancelled) return;
                setDatasets(payload);
                const preferred = payload.find(d => d.dataset_id === 'ONE') || payload[0];
                setDatasetId(preferred.dataset_id);
                setColumns(preferred.columns);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to load datasets', err);
            }
        })();
        return () => { cancelled = true };
    }, []);

    // User selections for X/Y columns
    const [xCol, setXCol] = useState('');
    const [yCol, setYCol] = useState('');

    const [figure, setFigure] = useState(() => ({
        data: [
            {
                x: table['Time'] || [],
                y: table['A'] || [],
                type: 'scattergl',
                mode: 'lines',
                name: `A vs Time`,
            }
        ],
        layout: {
            autosize: true,
            title: `Dataset`,
            showlegend: true,
        },
        config: {
            responsive: true,
            displayModeBar: true,
            scrollZoom: true,
            editable: true,
        },
        revision: 0
    }));

    const ensureColumns = useCallback(async (neededCols) => {
        if (!datasetId) return {};
        const missing = neededCols.filter(c => !(c in table));
        if (missing.length === 0) return {};
        const desc = {
            dataset_id: datasetId,
            columns: Array.from(new Set(missing)),
            row_range: [0, 200000],
            format_hint: 'arrow',
        };
        const buf = await TransportClient.fetchSlice(desc);
        const cols = parseArrowToColumns(buf);
        setTable(prev => ({ ...prev, ...cols }));
        return cols;
    }, [datasetId, table]);

    // Load data when dataset/columns change
    useEffect(() => {
        let cancelled = false;
        if (!datasetId || columns.length === 0) return;
        const defaultX = columns[0];
        const defaultY = columns[1] || columns[0];
        // Reset X/Y to dataset-specific defaults to avoid stale selections
        setXCol(defaultX);
        setYCol(defaultY);
        // Clear previously cached table to prevent mixing datasets
        setTable({});
        (async () => {
            try {
                const desc = {
                    dataset_id: datasetId,
                    columns: Array.from(new Set([defaultX, defaultY])),
                    row_range: [0, 200000],
                    format_hint: 'arrow',
                };
                const buf = await TransportClient.fetchSlice(desc);
                const cols = parseArrowToColumns(buf);
                if (cancelled) return;
                setTable(cols);
                setFigure(f => ({
                    ...f,
                    data: f.data.map((t, i) => i === 0 ? {
                        ...t,
                        x: cols[defaultX] || [],
                        y: cols[defaultY] || [],
                        name: `${defaultY} vs ${defaultX}`,
                    } : t),
                    layout: { ...f.layout, title: `${datasetId}: ${defaultY} vs ${defaultX}` },
                    revision: f.revision + 1,
                }));
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch slice', err);
            }
        })();
        return () => { cancelled = true };
    }, [datasetId, columns]);

    // Event handlers for future extensibility
    const handleInitialized = useCallback((fig, graphDiv) => {
        setFigure(f => ({ ...f, ...fig }));
    }, []);
    const handleUpdate = useCallback((fig, graphDiv) => {
        setFigure(f => ({ ...f, ...fig }));
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
    const handleTraceTypeChange = (idx, type) => {
        setFigure(f => {
            const newData = f.data.map((trace, i) => i === idx ? { ...trace, type } : trace);
            return { ...f, data: newData, revision: f.revision + 1 };
        });
    };

    const handleXColChange = async (e) => {
        const name = e.target.value;
        setXCol(name);
        const fetched = await ensureColumns([name, yCol]);
        const cols = { ...table, ...fetched };
        setFigure(f => ({
            ...f,
            data: f.data.map((t, i) => i === 0 ? { ...t, x: cols[name] || [], name: `${yCol} vs ${name}` } : t),
            revision: f.revision + 1,
        }));
    };

    const handleYColChange = async (e) => {
        const name = e.target.value;
        setYCol(name);
        const fetched = await ensureColumns([xCol, name]);
        const cols = { ...table, ...fetched };
        setFigure(f => ({
            ...f,
            data: f.data.map((t, i) => i === 0 ? { ...t, y: cols[name] || [], name: `${name} vs ${xCol}` } : t),
            revision: f.revision + 1,
        }));
    };

    // Tab content renderers
    const renderDataTab = () => (
        <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <label>
                    <strong style={{ marginRight: 8 }}>X column:</strong>
                    <select value={xCol} onChange={handleXColChange}>
                        {columns.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <strong style={{ marginRight: 8 }}>Y column:</strong>
                    <select value={yCol} onChange={handleYColChange}>
                        {columns.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <strong style={{ marginRight: 8 }}>Dataset:</strong>
                    <select value={datasetId} onChange={(e) => {
                        const id = e.target.value;
                        const meta = datasets.find(d => d.dataset_id === id);
                        setDatasetId(id);
                        setColumns(meta ? meta.columns : []);
                        setTable({});
                        setXCol('');
                        setYCol('');
                    }}>
                        {datasets.map(d => (
                            <option key={d.dataset_id} value={d.dataset_id}>{d.dataset_id}</option>
                        ))}
                    </select>
                </label>
            </div>
            <div style={{ marginTop: 12 }}>
                <strong>Trace Type:</strong>
                <select
                    value={figure.data[0]?.type || 'scattergl'}
                    onChange={(e) => handleTraceTypeChange(0, e.target.value)}
                    style={{ marginLeft: 8 }}
                >
                    <option value="scattergl">ScatterGL</option>
                    <option value="scatter">Scatter</option>
                    <option value="bar">Bar</option>
                </select>
            </div>
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

export default DataFrameViewer;
