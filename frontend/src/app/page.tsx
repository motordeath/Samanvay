import React from 'react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 shadow-md">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Samanvay Operations
        </h1>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> WS Connected</span>
          <span>Org: O-12345</span>
        </div>
      </header>
      
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-gray-700 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Active Events</h2>
            <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-lg bg-gray-950">
              Event Projection Component
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-gray-700 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Readiness Metrics</h2>
            <div className="h-48 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-lg bg-gray-950">
              Readiness Chart Component
            </div>
          </div>
        </section>
        
        <aside className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-gray-700 transition-colors">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Live Coordination</h2>
            <div className="space-y-3">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-start space-x-3 text-sm p-3 rounded-lg bg-gray-950 border border-gray-800">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-400">
                    <span className="text-gray-200 font-medium">System</span> updated projection for Event EV-99{i}.
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-gray-700 transition-colors">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">New Event</button>
              <button className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">Allocate</button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
