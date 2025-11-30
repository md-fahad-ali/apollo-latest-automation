import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ConfigPanel from './components/ConfigPanel';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">Apollo Auto</h1>
          <p className="text-xs text-gray-500 mt-1">Lead Generation Tool</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <span className="text-lg">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>System Ready</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeTab === 'dashboard' ? 'Dashboard' : 'Configuration'}
          </h2>
          <div className="text-sm text-gray-500">
            v1.0.0
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' ? <Dashboard /> : <ConfigPanel />}
        </main>
      </div>
    </div>
  );
}

export default App;
