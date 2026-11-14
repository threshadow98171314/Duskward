# Duskward 暮守

以 doublespeak games 的《[Gridland](https://github.com/doublespeakgames/gridland)》為基礎改作的網頁遊戲。白天消除方塊來蒐集資源、蓋房子，晚上則要靠消除方塊對抗怪物。

> 太陽正被名為「蝕日者」的黑暗一口一口啃食，白晝一天比一天短。你是餘暉谷最後一位守暮人：白天重建村落，夜晚在燈火下守住山谷，直到把太陽奪回來。

介面預設是繁體中文，可以在選單的「語言」切換成英文。完整的世界觀、玩法和美術規劃請見[設計文件](docs/DESIGN.md)，程式架構的改寫計畫請見[架構規劃](docs/ARCHITECTURE.md)。

## 線上試玩

https://threshadow98171314.github.io/Duskward/

每次推送到 `main`，GitHub Actions 會先跑型別檢查、程式檢查、測試和建置，全部通過才部署到 GitHub Pages（見 `.github/workflows/pages.yml`）。線上版不含左上角的除錯按鈕。

## 在本機執行

需要 Node.js 20.19 以上（建議 22）。第一次先安裝套件：

```bash
npm install
```

接著啟動開發伺服器：

```bash
npm run dev
```

然後打開 http://localhost:8140 。修改程式後，畫面會自動更新。

開發版左上角的紅色方塊是原作留下的除錯按鈕，點一下可以切換白天和黑夜。

### 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 建置到 `dist/` |
| `npm run preview` | 在 http://localhost:8141 預覽建置結果 |
| `npm test` | 執行測試 |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run lint` | ESLint 檢查 |
| `npm run check` | 依序執行型別檢查、ESLint 和測試 |

`tests/__snapshots__/simulation.test.ts.snap` 是盤面模擬的統計（連鎖長度、收穫、燈籠與日輪出現的頻率），以及每種怪物的單挑報表（要打多久、主角掉多少血）。改了規則或數值後，這個快照的差異就是改動的影響；確定要這樣改，再用 `npx vitest run -u` 更新。

## 專案結構

| 路徑 | 內容 |
|---|---|
| `index.html` | 遊戲頁面，也是 Vite 的進入點 |
| `src/app/` | 遊戲邏輯（ES 模組）。`engine` 是主流程，`gameboard` 是三消盤面，`world` 管世界與建築，`gamecontent` 存放資源和建築的資料，`story` 負責劇情 |
| `src/app/locale/` | 語系檔（`zh-TW`、`en`），介面文字和劇情文字都在這裡 |
| `src/core/` | 規則核心（TypeScript）：盤面、時間、收穫、成長、戰鬥數值、戰場（主角與怪物的移動和戰鬥）、可指定種子的亂數和模擬，不碰畫面 |
| `src/content/` | 遊戲內容的資料：資源、建築、道具、法術與暮光技、怪物，載入時會檢查 |
| `src/platform/` | 用 TypeScript 新寫的平台層，目前有存檔版本與升級 |
| `src/ui/` | 新的介面元件，目前有錯誤復原畫面 |
| `src/vendor/` | 沿用的第三方程式：jQuery 2.0.3 和 Base64 |
| `public/` | 原樣發布的 CSS、圖片和音效 |
| `tests/` | Vitest 測試 |
| `docs/` | 設計文件和架構規劃 |
| `tools/brandgen.py` | 產生標題圖、徽章和 favicon |
| `tools/art/` | 美術工具：用 `python tools/art/build.py` 組裝精靈圖，`legacy/` 保留原作的圖和原始檔 |
| `.github/workflows/pages.yml` | 檢查並部署到 GitHub Pages 的流程 |

美術工具需要 Python 3，只用到標準函式庫。

## 與原作的差異

- 改名為 Duskward（暮守），並換上新的標題圖、徽章和 favicon
- 全新的「餘暉谷」世界觀：開場故事、燈守瑟菈的晨間日誌和事件劇情
- 繁體中文介面，可切換英文
- 新玩法：黃昏與結界、燈火資源、燈籠和日輪特殊方塊、影縛、連鎖與暮光技
- 怪物重新上色並改名，新增影魅、燈蛾、暮鴉三種怪物；每種怪物第一次出現時，瑟菈會在日誌裡介紹
- 墮落晨龍成為中魔王，打倒後留下晨光之心；最終魔王蝕日者只能用燈火的光擊敗，打倒後播放結局，可以接著玩新遊戲＋
- 黃昏抉擇：每天黃昏從瑟菈提出的三種祝福中挑一種，效果越強代價越重；祭壇三級後每晚只能帶兩個暮光技
- 夜晚導演：每晚依天數和主角強度出現不同的預兆（濃霧、流星雨、鴉群、影潮、無月之夜），在黃昏時先告訴玩家
- 平衡調整：長連鎖會逐漸收斂，動畫越連越快、點盤面可快轉；白天一步收齊四種以上資源會觸發豐收加成
- 新建築：守夜燈塔、黎明祭壇（各 3 級）
- 全新的彩色像素美術：暖色介面、天空與遠山、資源方塊、主角、所有建築與介面圖示
- 建置改用 Vite 和 ES 模組，加入自動測試；存檔加上版本號，匯入代碼會先檢查
- 圖片和音效改讀 repo 內的檔案，不再依賴原作的 CDN
- 移除 Google Analytics 追蹤碼、分享按鈕、捐款連結和 doublespeak logo

## 授權與致謝

- 原作《Gridland》© doublespeak games，程式、遊戲設計與美術由 Michael Townsend 製作
- 音樂：Vince Nitro（http://rule2.the-back-row.com）
- 本專案沿用原作的 [Mozilla Public License 2.0](LICENSE)，修改過的原有檔案仍採用 MPL-2.0。「Gridland」以及 doublespeak games 的名稱和標誌不在授權範圍內。
