import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  ImageIcon, Layers, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import api from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────
export interface PinData {
  pageId:     string;
  pageNumber: number;
  x:          number;   // % từ trái
  y:          number;   // % từ trên
  tag:        string;
  comment:    string;
  color:      string;
}

interface Props {
  seriesId:    string;
  pendingPins: PinData[];               // pins chưa submit (từ parent)
  savedPins:   PinData[];               // pins đã submit (từ backend)
  onAddPin:    (pin: Omit<PinData, 'comment' | 'color'>) => void;  // parent xử lý form
  activeTag:   string;
}

const PIN_COLORS = [
  '#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981',
  '#f97316','#ec4899','#84cc16',
];

const getColor = (index: number) => PIN_COLORS[index % PIN_COLORS.length];

// ─── Hooks ────────────────────────────────────────────────────────
const useChapters = (seriesId: string) =>
  useQuery({
    queryKey: ['chapters', 'series', seriesId],
    queryFn: async () => {
      const r = await api.get(`/chapters/series/${seriesId}`);
      return (r.data.data ?? []) as any[];
    },
    enabled: !!seriesId,
    staleTime: 2 * 60 * 1000,
  });

const usePages = (chapterId: string | null) =>
  useQuery({
    queryKey: ['pages', chapterId],
    queryFn: async () => {
      const r = await api.get('/pages', { params: { chapterId } });
      const raw = r.data.data;
      const pages: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.content ?? []);
      return pages.sort((a: any, b: any) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
    },
    enabled: !!chapterId,
    staleTime: 2 * 60 * 1000,
  });

// ─── Main Component ───────────────────────────────────────────────
export const PageGridAnnotator = ({
  seriesId, pendingPins, savedPins, onAddPin, activeTag
}: Props) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [lightboxPage,      setLightboxPage]      = useState<any | null>(null);
  const [zoom,              setZoom]              = useState(1);

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(seriesId);

  // Auto-select chapter đầu tiên
  const activeChapterId = selectedChapterId ?? (chapters[0]?.id ?? null);
  const { data: pages = [], isLoading: pagesLoading } = usePages(activeChapterId);

  // Pins cho trang đang mở trong lightbox
  const pinsForPage = (pageId: string) => [
    ...savedPins.filter(p => p.pageId === pageId),
    ...pendingPins.filter(p => p.pageId === pageId),
  ];

  const allPins = [...savedPins, ...pendingPins];

  // ── Lightbox click handler ─────────────────────────────────────
  const handleLightboxClick = (e: React.MouseEvent<HTMLDivElement>, page: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width)  * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top)  / rect.height) * 1000) / 10;
    onAddPin({ pageId: page.id, pageNumber: page.pageNumber, x, y, tag: activeTag });
  };

  const navigatePage = (dir: -1 | 1) => {
    if (!lightboxPage || pages.length === 0) return;
    const idx = pages.findIndex((p: any) => p.id === lightboxPage.id);
    const next = pages[idx + dir];
    if (next) { setLightboxPage(next); setZoom(1); }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (chaptersLoading) return (
    <div className="flex items-center justify-center py-10 gap-2 text-zinc-600">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Đang tải chapters...</span>
    </div>
  );

  if (chapters.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-zinc-700">
      <Layers className="w-8 h-8 opacity-20" />
      <p className="text-sm">Series chưa có chapter nào</p>
      <p className="text-[11px] text-zinc-600 text-center max-w-xs leading-relaxed">
        Mangaka cần tạo chapter và upload trang truyện trước khi Editor có thể annotate.
      </p>
    </div>
  );

  return (
    <div className="space-y-3">

      {/* ── Chapter tabs ── */}
      {chapters.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {chapters.map((ch: any) => {
            const pinCount = allPins.filter(p =>
              pages.some((pg: any) => pg.id === p.pageId && pg.chapterId === ch.id)
            ).length;
            return (
              <button key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  activeChapterId === ch.id
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                    : 'bg-white/4 text-zinc-500 border border-white/6 hover:text-zinc-300'
                }`}>
                Ch.{ch.chapterNumber ?? '?'}
                {ch.title && <span className="text-[10px] opacity-70 max-w-[80px] truncate">{ch.title}</span>}
                {pinCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                    {pinCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Page grid ── */}
      {pagesLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-700">
          <ImageIcon className="w-8 h-8 opacity-20" />
          <p className="text-sm">Chapter này chưa có trang nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {pages.map((page: any, idx: number) => {
            const pagePins = pinsForPage(page.id);
            const hasPins  = pagePins.length > 0;
            return (
              <button key={page.id}
                onClick={() => { setLightboxPage(page); setZoom(1); }}
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-lg ${
                  hasPins
                    ? 'border-amber-500/40 hover:border-amber-500/60 hover:shadow-amber-500/20'
                    : 'border-white/8 hover:border-white/20'
                }`}>

                {/* Thumbnail */}
                {page.thumbnailUrl || page.imageUrl ? (
                  <img
                    src={page.thumbnailUrl ?? page.imageUrl}
                    alt={`Trang ${page.pageNumber}`}
                    className="w-full h-full object-cover bg-black/20"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-zinc-700" />
                  </div>
                )}

                {/* Page number label */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1">
                  <p className="text-[10px] text-zinc-300 font-semibold">
                    {page.pageNumber != null ? `Trang ${page.pageNumber}` : `#${idx + 1}`}
                  </p>
                </div>

                {/* Pin badge */}
                {hasPins && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center">
                    <span className="text-[9px] font-black text-black">{pagePins.length}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/8 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-lg px-2.5 py-1.5">
                    <p className="text-[11px] text-white font-semibold">Click để annotate</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Summary ── */}
      {allPins.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-[11px] text-zinc-500">
            <span className="text-amber-300 font-semibold">{allPins.length} pin</span>
            {' '}trên {new Set(allPins.map(p => p.pageId)).size} trang
            {pendingPins.length > 0 && (
              <span className="text-zinc-600"> · {pendingPins.length} chưa gửi</span>
            )}
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════════════════ */}
      {lightboxPage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">

          {/* Close */}
          <button onClick={() => { setLightboxPage(null); setZoom(1); }}
            className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {/* Page nav */}
          <button onClick={() => navigatePage(-1)}
            disabled={pages.findIndex((p: any) => p.id === lightboxPage.id) === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-colors z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => navigatePage(1)}
            disabled={pages.findIndex((p: any) => p.id === lightboxPage.id) === pages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-colors z-10">
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 z-10">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[12px] text-zinc-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(1)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Page info */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
              <p className="text-[12px] font-semibold text-white">
                Trang {lightboxPage.pageNumber}
                <span className="text-zinc-500 font-normal ml-1">
                  ({pages.findIndex((p: any) => p.id === lightboxPage.id) + 1}/{pages.length})
                </span>
              </p>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-xl px-3 py-2">
              <p className="text-[11px] text-amber-300 font-semibold">Click để đặt pin đánh dấu</p>
            </div>
          </div>

          {/* Image canvas */}
          <div
            className="relative cursor-crosshair select-none"
            style={{
              maxWidth:  '85vw',
              maxHeight: '85vh',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease',
            }}
            onClick={e => handleLightboxClick(e, lightboxPage)}>

            {lightboxPage.imageUrl ? (
              <img
                src={lightboxPage.imageUrl}
                alt={`Trang ${lightboxPage.pageNumber}`}
                className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                draggable={false}
                style={{ userSelect: 'none' }}
              />
            ) : (
              <div className="w-[400px] h-[560px] bg-zinc-900 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-zinc-700" />
              </div>
            )}

            {/* Render pins trên ảnh */}
            {pinsForPage(lightboxPage.id).map((pin, i) => {
              const isPending = pendingPins.includes(pin);
              return (
                <div key={i}
                  style={{
                    left:  `${pin.x}%`,
                    top:   `${pin.y}%`,
                    backgroundColor: pin.color,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                  className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-[10px] font-black text-white z-20 ${
                    isPending ? 'animate-pulse ring-2 ring-amber-400/60' : ''
                  }`}>
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Pin list sidebar */}
          {pinsForPage(lightboxPage.id).length > 0 && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2 w-56 max-h-[70vh] overflow-y-auto space-y-2 z-10">
              {pinsForPage(lightboxPage.id).map((pin, i) => (
                <div key={i}
                  className={`p-2.5 rounded-xl border backdrop-blur-sm ${
                    pendingPins.includes(pin)
                      ? 'bg-amber-500/15 border-amber-500/30'
                      : 'bg-black/70 border-white/10'
                  }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-black text-white border border-white/40"
                      style={{ backgroundColor: pin.color }}>
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{pin.tag}</span>
                    {pendingPins.includes(pin) && (
                      <span className="text-[9px] text-amber-400 ml-auto">chưa gửi</span>
                    )}
                  </div>
                  {pin.comment && (
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{pin.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageGridAnnotator;
