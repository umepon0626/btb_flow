import { useRef, useCallback, useState } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { useFrameScanner } from '../hooks/useFrameScanner';

export function VideoUploader() {
  const setVideoUrl = useAnalysisStore((s) => s.setVideoUrl);
  const setVideoElement = useAnalysisStore((s) => s.setVideoElement);
  const videoUrl = useAnalysisStore((s) => s.videoUrl);
  const status = useAnalysisStore((s) => s.status);
  const frames = useAnalysisStore((s) => s.frames);
  const reset = useAnalysisStore((s) => s.reset);
  const videoElement = useAnalysisStore((s) => s.videoElement);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { startScanning, stopScanning } = useFrameScanner(videoElement);

  const handleFile = useCallback(
    (file: File) => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      reset();
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    },
    [videoUrl, reset, setVideoUrl]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      setVideoElement(el);
    },
    [setVideoElement]
  );

  const handleStartAnalysis = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    startScanning();
  }, [startScanning]);

  const handleStop = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    stopScanning();
  }, [stopScanning]);

  return (
    <div className="video-uploader">
      {!videoUrl ? (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <p>動画をドラッグ＆ドロップ、またはクリックして選択</p>
          <label className="file-label">
            ファイルを選択
            <input type="file" accept="video/*" onChange={handleInputChange} hidden />
          </label>
        </div>
      ) : (
        <div className="video-preview">
          <video
            ref={handleVideoRef}
            src={videoUrl}
            controls
            className="preview-video"
            onEnded={stopScanning}
          />
          <div className="controls">
            {status === 'idle' && (
              <button className="btn-primary" onClick={handleStartAnalysis}>
                解析開始
              </button>
            )}
            {status === 'analyzing' && (
              <>
                <div className="progress-info">解析中… {frames.length} フレーム処理済み</div>
                <button className="btn-secondary" onClick={handleStop}>
                  停止
                </button>
              </>
            )}
            {status === 'done' && (
              <div className="progress-info done">解析完了: {frames.length} フレーム</div>
            )}
            <button
              className="btn-secondary"
              onClick={() => {
                if (videoUrl) URL.revokeObjectURL(videoUrl);
                setVideoUrl(null);
                reset();
              }}
            >
              リセット
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
