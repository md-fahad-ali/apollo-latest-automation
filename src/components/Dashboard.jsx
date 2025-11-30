import React, { useState, useEffect } from 'react';
import LogViewer from './LogViewer';

function Dashboard() {
    const [status, setStatus] = useState('idle'); // idle, running, stopping
    const [stats, setStats] = useState({ leads: 0, page: 1 });
    const [logs, setLogs] = useState([]);
    const [config, setConfig] = useState(() => {
        // Load from localStorage if available
        const saved = localStorage.getItem('apollo-config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return {
                    url: 'https://app.apollo.io/#/people',
                    targetLeads: 200
                };
            }
        }
        return {
            url: 'https://app.apollo.io/#/people',
            targetLeads: 200
        };
    });

    // Save config to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('apollo-config', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        // Listen for logs from main process
        if (window.electron) {
            window.electron.onLog((data) => {
                if (data.type === 'log') {
                    setLogs(prev => [...prev, { message: data.message, timestamp: new Date().toLocaleTimeString() }]);
                }
                if (data.type === 'stats') {
                    setStats(data.stats);
                }
                if (data.type === 'status') {
                    setStatus(data.status);
                }
            });
        }
    }, []);

    const handleStart = () => {
        if (!config.url.trim()) {
            alert('Please enter a valid Apollo.io URL');
            return;
        }
        if (config.targetLeads < 1) {
            alert('Please enter a valid number of leads (minimum 1)');
            return;
        }

        setStatus('running');
        setLogs([]);
        if (window.electron) {
            window.electron.startScrape(config);
        } else {
            console.log('Start scrape (Electron not available)', config);
        }
    };

    const handleStop = () => {
        setStatus('stopping');
        if (window.electron) {
            window.electron.stopScrape();
        }
    };

    const handleDownload = () => {
        if (window.electron) {
            window.electron.downloadCsv();
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:-grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Leads</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">{stats.leads}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Page</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">{stats.page}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</div>
                    <div className="mt-2 flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status === 'running' ? 'bg-green-100 text-green-800' :
                                status === 'idle' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Configuration Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Scraping Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Apollo.io People Page URL
                        </label>
                        <input
                            type="text"
                            value={config.url}
                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                            disabled={status === 'running'}
                            placeholder="https://app.apollo.io/#/people?filters=..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Paste your filtered Apollo.io people search URL
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Lead Count
                        </label>
                        <input
                            type="number"
                            value={config.targetLeads}
                            onChange={(e) => setConfig({ ...config, targetLeads: parseInt(e.target.value) || 0 })}
                            disabled={status === 'running'}
                            min="1"
                            placeholder="200"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How many leads do you want to collect?
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex space-x-4">
                {status === 'idle' ? (
                    <button
                        onClick={handleStart}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center space-x-2"
                    >
                        <span>▶</span>
                        <span>Start Automation</span>
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm flex items-center space-x-2"
                        disabled={status === 'stopping'}
                    >
                        <span>⏹</span>
                        <span>{status === 'stopping' ? 'Stopping...' : 'Stop Automation'}</span>
                    </button>
                )}

                <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center space-x-2"
                >
                    <span>⬇</span>
                    <span>Download CSV</span>
                </button>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-[400px] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Live Logs</h3>
                    <span className="text-xs text-gray-500">{logs.length} entries</span>
                </div>
                <LogViewer logs={logs} />
            </div>
        </div>
    );
}

export default Dashboard;
