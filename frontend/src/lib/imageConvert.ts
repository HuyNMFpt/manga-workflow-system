/**
 * imageConvert — chuyển đổi định dạng ảnh tự động khi upload.
 *
 * Backend (Java ImageIO mặc định) KHÔNG đọc được webp/avif/heic/heif.
 * Utility này tự phát hiện định dạng thật (qua magic bytes, không tin đuôi file)
 * và convert sang PNG bằng Canvas API. Nếu là jpg/png/gif thì giữ nguyên.
 *
 * Đồng thời NÉN ảnh xuống ~1500px width max + JPEG 85% quality nếu file >1.5MB
 * để tránh vượt giới hạn upload (ngrok 5MB/request, backend 50MB/request).
 *
 * Dùng ở mọi chỗ upload ảnh (page batch, task result, cover, avatar...)
 * để đảm bảo backend luôn nhận được ảnh đọc được, kích thước hợp lý.
 */

// Định dạng backend chấp nhận trực tiếp
const NATIVE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

// Ngưỡng nén: file lớn hơn 1.5MB sẽ bị resize + re-encode
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;
const MAX_WIDTH = 1600;      // 1600px width cho manga là đủ rõ nét
const JPEG_QUALITY = 0.85;   // 85% chất lượng — mắt thường khó phân biệt

// Đọc magic bytes để phát hiện định dạng thật (đuôi file có thể sai)
async function detectMimeType(file: File): Promise<string> {
  const buf = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // WEBP: "RIFF....WEBP"
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  // PNG: 89 50 4E 47
  if (hex.startsWith('89504e47')) return 'image/png';
  // JPEG: FF D8 FF
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  // GIF: "GIF87a" | "GIF89a"
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return 'image/gif';
  // AVIF: có "ftypavif" trong 20 byte đầu
  if (hex.includes('66747970617669')) return 'image/avif';
  // HEIC/HEIF: có "ftypheic" | "ftypheif" | "ftypmif1"
  if (hex.includes('6674797068656963') || hex.includes('6674797068656966') ||
      hex.includes('667479706d696631')) return 'image/heic';

  // Fallback: dùng file.type nếu không nhận diện được
  return file.type || 'application/octet-stream';
}

/**
 * Convert 1 file webp/avif/heic → PNG bằng Canvas.
 * Nếu file đã là định dạng chuẩn (jpg/png/gif) → trả lại nguyên bản.
 * HEIC/AVIF thường Canvas cũng không decode được → trả lỗi để UI báo.
 */
export async function convertImageIfNeeded(file: File): Promise<File> {
  const realType = await detectMimeType(file);

  // Đã là định dạng backend chấp nhận + file nhỏ → giữ nguyên
  if (NATIVE_FORMATS.includes(realType) && file.size <= COMPRESS_THRESHOLD) return file;

  // Nếu không nhận diện được là ảnh nào (magic bytes không khớp) → reject sớm
  if (!realType.startsWith('image/')) {
    throw new Error(
      `File "${file.name}" không phải ảnh hợp lệ (phát hiện: ${realType}). ` +
      `Có thể file bị hỏng hoặc bạn đã kéo thẳng từ tab trình duyệt thay vì tải xuống rồi upload. ` +
      `Hãy tải ảnh về máy trước (chuột phải → "Lưu ảnh dưới dạng...") rồi thử lại.`
    );
  }

  // Load ảnh vào Canvas → convert format + nén nếu cần
  return new Promise<File>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Tính kích thước sau resize (giữ tỷ lệ, không phóng to)
      const scale = img.naturalWidth > MAX_WIDTH ? MAX_WIDTH / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('Canvas không khả dụng')); }
      // Chất lượng cao khi resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);

      // Ảnh lớn / webp / avif → xuất JPEG 85% (nhỏ hơn PNG nhiều với ảnh scan)
      // Trừ khi ảnh gốc có alpha channel (PNG trong suốt) → giữ PNG
      const outputType = realType === 'image/png' && file.size <= COMPRESS_THRESHOLD * 2
        ? 'image/png' : 'image/jpeg';
      const quality   = outputType === 'image/jpeg' ? JPEG_QUALITY : undefined;

      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob) return reject(new Error('Chuyển đổi ảnh thất bại'));
        // Đổi đuôi file cho khớp output type
        const ext = outputType === 'image/jpeg' ? 'jpg' : 'png';
        const newName = file.name.replace(/\.(webp|avif|heic|heif|jfif|png|jpg|jpeg|gif)$/i, '') + '.' + ext;
        resolve(new File([blob], newName, { type: outputType, lastModified: Date.now() }));
      }, outputType, quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(
        realType === 'image/heic' || realType === 'image/avif'
          ? `Trình duyệt không đọc được ${realType.split('/')[1].toUpperCase()}. Vui lòng đổi sang JPG/PNG trước khi upload.`
          : 'Không đọc được file ảnh'
      ));
    };
    img.src = url;
  });
}

/**
 * Convert batch — giữ đúng thứ tự, các file đã đúng định dạng thì đi qua nhanh.
 * Nếu 1 file lỗi convert, throw để caller báo user (không silent skip).
 */
export async function convertImageFilesIfNeeded(files: File[] | FileList): Promise<File[]> {
  const arr = Array.from(files);
  return Promise.all(arr.map(f => convertImageIfNeeded(f)));
}
