const blue = '#2563eb';
const orange = '#b45309';
const steel = '#52677b';
const body = '#e3edf3';

function Dimension({ from, to, y, label, color = blue }) {
  return <g stroke={color} strokeWidth="2">
    <path d={`M${from} ${y - 6}v12 M${from} ${y}H${to} M${to} ${y - 6}v12`} fill="none" />
    <text x={(from + to) / 2} y={y - 10} textAnchor="middle" fill={color} stroke="none" fontSize="19">{label}</text>
  </g>;
}

function ChangingOrigin({ step, progress }) {
  const left = 114, point = 330, right = 474;
  const origin = step === 0 ? left : step === 1 ? left + (right - left) * progress : right;
  const reading = (point - origin) / 7.2;
  const value = `${reading < -0.05 ? '−' : reading > 0.05 ? '+' : ''}${Number(Math.abs(reading).toFixed(1))}`;
  const from = step === 0 ? left : right;
  const to = step === 1 ? left : from + (point - from) * progress;
  return <g>
    <path d="M114 86 H330 V100 H474 V150 H330 V164 H114 Z" fill={body} stroke={steel} strokeWidth="2.5" />
    <path d="M53 125 H548" stroke={steel} strokeDasharray="10 4 2 4" />
    <path d="m550 125-12-5v10z" fill={steel} /><text x="526" y="113" fill={steel} fontSize="19">+Z</text>
    <path d="M330 70V177" stroke={blue} strokeDasharray="4 5" />
    <circle cx={point} cy="86" r="6" fill={blue} /><text x={point} y="60" textAnchor="middle" fill={blue} fontSize="20">P 点</text>
    <text x="34" y="34" fill={steel} fontSize="17">P 点的 Z 读数</text>
    <text x="34" y="64" fill={blue} fontSize="26" fontWeight="700">{value} mm</text>
    <g transform={`translate(${origin} 0)`}>
      <path d="M0 77V179" stroke={orange} strokeWidth="2.5" strokeDasharray="5 4" />
      <circle cx="0" cy="125" r="6" fill={orange} />
      <text x="0" y="199" textAnchor="middle" fill={orange} fontSize="18">零点 O</text>
    </g>
    {step === 1
      ? <path d={`M${left} 223H${origin}`} stroke={orange} strokeWidth="3" strokeDasharray="6 4" />
      : <Dimension from={from} to={to} y={233} label={progress > .85 ? (step === 0 ? '向右 30 mm' : '向左 20 mm') : ''} />}
  </g>;
}

function ShoulderTolerance({ step, progress }) {
  const nominal = 277, halfBand = 130;
  const spread = step === 0 ? 0 : step === 1 ? progress : 1;
  const readout = nominal + 156 * progress;
  return <g>
    <path d="M108 69 H347 V85 H491 V111 H347 V125 H108 Z" fill={body} stroke={steel} strokeWidth="2" />
    <path d="M84 97H514" stroke={steel} strokeDasharray="9 4 2 4" />
    <path d="M108 40V69 M347 40V69" stroke={blue} strokeDasharray="3 3" />
    <Dimension from={108} to={108 + 239 * (step === 0 ? progress : 1)} y={44} label="20.00 ± 0.10 mm" />
    <text x="108" y="151" fill={steel} textAnchor="middle" fontSize="17">左端面</text>
    <text x="347" y="151" fill={steel} textAnchor="middle" fontSize="17">指定轴肩</text>
    <path d="M76 198H524" stroke="#9db0bd" strokeWidth="2" />
    {step > 0 && <rect x={nominal - halfBand * spread} y="192" width={2 * halfBand * spread} height="12" rx="4" fill="#92b8f3" />}
    {[['19.90',147],['20.00',nominal],['20.10',407]].map(([label, x]) => <g key={label}>
      <path d={`M${x} 189v18`} stroke={steel} strokeWidth="2" />
      <text x={x} y="232" textAnchor="middle" fontSize="18" fill={steel}>{label}</text>
    </g>)}
    <text x="512" y="232" fontSize="17" fill={steel}>mm</text>
    {step === 2 && <g transform={`translate(${readout} 0)`}>
      <path d="m0 197-7-13h14z" fill={orange} />
      <text y="177" textAnchor="middle" fontSize="18" fontWeight="650" fill={orange}>{progress > .98 ? '实测 20.12' : '定位读数'}</text>
    </g>}
  </g>;
}

function TaperProfile({ step, progress }) {
  const travel = step === 2 ? progress : 0;
  const x = 428 - 240 * travel, y = 56 + 90 * travel;
  return <g>
    <path d="M100 32V196H527" stroke={steel} strokeWidth="2" fill="none" />
    <path d="m100 26-5 11h10z M533 196l-12-5v10z" fill={steel} />
    <text x="28" y="30" fontSize="17" fill={steel}>半径 / mm</text>
    <text x="510" y="228" fontSize="17" fill={steel}>Z / mm</text>
    {[[56,'15'],[146,'12']].map(([v, label]) => <g key={label}>
      <path d={`M95 ${v}H465`} stroke="#b6c8d5" strokeDasharray="4 5" /><text x="83" y={v + 6} textAnchor="end" fontSize="18" fill={steel}>{label}</text>
    </g>)}
    {[[188, '2'],[428,'10']].map(([v, label]) => <g key={label}>
      <path d={`M${v} 39V199`} stroke="#b6c8d5" strokeDasharray="4 5" /><text x={v} y="224" textAnchor="middle" fontSize="18" fill={steel}>{label}</text>
    </g>)}
    <g opacity={step === 0 ? .35 + .65 * progress : 1}>
      <circle cx="428" cy="56" r="6" fill={blue} />
      <text x="431" y="40" textAnchor="middle" fontSize="18" fill={blue}>A（X30，Z10）</text>
    </g>
    {step > 0 && <>
      <path d="M428 56H188V146" fill="none" stroke={steel} strokeDasharray="6 5" />
      <g opacity={step === 1 ? progress : 1}>
        <circle cx="188" cy="146" r="6" fill={blue} />
        <text x="195" y="173" fontSize="18" fill={blue}>B（X24，Z2）</text>
      </g>
    </>}
    {step === 2 && <>
      <path d={`M428 56L${x} ${y}`} stroke={orange} strokeWidth="5" strokeLinecap="round" />
      <circle cx={x} cy={y} r="7" fill={orange} stroke="white" strokeWidth="2" />
    </>}
  </g>;
}

export const geometryDemos = {
  '8.1': {
    title: '移动零点，看同一点的读数',
    steps: [
      { title: '取左端面为零点', text: '蓝点 P 在左端面右侧 30 mm。沿 +Z 方向量，读数为 +30 mm。' },
      { title: '把零点移到右端面', text: '工件和蓝点都留在原位。橙色基准线向右移动 50 mm，经过 P 时读数为零。' },
      { title: '从新零点重新量', text: '从右端面到 P 要向左量 20 mm，读数变为 −20 mm。' },
    ],
    Graphic: ChangingOrigin,
  },
  '8.3': {
    title: '轴肩长度落在公差带里吗？',
    steps: [
      { title: '找到两个测量面', text: '沿蓝色尺寸线从左端面量到轴肩。图纸给定轴向长度 20.00 ± 0.10 mm。' },
      { title: '展开允许范围', text: '以 20.00 mm 为中心，上下各留 0.10 mm。尺上的蓝带从 19.90 mm 延伸到 20.10 mm。' },
      { title: '放入实测值', text: '橙色指针标出实测的 20.12 mm，落在蓝带右侧。它比上限 20.10 mm 大了 0.02 mm。' },
    ],
    Graphic: ShoulderTolerance,
  },
  '8.4': {
    title: '从两个坐标点画出锥面轮廓',
    steps: [
      { title: '把 A 点画到剖面上', text: '练习采用 X 直径表示，图中纵轴表示半径。A 的 X30 对应半径 15 mm，横向位置是 Z10。' },
      { title: '找出第二个点 B', text: 'B 的 X24 对应半径 12 mm，横向位置是 Z2。虚线的两段分别对应向左 8 mm、向中心线 3 mm。' },
      { title: '沿直线从 A 到 B', text: '追踪橙点可见，轴向位置和半径同时变化。轴向长度为 8 mm，两端直径相差 6 mm，单侧轮廓的高度差为 3 mm。' },
    ],
    Graphic: TaperProfile,
  },
};
