import { useCallback } from 'react';
import { useAnalysisStore } from '../store/analysisStore';

export function ReferenceImageUploader() {
  const referenceImageUrl = useAnalysisStore((s) => s.referenceImageUrl);
  const setReferenceImageUrl = useAnalysisStore((s) => s.setReferenceImageUrl);

  const handleFile = useCallback(
    (file: File) => {
      if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
      const url = URL.createObjectURL(file);
      setReferenceImageUrl(url);
    },
    [referenceImageUrl, setReferenceImageUrl]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="reference-uploader">
      <div className="reference-header">
        <span className="reference-label">追跡対象（参照画像）</span>
        <label className="file-label-sm">
          {referenceImageUrl ? '変更' : '画像を選択'}
          <input type="file" accept="image/*" onChange={handleChange} hidden />
        </label>
      </div>
      {referenceImageUrl && (
        <img src={referenceImageUrl} alt="追跡対象" className="reference-preview" />
      )}
      {!referenceImageUrl && (
        <p className="reference-hint">追跡したい人物の写真をアップロードしてください（任意）</p>
      )}
    </div>
  );
}
