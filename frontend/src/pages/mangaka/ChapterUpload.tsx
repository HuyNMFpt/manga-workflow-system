import { useState } from 'react';
import { convertImageFilesIfNeeded } from '@/lib/imageConvert';
import { 
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  BookOpen
} from 'lucide-react';

type UploadedPage = {
  id: string;
  file: File;
  preview: string;
  order: number;
};

const ChapterUpload = () => {
  const [selectedSeries, setSelectedSeries] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const mySeries = [
    { id: 1, title: 'Moonlight Chronicles', currentChapter: 18 },
    { id: 2, title: 'Shadow Warrior', currentChapter: 12 },
    { id: 3, title: 'Starlight Academy', currentChapter: 8 }
  ];

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const accepted = Array.from(files).filter(
      f => f.type.startsWith('image/') || /\.(webp|avif|heic|heif|jfif)$/i.test(f.name)
    );
    if (accepted.length === 0) return;

    let converted: File[];
    try {
      converted = await convertImageFilesIfNeeded(accepted);
    } catch (err: any) {
      alert(err.message ?? 'Lỗi xử lý ảnh');
      return;
    }

    const newPages: UploadedPage[] = converted.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      order: pages.length + index
    }));

    setPages([...pages, ...newPages]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const movePageUp = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
    setPages(newPages);
  };

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    setPages(newPages);
  };

  const handleSubmit = () => {
    // Handle upload logic
    console.log('Uploading chapter:', {
      series: selectedSeries,
      chapter: chapterNumber,
      title: chapterTitle,
      pages: pages.length
    });
    alert(`Chapter ${chapterNumber} uploaded successfully! (${pages.length} pages)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Upload Chapter</h1>
        <p className="text-gray-400">Tải lên chapter mới cho series của bạn</p>
      </div>

      {/* Form */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Series Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Series <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Chọn series</option>
              {mySeries.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} (Ch.{s.currentChapter})
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chapter <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              placeholder="19"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Chapter Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên Chapter
            </label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="VD: The Final Battle"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white/5 backdrop-blur-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-white/10 hover:border-purple-500/50'
        }`}
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
          <Upload className="w-10 h-10 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Kéo thả hoặc chọn file
        </h3>
        <p className="text-gray-400 mb-6">
          Hỗ trợ: PNG, JPG, JPEG (Nhiều file cùng lúc)
        </p>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer shadow-lg font-medium"
        >
          Chọn File
        </label>
      </div>

      {/* Pages Grid */}
      {pages.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white font-['Syne']">
              Trang đã tải lên ({pages.length})
            </h3>
            <button
              onClick={() => setPages([])}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Xóa tất cả
            </button>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className="relative group"
              >
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/10 border border-white/10">
                  <img
                    src={page.preview}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Page Number */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-black/80 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>

                {/* Actions */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => movePageUp(index)}
                    disabled={index === 0}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => removePage(page.id)}
                    className="w-8 h-8 bg-red-500/80 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => movePageDown(index)}
                    disabled={index === pages.length - 1}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {pages.length > 0 && selectedSeries && chapterNumber && (
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              setSelectedSeries('');
              setChapterNumber('');
              setChapterTitle('');
              setPages([]);
            }}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
          >
            <Check className="w-5 h-5" />
            Upload Chapter
          </button>
        </div>
      )}

      {/* Empty State */}
      {pages.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Chưa có trang nào được tải lên</p>
        </div>
      )}
    </div>
  );
};

export default ChapterUpload;
