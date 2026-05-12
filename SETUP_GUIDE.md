# Hướng dẫn thêm các folder vào GitHub Repository

## Bước 1: Clone repository về máy local (nếu chưa có)

```bash
git clone https://github.com/HuyNMFpt/manga-workflow-system.git
cd manga-workflow-system
```

## Bước 2: Copy các folder đã tạo vào repository

Copy 4 thư mục (frontend, backend, ai-services, docs) vào thư mục repository của bạn.

## Bước 3: Add và commit các thay đổi

```bash
# Add tất cả các file mới
git add .

# Hoặc add từng thư mục cụ thể
git add frontend/
git add backend/
git add ai-services/
git add docs/

# Commit với message
git commit -m "Add project structure: frontend, backend, ai-services, and docs folders"
```

## Bước 4: Push lên GitHub

```bash
git push origin main
```

## Cấu trúc thư mục đã tạo

```
manga-workflow-system/
├── frontend/
│   └── README.md
├── backend/
│   └── README.md
├── ai-services/
│   └── README.md
├── docs/
│   └── README.md
├── .gitignore
├── LICENSE
└── README.md
```

## Lưu ý

- Mỗi thư mục đã có file README.md để giải thích mục đích sử dụng
- Bạn có thể chỉnh sửa các file README.md này để phù hợp với dự án
- Các file .gitkeep giúp giữ cấu trúc thư mục trong Git

## Các bước tiếp theo

1. Thiết lập tech stack cho từng module
2. Tạo cấu trúc thư mục chi tiết hơn trong mỗi folder
3. Thêm file configuration (.env.example, package.json, requirements.txt, etc.)
4. Viết documentation chi tiết
