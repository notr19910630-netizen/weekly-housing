# weekly-housing

## 客戶瀏覽介面

2026/10/27–2026/11/02起的資料週採「成交總目錄 → 社區／案件商品櫃」介面。更早三週保留原呈現方式。

後續新週沿用目前 index.html 的資料結構與兩個介面資產：

- assets/weekly-directory.js
- assets/weekly-directory.css

新增資料週時，保留兩個資產引用及 release_manifest.directory_since；渲染器依資料期間選用目錄介面，較早週次不回溯改版。每週仍需保留既有成交與核實庫存的完整卡片，目錄由該週資料與卡片建立。

每次更新需同步產生 HTML 內嵌資料、weekly-data.json、介面資產指紋與 release_hash，並確認四週切換及原始物件連結。商品櫃網址以原始平台直連為準。
