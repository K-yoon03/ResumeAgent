import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Upload, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { BASE_URL } from '../config';

export function MagicPaste({ isOpen, onClose, onParsed }) {
  const [rawPaste, setRawPaste] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const extractJson = (text) => {
    try {
        // { 로 시작해서 } 로 끝나는 가장 큰 덩어리를 찾습니다.
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("JSON 파싱 에러:", e);
        return null;
    }
    };
  // 🔥 텍스트 또는 이미지 붙여넣기
  const handlePaste = async (e) => {
    // 이미지 체크
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // 🔥 기본 동작 막기
        const file = item.getAsFile();
        try {
          await handleImageUpload(file);
        } catch (err) {
          console.error('이미지 붙여넣기 실패:', err);
        }
        return;
      }
    }
    
    // 텍스트는 textarea에서 자동 처리됨
  };

  // 🔥 이미지 압축
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 최대 1920px로 제한
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.8); // 80% 품질
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // 🔥 이미지 업로드
  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 🔥 이미지 압축
    const compressedFile = await compressImage(file);

    // 미리보기
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(compressedFile);

    setLoading(true);
    const formData = new FormData();
    formData.append('image', compressedFile);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${BASE_URL}/api/v1/agent/parse-job-posting-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`파싱 실패: ${res.status}`);
      }

      const result = await res.text();
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/```json|```/g, '').trim();
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/```/g, '').trim();
      }
      
      const json = JSON.parse(cleanResult);
      onParsed(json);
      toast.success('채용공고를 불러왔습니다!');
      handleClose();
    } catch (err) {
      toast.error('이미지 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 텍스트 파싱
  const parseText = async () => {
    if (!rawPaste.trim()) {
        toast.error('내용을 입력해주세요.');
        return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${BASE_URL}/api/v1/agent/parse-job-posting`, {
        method: 'POST',
        headers: { 
            // 🔥 1. 타입을 JSON으로 변경합니다.
            'Content-Type': 'application/json', 
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        // 🔥 2. 백엔드 DTO(ParseJobPostingRequest) 필드명인 rawText에 맞춰서 보냅니다.
        body: JSON.stringify({ rawText: rawPaste }) 
        });

        if (!res.ok) throw new Error(`파싱 실패: ${res.status}`);

        const result = await res.text();
        const json = extractJson(result); 

        if (json) {
        onParsed(json);
        handleClose();
        } else {
        throw new Error("JSON 형식을 찾을 수 없음");
        }
    } catch (err) {
        toast.error('파싱에 실패했습니다.');
        console.error(err);
    } finally {
        setLoading(false);
    }
    };

  // 🔥 드래그 앤 드롭
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleClose = () => {
    setRawPaste('');
    setPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[var(--gradient-mid)]" />
            매직 페이스트
          </h3>
          <p className="text-sm text-muted-foreground">
            채용 공고를 <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-semibold">Ctrl+V</kbd> 붙여넣거나, 
            이미지를 드래그하세요!<br />
            AI가 알아서 필요한 정보만 추출합니다. 🎯
          </p>
        </div>

        {/* 이미지 미리보기 */}
        {preview && (
          <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/20">
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
          </div>
        )}

        {/* 텍스트 입력 또는 드래그 영역 */}
        {!preview && (
          <textarea
            value={rawPaste}
            onChange={(e) => setRawPaste(e.target.value)}
            onPaste={handlePaste}
            placeholder="채용 공고를 여기에 붙여넣으세요... 또는 이미지를 드래그하세요 📸"
            className="w-full min-h-[300px] px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 resize-none font-mono"
          />
        )}

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            AI가 추출하지 못한 정보는 직접 추가해주세요!
          </p>
        </div>

        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            이미지 업로드
          </Button>

          <Button
            onClick={parseText}
            disabled={!rawPaste.trim() || loading}
            className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI가 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                자동 입력하기
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}