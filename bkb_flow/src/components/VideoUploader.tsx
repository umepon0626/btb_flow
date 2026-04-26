import { useRef, useCallback, useState } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { useFrameScanner } from '../hooks/useFrameScanner';
import { SkeletonOverlay } from './SkeletonOverlay';
import { PersonSelector } from './PersonSelector';
import { ReferenceImageUploader } from './ReferenceImageUploader';

export function VideoUploader() {
  const setVideoUrl = useAnalysisStore((s) => s.setVideoUrl);
  const setVideoElement = useAnalysisStore((s) => s.setVideoElement);
  const setCurrentFrameIndex = useAnalysisStore((s) => s.setCurrentFrameIndex);
  const setSelectedPersonIndex = useAnalysisStore((s) => s.setSelectedPersonIndex);
  const videoUrl = useAnalysisStore((s) => s.videoUrl);
  const status = useAnalysisStore((s) => s.status);
  const frames = useAnalysisStore((s) => s.frames);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);
  const candidatePoses = useAnalysisStore((s) => s.candidatePoses);
  const selectedPersonIndex = useAnalysisStore((s) => s.selectedPersonIndex);
  const reset = useAnalysisStore((s) => s.reset);
  const videoElement = useAnalysisStore((s) => s.videoElement);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { startScanning, stopScanning, resumeScanning } = useFrameScanner(videoElement);

  // 人物選択待ち中かどうか（解析中 + 一時停止 + 候補あり）
  const isSelectingPerson =
    status === 'analyzing' && candidatePoses.length > 0 && videoElement?.paused === true;

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

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      setVideoElement(el);
    },
    [setVideoElement]
  );

  const handleStartAnalysis = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play();
    startScanning();
  }, [startScanning]);

  const handleStop = useCallback(() => {
    videoRef.current?.pause();
    stopScanning();
  }, [stopScanning]);

  // 人物を選択して解析を再開
  const handleConfirmPerson = useCallback(() => {
    resumeScanning();
  }, [resumeScanning]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !frames.length || !el.duration) return;
    const index = Math.round((el.currentTime / el.duration) * frames.length);
    setCurrentFrameIndex(Math.max(0, Math.min(index, frames.length - 1)));
  }, [frames.length, setCurrentFrameIndex]);

  const seekToFrame = useCallback(
    (index: number) => {
      const el = videoRef.current;
      if (!el || !frames.length) return;
      el.currentTime = (index / frames.length) * el.duration;
      setCurrentFrameIndex(index);
    },
    [frames.length, setCurrentFrameIndex]
  );

  return (
    <div className="video-uploader">
      {!videoUrl ? (
        <div className="upload-section">
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
          <ReferenceImageUploader />
        </div>
      ) : (
        <div className="video-section">
          <div className="video-area">
            <div className="video-with-overlay">
              <video
                ref={handleVideoRef}
                src={videoUrl}
                controls
                className="preview-video"
                onEnded={stopScanning}
                onTimeUpdate={handleTimeUpdate}
              />
              {/* 人物選択オーバーレイ（複数人検出時） */}
              {isSelectingPerson && <PersonSelector />}
              {/* 骨格オーバーレイ（解析中/完了） */}
              {status !== 'idle' && !isSelectingPerson && <SkeletonOverlay />}
            </div>

            <div className="controls">
              {/* 解析開始 */}
              {status === 'idle' && (
                <button className="btn-primary" onClick={handleStartAnalysis}>
                  解析開始
                </button>
              )}

              {/* 人物選択中 */}
              {isSelectingPerson && (
                <>
                  <span className="progress-info">
                    {selectedPersonIndex !== null
                      ? `人物 ${selectedPersonIndex + 1} を選択中 — 確定して解析を再開`
                      : '追跡する人物をクリックして選択してください'}
                  </span>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmPerson}
                    disabled={selectedPersonIndex === null}
                  >
                    この人を追跡して解析続行
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      // 人物0を自動選択して再開
                      setSelectedPersonIndex(0);
                      resumeScanning();
                    }}
                  >
                    自動選択で続行
                  </button>
                </>
              )}

              {/* 解析中（通常） */}
              {status === 'analyzing' && !isSelectingPerson && (
                <>
                  <div className="progress-info">解析中… {frames.length} フレーム処理済み</div>
                  <button className="btn-secondary" onClick={handleStop}>
                    停止
                  </button>
                </>
              )}

              {/* 解析完了：コマ送り */}
              {status === 'done' && (
                <>
                  <div className="progress-info done">解析完了: {frames.length} フレーム</div>
                  <div className="frame-controls">
                    <div className="frame-controls-row">
                      <button
                        className="btn-icon"
                        onClick={() => seekToFrame(Math.max(0, currentFrameIndex - 1))}
                        disabled={currentFrameIndex === 0}
                      >
                        ◀
                      </button>
                      <input
                        type="range"
                        className="frame-slider"
                        min={0}
                        max={frames.length - 1}
                        value={currentFrameIndex}
                        onChange={(e) => seekToFrame(Number(e.target.value))}
                      />
                      <button
                        className="btn-icon"
                        onClick={() =>
                          seekToFrame(Math.min(frames.length - 1, currentFrameIndex + 1))
                        }
                        disabled={currentFrameIndex === frames.length - 1}
                      >
                        ▶
                      </button>
                      <span className="frame-counter">
                        {currentFrameIndex + 1} / {frames.length}
                      </span>
                    </div>
                  </div>
                </>
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
          <div className="reference-side">
            <ReferenceImageUploader />
          </div>
        </div>
      )}
    </div>
  );
}
