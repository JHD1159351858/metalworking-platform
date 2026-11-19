import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, MagnifyingGlassMinus, MagnifyingGlassPlus, Pause, Play } from '@phosphor-icons/react';
import { geometryDemos } from './GeometryDemos.jsx';
import { machineDemos } from './MachineDemos.jsx';
import './unit-demo.css';

const demos = { ...geometryDemos, ...machineDemos };
const stepDuration = 4400;
const motionDuration = 2600;

export function UnitDemo({ chapterId }) {
  const { title, steps, Graphic } = demos[chapterId];
  const end = steps.length * stepDuration;
  const elapsed = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [still, setStill] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const step = Math.min(steps.length - 1, Math.floor(time / stepDuration));
  const progress = still ? 1 : Math.min(1, (time - step * stepDuration) / motionDuration);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - elapsed.current;
    let frame;
    function advance(now) {
      elapsed.current = Math.min(end, now - start);
      setTime(elapsed.current);
      if (elapsed.current < end) frame = requestAnimationFrame(advance);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, end]);

  function selectStep(index) {
    setPlaying(false);
    elapsed.current = index * stepDuration;
    setTime(elapsed.current);
    setStill(true);
  }
  function playOrPause() {
    if (playing) { setPlaying(false); return; }
    if (elapsed.current >= end) { elapsed.current = 0; setTime(0); }
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setPlaying(true);
  }

  return <figure className="unit-demo" aria-label={title}>
    <div className="unit-demo-heading">
      <h3>{title}</h3>
      <button type="button" className="unit-demo-play" onClick={playOrPause}>
        {playing ? <Pause weight="fill" /> : time >= end ? <ArrowCounterClockwise /> : <Play weight="fill" />}
        {playing ? '暂停' : time >= end ? '重播演示' : time > 0 && !still ? '继续播放' : '播放演示'}
      </button>
    </div>
    <div className={zoomed ? 'unit-demo-surface enlarged' : 'unit-demo-surface'} tabIndex={zoomed ? 0 : undefined}>
      <svg className="unit-demo-drawing" viewBox="0 0 600 252" role="img" aria-label={steps[step].title}>
        <desc>{steps[step].text}</desc>
        <Graphic step={step} progress={progress} />
      </svg>
    </div>
    <figcaption>
      <div className="unit-demo-steps" role="group" aria-label="选择演示步骤">
        {steps.map((item, index) => <button type="button" key={item.title} aria-pressed={step === index} onClick={() => selectStep(index)}>
          <span aria-hidden="true">{index + 1}</span>{item.title}
        </button>)}
      </div>
      <p>{steps[step].text}</p>
      <button type="button" className="unit-demo-zoom" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>
        {zoomed ? <MagnifyingGlassMinus /> : <MagnifyingGlassPlus />}
        {zoomed ? '收起大图' : '放大图示'}
      </button>
      {zoomed && <small className="unit-demo-pan">左右滑动查看全图</small>}
    </figcaption>
  </figure>;
}

export function LathePhoto() {
  return <figure className="lathe-parts">
    <div className="lathe-parts-image">
      <img src="/assets/cnc-lathe-workstation.png" alt="车床结构示意。加工区内左侧为卡盘，右上方为刀架，机身右侧为操作面板。" loading="lazy" />
      <span className="part-chuck" aria-hidden="true">1</span>
      <span className="part-tool" aria-hidden="true">2</span>
      <span className="part-panel" aria-hidden="true">3</span>
    </div>
    <figcaption>
      <h3>在整机上找到这三个部件</h3>
      <ol><li><strong>卡盘</strong>夹持工件，随主轴旋转。</li>
        <li><strong>刀架</strong>支承刀具，随进给机构移动。</li>
        <li><strong>操作面板</strong>显示程序、位置和运行状态。</li></ol>
    </figcaption>
  </figure>;
}
