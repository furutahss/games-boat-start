# ZERO START — 0.00秒を、攻めろ。

アクセルを操作し、0秒ちょうどにスタートラインを通過するボートレースのミニゲーム。

```sh
npm ci
npm run dev
```

http://localhost:5176/boat-start/ を開く。Node.js 22.6以降を使用。

## 操作

- 「助走をはじめる」で12秒の助走を開始。
- アクセルボタン長押し、Space / ↑ 長押しで加速。離すと惰性を残して減速。
- 毎回ランダムな1〜6コース。助走距離は140〜170m。
- 艇の先端が0秒未満でラインを越えるとF（フライング）、0秒以上1秒未満は成功、1秒以上はL（出遅れ）。
- 成功した最短タイムをブラウザ内に保存。判定は表示の小数2桁に丸める前の時刻を使う。
- Esc・タブ移動・ウィンドウのフォーカス喪失で一時停止。

## 確認・ビルド

```sh
npm test
npm run build
npm run preview
```

`dist/` を `/boat-start/` に配置する。公開先を変える場合は `vite.config.ts` の `base` を変更する。

公式のスタート判定を参考にした非公式ゲーム。6艇の配色・大時計・スロー／ダッシュの雰囲気を取り入れ、加速・減速・助走距離はゲーム用に簡略化している。コース争いや旋回、周回レースは扱わない。

参考: [BOAT RACE公式: フライング（F）と出遅れ（L）](https://www.boatrace.jp/owpc/pc/extra/enjoy/guide/level1/l1_01_01_05.html)、[大時計](https://www.boatrace.jp/owsp/sp/extra/enjoy/guide/jiten/05/y_026.html)
