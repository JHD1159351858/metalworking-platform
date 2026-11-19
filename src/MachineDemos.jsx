const blue = '#2563eb';
const amber = '#b45309';
const steel = '#52677b';
const pale = '#e3edf3';

function LatheMotion({ step, progress }) {
  const travel = step === 2 ? progress : 0;
  const turns = step === 1 ? progress : step === 2 ? 1 : 0;
  const z = Number((12 - 5 * travel).toFixed(1));
  return <g>
    <path d="M36 176H400v12H36z" fill="#c4d3dd" stroke={steel} />
    <rect x="43" y="86" width="77" height="90" rx="6" fill={pale} stroke={steel} strokeWidth="2" />
    <path d="M61 103h42m-42 8h42m-42 8h42" stroke="#b1c3d1" strokeWidth="3" />
    <rect x="109" y="101" width="32" height="64" rx="5" fill="#9bb3c5" stroke={steel} strokeWidth="2" />
    <path d="M141 105h14v22h-14m0 15h14v19h-14" fill={steel} />
    <path d="M151 120h102v4h75v18h-75v5H151z" fill="#c8def0" stroke={steel} strokeWidth="2" />
    <path d="M101 134h255" stroke="#849aab" strokeDasharray="6 4" />
    <text x="55" y="53">主轴</text><path d="M75 59v22" stroke={steel} />
    <text x="119" y="76">卡盘</text><path d="M133 82v16" stroke={steel} />
    <text x="192" y="170">工件</text><path d="M208 151v-7" stroke={steel} />
    {step === 0 && <path d="M73 134h135" stroke={blue} strokeWidth="3" opacity=".8"
      pathLength="1" strokeDasharray={`${progress} 1`} />}
    <g transform={`translate(${-60 * travel} 0)`}>
      <text x="326" y="33">刀架</text>
      <rect x="321" y="44" width="46" height="28" rx="3" fill={steel} />
      <path d="M332 72h21l-12 31h-17z" fill="#8da3b6" stroke={steel} />
      <path d="m324 101 15 1-17 13z" fill="#f4b951" stroke={amber} strokeWidth="2" />
    </g>
    {step === 2 && <g stroke={blue} fill="none" strokeWidth="2">
      <path d="M322 88h-60m0 0 7-5m-7 5 7 5" />
      <path d="M322 93v18" strokeDasharray="3 3" />
    </g>}
    <text x="43" y="222" fill={blue} fontWeight="650">X = 40 mm</text>
    <text x="175" y="222" fill={blue} fontWeight="650">Z = {z} mm</text>
    <path d="M305 216h61l-7-4m7 4-7 4" fill="none" stroke={steel} strokeWidth="2" />
    <text x="373" y="222" fill={steel}>+Z</text>
    <path d="M421 39v174" stroke="#ccdae5" />
    <text x="503" y="58" textAnchor="middle">主轴端视图</text>
    <circle cx="503" cy="132" r="49" fill={pale} stroke={steel} strokeWidth="2" />
    <g transform={`rotate(${turns * 360} 503 132)`}>
      {[0, 120, 240].map(angle => <rect key={angle} x="497" y="88" width="12" height="27" rx="2"
        fill={steel} transform={`rotate(${angle} 503 132)`} />)}
      <circle cx="503" cy="132" r="19" fill="#a7c7de" stroke={steel} />
      <circle cx="503" cy="97" r="4" fill="#ffc563" />
    </g>
    {step === 1 && <path d="M550 103a55 55 0 0 1 6 46l-3-8m3 8 7-6" stroke={blue} fill="none" strokeWidth="2.5" />}
    <text x="503" y="210" textAnchor="middle" fill={steel}>金色点随卡盘转动</text>
  </g>;
}

function FeedGauge({ x, revolution, amount, active }) {
  const color = revolution ? blue : amber;
  const cx = x + 46;
  return <g>
    <rect x={x} y="73" width="252" height="149" rx="10" fill={active ? '#fff' : '#f2f6f9'} stroke={active ? color : '#cad7e1'} strokeWidth="2" />
    <text x={x + 17} y="103" fill={color} fontWeight="700">{revolution ? 'G99　每转进给' : 'G98　每分钟进给'}</text>
    <circle cx={cx} cy="148" r="24" fill={pale} stroke="#97aebe" />
    {revolution ? <g transform={`rotate(${360 * amount} ${cx} 148)`}>
      {[0, 120, 240].map(angle => <path key={angle} d={`M${cx} 127v11`} stroke={steel} strokeWidth="5" transform={`rotate(${angle} ${cx} 148)`} />)}
      <circle cx={cx} cy="129" r="3" fill={blue} />
    </g> : <g stroke={steel}>
      <path d={`M${cx} 127v4m21 17h-4m-17 21v-4m-21-17h4`} />
      <path d={`M${cx} 148v-15`} strokeWidth="2.5" transform={`rotate(${360 * amount} ${cx} 148)`} />
    </g>}
    <text x={x + 83} y="145">{revolution ? '主轴转过一圈' : '时间经过一分钟'}</text>
    <path d={`M${x + 85} 161h135`} stroke="#d6e2ea" strokeWidth="5" />
    <path d={`M${x + 85} 161h${135 * amount}`} stroke={color} strokeWidth="5" />
    <circle cx={x + 85 + 135 * amount} cy="161" r="4" fill={color} />
    <text x={x + 17} y="201" fill={color}>{revolution ? 'F0.2 → 0.2 mm/转' : 'F0.2 → 0.2 mm/分'}</text>
  </g>;
}

function FeedModes({ step, progress }) {
  return <g>
    <text x="34" y="44" fontWeight="650">公制程序记录</text>
    <text x="177" y="44" fill={blue} fontWeight="700">F0.2</text>
    <path d="M236 39h31l-6-4m6 4-6 4" fill="none" stroke={steel} strokeWidth="2" />
    <text x="281" y="44">核对执行时的进给方式</text>
    {step === 0 && <g stroke={blue} strokeWidth="1.5" fill="none">
      {['M300 49v11H160v11', 'M300 49v11h140v11'].map(d =>
        <path key={d} d={d} pathLength="1" strokeDasharray={`${progress} 1`} />)}
    </g>}
    <FeedGauge x={34} revolution amount={step === 1 ? progress : step > 1 ? 1 : 0} active={step === 1} />
    <FeedGauge x={314} amount={step === 2 ? progress : 0} active={step === 2} />
  </g>;
}

function CamComparison({ step, progress }) {
  const preview = step === 1 ? progress : step === 2 ? 1 : 0;
  const difference = step === 2 ? progress : 0;
  const upper = 'M187 57H284V72H320V57H480';
  const lower = 'M187 139H324V154H360V139H480';
  return <g>
    <text x="30" y="73" fill={blue} fontWeight="650">图纸轮廓</text>
    <text x="30" y="155" fill={amber} fontWeight="650">预览轮廓</text>
    <text x="480" y="30" textAnchor="middle">右端面 Z0</text>
    <path d="M480 36v172" stroke={steel} strokeDasharray="5 4" />
    <path d={`${upper}v36H187z`} fill={pale} stroke="#a6b9c8" />
    <path d={upper} stroke={blue} strokeWidth="3" fill="none" pathLength="1"
      strokeDasharray={step === 0 ? `${progress} 1` : undefined} />
    <circle cx="320" cy="57" r="5" fill={blue} />
    <text x="320" y="45" textAnchor="middle" fill={blue}>−16 mm</text>
    <path d={`${lower}v36H187z`} fill="#f0f3f5" stroke="#becbd5" />
    <path d={lower} fill="none" stroke={amber} strokeWidth="3" pathLength="1" strokeDasharray={`${preview} 1`} />
    {step > 0 && <g opacity={preview}>
      <circle cx="360" cy="139" r="5" fill={amber} />
      <text x="360" y="125" textAnchor="middle" fill={amber}>−12 mm</text>
    </g>}
    {step === 2 && <g>
      <path d="M320 76v123m40-52v52" stroke={steel} strokeDasharray="4 4" />
      <path d={`M320 202h${40 * difference}`} stroke={amber} strokeWidth="3" />
      <path d="M320 196v12m40-12v12" stroke={amber} strokeWidth="2" />
      <text x="340" y="231" textAnchor="middle" fill={amber} fontWeight="700">相差 4 mm</text>
    </g>}
  </g>;
}

export const machineDemos = {
  '8.2': {
    title: '车床上的两种运动',
    steps: [
      { title: '辨认部件', text: '侧视图里，主轴连接卡盘，卡盘夹持工件。金色刀尖由刀架支承。右侧小图沿主轴轴线观察卡盘。' },
      { title: '观察旋转', text: '看卡盘上的金色标记。它绕主轴中心转一圈，工件随之旋转，此时刀架位置保持不变。' },
      { title: '观察进给', text: '沿图中 +Z 的反方向观察刀尖。Z 由 12 mm 减至 7 mm，净位移为 −5 mm，X 仍为 40 mm。' },
    ],
    Graphic: LatheMotion,
  },
  '8.5': {
    title: '同一个 F0.2，两种计量方式',
    steps: [
      { title: '找状态', text: '这是两份独立的公制课堂记录。两边的 F 数值相同，要从当时生效的 G 指令读出单位。' },
      { title: '读 G99', text: '跟着卡盘标记转一圈。G99 下，每转一圈对应进给 0.2 mm，读作 0.2 mm/转。' },
      { title: '读 G98', text: '右侧时钟用一圈表示一分钟。G98 下，每过一分钟对应进给 0.2 mm。图中的转动与计时速度仅用于演示。' },
    ],
    Graphic: FeedModes,
  },
  '8.6': {
    title: '对齐端面，比较两条槽边',
    steps: [
      { title: '找图纸基准', text: '两幅图以同一右端面为 Z0。蓝点标记图纸上槽的右边缘，其位置是端面左侧 16 mm。' },
      { title: '跟踪预览', text: '沿橙线找到预览中同一个槽的右边缘。它位于端面左侧 12 mm，记录为 Z = −12 mm。' },
      { title: '对照位置', text: '把两个右边缘向下投影，预览位置比图纸向右偏了 4 mm。这个差值可用于复查零点和选中的轮廓。' },
    ],
    Graphic: CamComparison,
  },
};
