import './App.css';
import { VideoUploader } from './components/VideoUploader';
import { WristVelocityChart } from './components/WristVelocityChart';
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
            <WristVelocityChart />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
