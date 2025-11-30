import React, { useState, useEffect } from 'react';

function ConfigPanel() {
    const [cookies, setCookies] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load existing cookies if available
        if (window.electron) {
            window.electron.loadCookies((data) => {
                if (data) {
                    setCookies(JSON.stringify(data, null, 2));
                } else {
                    // Show empty array as template
                    setCookies('[]');
                }
                setLoading(false);
            });
        } else {
            setCookies('[]');
            setLoading(false);
        }
    }, []);

    const handleSave = () => {
        setSaving(true);
        if (window.electron) {
            try {
                const parsed = JSON.parse(cookies);
                if (!Array.isArray(parsed)) {
                    alert('Cookies must be an array. Please check the format.');
                    setSaving(false);
                    return;
                }
                window.electron.saveCookies(parsed);
                setTimeout(() => {
                    setSaving(false);
                    alert('✅ Cookies saved successfully!');
                }, 500);
            } catch (e) {
                alert('❌ Invalid JSON format. Please check your cookies.');
                setSaving(false);
                return;
            }
        } else {
            setTimeout(() => setSaving(false), 1000);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-gray-500">Loading cookies...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Apollo.io Cookies</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cookies (JSON Array)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Paste your Apollo.io cookies here. You can export cookies from your browser using a cookie extension.
                    </p>
                    <textarea
                        value={cookies}
                        onChange={(e) => setCookies(e.target.value)}
                        className="w-full h-96 p-4 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        spellCheck="false"
                        placeholder='[{"name": "cookie_name", "value": "cookie_value", "domain": ".apollo.io", ...}]'
                    />
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        💡 Tip: After logging in manually, the app will automatically save your cookies.
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-2"
                    >
                        <span>{saving ? 'Saving...' : 'Save Cookies'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfigPanel;
