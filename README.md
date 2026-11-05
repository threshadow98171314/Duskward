# Duskward

以 doublespeak games 的《[Gridland](https://github.com/doublespeakgames/gridland)》為基礎改作的網頁遊戲。白天消除方塊來蒐集資源、蓋房子，晚上則要靠消除方塊對抗怪物。

## 在本機執行

需要 Python 3，只用到標準函式庫：

```bash
python tools/devserver.py
```

接著打開 http://localhost:8140 。開發伺服器會關閉瀏覽器快取，修改檔案後重新整理就能看到結果。

開發版左上角的紅色方塊是原作留下的除錯按鈕，點一下可以切換白天和黑夜。

## 專案結構

| 路徑 | 內容 |
|---|---|
| `www/` | 遊戲原始碼：未壓縮的 RequireJS 模組、CSS、圖片和音效 |
| `www/js/app/` | 遊戲邏輯。`engine` 是主流程，`gameboard` 是三消盤面，`world` 管世界與建築，`gamecontent` 存放資源和建築的資料 |
| `tools/devserver.py` | 本機開發伺服器 |
| `tools/brandgen.py` | 產生標題圖、徽章和 favicon |
| `deploy/` | 原作 1.1.1 版的建置輸出，目前還沒更新 |

原作的建置流程（`build.xml`）需要 Java、Apache Ant 和 Closure Compiler，之後會換成新的流程。

## 與原作的差異

- 改名為 Duskward，並換上新的標題圖、徽章和 favicon
- 圖片和音效改讀 repo 內的檔案，不再依賴原作的 CDN
- 移除 Google Analytics 追蹤碼、分享按鈕、捐款連結和 doublespeak logo

## 授權與致謝

- 原作《Gridland》© doublespeak games，程式、遊戲設計與美術由 Michael Townsend 製作
- 音樂：Vince Nitro（http://rule2.the-back-row.com）
- 本專案沿用原作的 [Mozilla Public License 2.0](LICENSE)，修改過的原有檔案仍採用 MPL-2.0。「Gridland」以及 doublespeak games 的名稱和標誌不在授權範圍內。
