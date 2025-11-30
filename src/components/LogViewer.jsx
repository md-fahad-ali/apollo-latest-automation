import React, { useEffect, useRef } from 'react';

function LogViewer({ logs }) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="flex-1 overflow-auto bg-gray-900 p-4 font-mono text-sm min-h-[300px]">
            {logs.length === 0 ? (
                <div className="text-gray-500 italic text-center mt-10">
                    Ready to start... Logs will appear here.
                </div>
            ) : (
                <div className="space-y-1">
                    {logs.map((log, index) => (
                        <div key={index} className="flex space-x-2">
                            <span className="text-gray-500 select-none">[{log.timestamp}]</span>
                            <span className="text-gray-300">{log.message}</span>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            )}
        </div>
    );
}

export default LogViewer;
