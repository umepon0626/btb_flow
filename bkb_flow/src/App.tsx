import './App.css';
import { VideoUploader } from './components/VideoUploader';
import { MetricsPanel } from './components/MetricsPanel';
import { useAnalysisStore } from './store/analysisStore';

function App() {
  const status = useAnalysisStore((s) => s.status);

  return (
    <div className="app">
      <header className="app-header">
        <h1>BKB Flow — バスケットボール シュートフロー解析</h1>
      </header>
      <main className="app-main">
        <VideoUploader />
        {status !== 'idle' && (
          <div className="chart-panel">
            <MetricsPanel />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
