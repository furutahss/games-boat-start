import { useCallback, useEffect, useRef, useState } from 'react';
import { advance, classify, COLORS, COUNTDOWN, createGame, distance, rivalPosition } from './game';

type Phase = 'ready' | 'playing' | 'paused' | 'result';
const BEST_KEY = 'zero-start-best';
function readBest() {
  try { const value = localStorage.getItem(BEST_KEY); const best = Number(value); return value !== null && Number.isFinite(best) && best >= 0 && best < 1 ? best : null; }
  catch { return null; }
}
function formatST(st: number) {
  // shortcut: 早着を0.00と誤表示しないよう切り上げる。公式表示の再現が必要になったら表示規約を追加する。
  return st < 0 ? `F ${Math.max(.01, Math.ceil(-st * 100) / 100).toFixed(2)}` : st >= 1 ? 'L 1.00' : (Math.floor(st * 100) / 100).toFixed(2);
}
function Boat({ course, you }: { course: number; you: boolean }) {
  return <g>
    <path d="M-52-8 Q-92-16-140-8M-52 8Q-95 19-150 8M-60 0H-130" fill="none" stroke="#e4fffb" strokeWidth={you ? 3 : 2} opacity=".45" />
    <ellipse cx="-26" cy="5" rx="33" ry="13" fill="#062c3c" opacity=".35" />
    <path d="M-57-13Q-28-19 0 0Q-28 19-57 13Z" fill={COLORS[course - 1]} stroke={you ? '#d6ffae' : '#e2f1e9'} strokeWidth={you ? 2.5 : 1} />
    <path d="M-53-9H-30L-10 0-30 9H-53Z" fill="#f4f1e4" opacity=".85" />
    <rect x="-60" y="-7" width="12" height="14" rx="3" fill="#203a44" />
    <ellipse cx="-37" cy="0" rx="10" ry="8" fill={COLORS[course - 1]} stroke="#102c37" strokeWidth="2" />
    <circle cx="-30" cy="0" r="6" fill="#fff9e9" />
    <text x="-16" y="4" fill="#102c37" fontSize="11" fontWeight="900" textAnchor="middle">{course}</text>
    {you && <g><path d="M-34-37l6 8 6-8" fill="#d6ffae" /><text x="-28" y="-45" textAnchor="middle" fill="#e1ffc2" fontSize="12" fontWeight="800" letterSpacing="2">YOU</text></g>}
  </g>;
}
function Clock({ elapsed }: { elapsed: number }) {
  return <svg viewBox="0 0 200 200" className="clock" role="img" aria-label={`大時計、スタートまで${Math.max(0, COUNTDOWN - elapsed).toFixed(1)}秒`}>
    <circle cx="100" cy="100" r="93" fill="#102c37" stroke="#72918f" strokeWidth="1" />
    <path d="M100 15 A85 85 0 0 1 142.5 26.4" fill="none" stroke="#c0efb8" strokeWidth="12" />
    {Array.from({ length: 60 }, (_, i) => <line key={i} x1="100" y1="16" x2="100" y2={i % 5 === 0 ? 28 : 21} transform={`rotate(${i * 6} 100 100)`} stroke={i % 5 === 0 ? '#e5eee2' : '#5a7679'} strokeWidth={i % 5 === 0 ? 2 : 1} />)}
    <g fill="#edf3e9" textAnchor="middle" fontSize="13" fontWeight="700"><text x="100" y="46">0</text><text x="158" y="105">3</text><text x="100" y="165">6</text><text x="43" y="105">9</text></g>
    <text x="100" y="132" fill="#89a8a7" textAnchor="middle" fontSize="8" letterSpacing="2">12 SECOND DIAL</text>
    <g transform={`rotate(${elapsed / 12 * 360} 100 100)`}><path d="M98 115 97 40 100 26 103 40 102 115Z" fill="#f7cb58" /><circle cx="100" cy="100" r="6" fill="#f7cb58" /></g>
  </svg>;
}

export default function App() {
  const [game, setGame] = useState(createGame);
  const current = useRef(game);
  const [phase, setPhase] = useState<Phase>('ready');
  const [held, setHeld] = useState(false);
  const [best, setBest] = useState(readBest);
  const [round, setRound] = useState(1);
  const [help, setHelp] = useState(false);
  const input = useRef({ key: false, pointer: false });
  const tick = useRef<((now: number) => void) | null>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const clearInput = useCallback(() => { input.current = { key: false, pointer: false }; setHeld(false); }, []);
  const throttle = useCallback((kind: 'key' | 'pointer', value: boolean) => {
    tick.current?.(performance.now());
    input.current[kind] = value;
    setHeld(input.current.key || input.current.pointer);
  }, []);
  const start = () => {
    clearInput();
    if (phase === 'result') { const next = createGame(); current.current = next; setGame(next); setRound(r => r + 1); }
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    let frame = 0;
    let previous = performance.now();
    const update = (now: number) => {
      const dt = Math.max(0, (now - previous) / 1000);
      previous = now;
      const next = advance(current.current, dt, input.current.key || input.current.pointer);
      current.current = next;
      setGame(next);
      if (next.st !== null) { tick.current = null; clearInput(); setPhase('result'); }
    };
    tick.current = update;
    const loop = (now: number) => { update(now); if (current.current.st === null) frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    const pause = () => { update(performance.now()); clearInput(); if (current.current.st === null) setPhase('paused'); };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => { tick.current = null; cancelAnimationFrame(frame); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); };
  }, [phase, clearInput]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.code === 'Space' || e.code === 'ArrowUp') && phase === 'playing') { e.preventDefault(); if (!e.repeat) throttle('key', true); }
      if (e.code === 'Escape' && phase === 'playing') { tick.current?.(performance.now()); clearInput(); if (current.current.st === null) setPhase('paused'); }
    };
    const up = (e: KeyboardEvent) => { if ((e.code === 'Space' || e.code === 'ArrowUp') && (phase === 'playing' || input.current.key)) { e.preventDefault(); throttle('key', false); } };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase, throttle, clearInput]);

  useEffect(() => { if (phase === 'paused') primary.current?.focus({ preventScroll: true }); }, [phase]);

  useEffect(() => {
    if (phase !== 'result' || game.st === null) return;
    if (classify(game.st) === 'OK' && (best === null || game.st < best)) {
      setBest(game.st);
      try { localStorage.setItem(BEST_KEY, String(game.st)); } catch { /* 保存できなくてもプレイは継続する。 */ }
    }
    primary.current?.focus({ preventScroll: true });
  }, [phase, game.st, best]);

  const outcome = game.st === null ? null : classify(game.st);
  const remaining = COUNTDOWN - game.elapsed;
  const active = phase === 'playing';
  const status = phase === 'ready' ? 'STANDBY' : phase === 'paused' ? 'PAUSED' : phase === 'result' ? 'FINISHED' : remaining > 0 ? 'APPROACHING' : 'START OPEN';
  const resultTitle = outcome === 'F' ? '攻めすぎた。' : outcome === 'L' ? '一瞬、遅かった。' : game.st! < .01 ? 'ゼロを、捉えた。' : game.st! < .1 ? '会心のスタート。' : 'その先に、ゼロ。';

  return <div className="shell">
    <header><a className="brand" href="./"><span className="brand-mark">≋</span> ZERO START<span className="brand-sub">BOAT RACE CHALLENGE</span></a><button className="help-button" aria-expanded={help} aria-controls="help" onClick={() => setHelp(!help)}>遊び方 <span>↗</span></button></header>
    <main>
      <section className="hero"><div><p className="eyebrow"><span /> THE ART OF TIMING</p><h1>0.00秒を、<em>攻めろ。</em></h1><p className="intro">早すぎても、遅すぎても。<br className="mobile-break" />アクセルひとつで決まる、究極のスタート。</p></div><div className="hero-number" aria-hidden="true">0<span>.00</span><small>SECONDS TO PERFECTION</small></div></section>
      {help && <section className="help-panel" id="help"><strong>時計を見る。距離を読む。アクセルを握る。</strong><p>「助走をはじめる」で12秒のカウントダウンが始まります。アクセル長押し、または Space / ↑ 長押しで加速。離すと減速しますが、すぐには止まりません。大時計の針が上を向く0秒に、艇の先端をラインへ合わせましょう。</p><p>0秒未満はフライング（F）、1秒以上は出遅れ（L）。コースは毎回ランダムです。Esc・タブ移動で一時停止します。</p></section>}
      <div className="game-layout"><section className="machine" aria-label="ボートレース スタートゲーム">
        <div className="machine-bar"><span><i className={active ? 'live active' : 'live'} /> {status}</span><span>START TRAINING <b>／</b> {String(round).padStart(2, '0')} R</span></div>
        <div className="mobile-timer"><Clock elapsed={game.elapsed} /><div><span>{remaining > 0 ? 'START IN' : 'AFTER ZERO'}</span><strong>{Math.abs(remaining).toFixed(2)}<small>sec</small></strong></div><p>針が真上を向く瞬間に。<br /><b>{game.course}コース ／ YOU</b></p></div>
        <div className="water-wrap"><svg className="water" viewBox="0 0 1000 540" role="img" aria-label={`6艇の助走水面。あなたは${game.course}コース、スタートまで残り${Math.max(0, -game.position).toFixed(0)}メートル。`}>
          <defs><linearGradient id="water" x2="1" y2="1"><stop stopColor="#245568" /><stop offset="1" stopColor="#143e50" /></linearGradient><pattern id="ripples" width="90" height="50" patternUnits="userSpaceOnUse" patternTransform={`translate(${-game.elapsed * 13} 0)`}><path d="M5 18h22m30 12h18M35 43h13" stroke="#7bb5bc" strokeWidth="1" opacity=".16" /></pattern><pattern id="bank" width="28" height="16" patternUnits="userSpaceOnUse"><rect width="14" height="16" fill="#c8d4bd" /><rect x="14" width="14" height="16" fill="#4c6667" /></pattern></defs>
          <rect width="1000" height="540" fill="url(#water)" /><rect width="1000" height="540" fill="url(#ripples)" />
          <path d="M0 32H1000M0 508H1000" stroke="#83b2b6" opacity=".2" />
          <g fontSize="11" letterSpacing="2" fill="#a3c3c7"><text x="30" y="65">OUT</text><text x="30" y="482">IN</text><text x="30" y="26">ZERO START / TRAINING WATER</text></g>
          {[100, 50].map(m => <g key={m} opacity=".55"><path d={`M${760 - m * 3.3} 80V460`} stroke="#8fb7b9" strokeDasharray="3 12" /><text x={760 - m * 3.3} y="487" fill="#b3d1cf" fontSize="12" textAnchor="middle">{m}m</text></g>)}
          <rect x="760" y="80" width="72" height="381" fill="#b9edb9" opacity=".04" /><path d="M760 78V462" stroke="#d9f3b5" strokeWidth="2" strokeDasharray="8 6" />
          <g fill="#d9f3b5" textAnchor="middle"><text x="760" y="65" fontSize="12" fontWeight="800" letterSpacing="3">START LINE</text><text x="760" y="487" fontSize="12">0m</text></g>
          <path d="M750 80h20l-10 13ZM750 460h20l-10-13Z" fill="#e4f4be" />
          {[6, 5, 4, 3, 2, 1].map(course => {
            const position = course === game.course ? game.position : rivalPosition(course, game.elapsed, game.rivals[course - 1]);
            const y = 425 - (course - 1) * 61;
            return <g key={course}><circle cx="967" cy={y} r="14" fill={COLORS[course - 1]} stroke="#b9cbd0" strokeWidth="1" /><text x="967" y={y + 4} fill={course === 2 ? '#fff' : '#102c37'} fontSize="12" textAnchor="middle" fontWeight="800">{course}</text><g transform={`translate(${Math.min(1070, 760 + position * 3.3)} ${y})`}><Boat course={course} you={course === game.course} /></g></g>;
          })}
          <rect y="518" width="1000" height="12" fill="url(#bank)" /><rect y="530" width="1000" height="10" fill="#122f37" />
        </svg>
        {phase === 'ready' && <div className="intro-label"><span className="mini-label">YOUR NEXT CHALLENGE</span><h2><span style={{ background: COLORS[game.course - 1], color: game.course === 2 ? '#fff' : '#102c37' }}>{game.course}</span> コースから、ゼロへ。</h2><p>大時計の0秒と、スタートラインを重ねよう。</p></div>}
        {phase === 'paused' && <div className="overlay"><div className="result-card"><span className="mini-label">TAKE A BREATH</span><h2>ひと息、入れよう。</h2><p>助走は一時停止しています。</p><button ref={primary} className="primary" onClick={() => setPhase('playing')}>助走を再開する <span>→</span></button></div></div>}
        {phase === 'result' && <div className="overlay"><div className={`result-card ${outcome !== 'OK' ? 'failed' : ''}`} role="status"><span className="mini-label">{outcome === 'F' ? 'FLYING / フライング' : outcome === 'L' ? 'LATE / 出遅れ' : 'START TIMING / スタート成功'}</span><div className="result-number">{formatST(game.st!)}<small>sec</small></div><h2>{resultTitle}</h2><p>{outcome === 'F' ? '0秒より前にラインを通過。次は少し、ためて。' : outcome === 'L' ? '1秒以内に届かず。次はもう少し早く加速。' : '0秒との差を、もっと小さく。もう一度、挑もう。'}</p><button ref={primary} className="primary" onClick={start}>次のコースに挑む <span>→</span></button><small className="result-note">コースはもう一度、ランダムに決まります。</small></div></div>}
        </div>
        <div className="telemetry"><div><span>SPEED</span><strong>{Math.round(game.speed * 3.6).toString().padStart(2, '0')}<small>km/h</small></strong></div><div><span>TO START LINE</span><strong>{Math.max(0, -game.position).toFixed(0)}<small>m</small></strong></div><div className="throttle-meter"><span>THROTTLE <b>{held && active ? 'ON' : 'OFF'}</b></span><div>{Array.from({length: 12}, (_, i) => <i key={i} className={held && active ? 'lit' : ''} />)}</div></div></div>
        <div className="controls">{phase === 'ready' || phase === 'result' ? <button className="accelerator start-button" disabled={phase === 'result'} onClick={start}>助走をはじめる <span>→</span></button> : <button className={`accelerator ${held && active ? 'pressed' : ''}`} disabled={!active} aria-label="アクセル。押している間加速、離すと減速" onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); throttle('pointer', true); }} onPointerUp={() => throttle('pointer', false)} onPointerCancel={() => throttle('pointer', false)} onLostPointerCapture={() => throttle('pointer', false)} onContextMenu={e => e.preventDefault()}><span className="accelerator-icon">»</span>{held && active ? '加速中' : 'アクセル'}<small>HOLD TO ACCELERATE</small></button>}<div className="control-hint"><strong>押して加速、離して減速。</strong><span><kbd>SPACE</kbd> / <kbd>↑</kbd> または長押し</span></div>{active && <button className="pause" aria-label="一時停止" onClick={() => { tick.current?.(performance.now()); clearInput(); if (current.current.st === null) setPhase('paused'); }}>Ⅱ</button>}</div>
      </section>
      <aside><section className="timing-panel"><div className="panel-heading"><span>大時計</span><span>OFFICIAL TIMER</span></div><Clock elapsed={game.elapsed} /><div className={`digital ${remaining <= 0 ? 'zero' : ''}`}><span>{remaining > 0 ? 'START IN' : 'AFTER ZERO'}</span><strong>{Math.abs(remaining).toFixed(2)}<small>sec</small></strong></div><p>針が真上を指す、その瞬間に。</p></section><section className="course-panel"><div><span className="mini-label">YOUR COURSE</span><h3><b style={{background: COLORS[game.course - 1], color: game.course === 2 ? '#fff' : '#102c37'}}>{game.course}</b>{game.course}コース<small>{game.course <= 3 ? 'スロー' : 'ダッシュ'}</small></h3></div><p>助走距離 <strong>{distance(game.course)}m</strong><span>毎レース抽選</span></p></section><section className="best-panel"><span>PERSONAL BEST</span><strong>{best === null ? '—.——' : formatST(best)}<small>sec</small></strong><p>フライングなしで、どこまでゼロへ。</p></section></aside></div>
      <section className="rules" aria-label="スタートのルール"><div><span className="rule-index">01 / CONTROL</span><h3>握るか、離すか。</h3><p>長押しで加速。離せば減速。<br />惰性を読んで、助走をつくる。</p></div><div><span className="rule-index">02 / TIMING</span><h3>狙うは、0.00秒。</h3><p>0秒より前はフライング。<br />1秒以上遅れると出遅れ。</p></div><div><span className="rule-index">03 / CHALLENGE</span><h3>コースが変わる。感覚が変わる。</h3><p>1〜6コースをランダムに抽選。<br />距離を見極め、自己ベストへ。</p></div></section>
    </main><footer><span>ZERO START <b>／</b> EVERY MILLISECOND MATTERS.</span><span>スタートに特化した非公式ミニゲーム · 艇の挙動はゲーム用に簡略化</span></footer>
  </div>;
}
