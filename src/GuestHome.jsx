import { useEffect, useState } from 'react';
import { Bell, CaretRight, Gear, SignIn, SquaresFour, Stack } from '@phosphor-icons/react';
import { TradeIcon } from './TradeIcon.jsx';
import { HomeDashboard } from './HomeDashboard.jsx';
import './guest-home.css';

const navigation = ['首页', '学习中心', '知识库', '学习记录'];

export function GuestHome({ trades, onLogin }) {
  const requestLogin = () => onLogin();

  return <div className="app home-screen guest-home">
    <header className="topbar">
      <button className="brand" type="button" onClick={requestLogin} aria-label="金工实习智能体首页">
        <Gear weight="bold" className="brand-mark" /><span>金工实习智能体</span>
      </button>
      <nav className="main-nav" aria-label="主导航">
        {navigation.map((label, index) => <button key={label} type="button" onClick={requestLogin}
          className={index === 0 ? 'active' : ''} aria-current={index === 0 ? 'page' : undefined}>{label}</button>)}
      </nav>
      <div className="header-actions">
        <button className="notification icon-button" type="button" onClick={requestLogin} aria-label="查看通知"><Bell /></button>
        <button className="button guest-header-login" type="button" onClick={requestLogin}><SignIn size={20} /> 登录</button>
      </div>
    </header>

    <div className="app-layout">
      <aside className="trade-sidebar" aria-label="工种选择">
        <h2><Stack weight="duotone" /> 实习工种</h2>
        <div className="trade-list">
          {trades.map((trade, index) => <button key={trade.id} className={`trade-button${index === 0 ? ' selected' : ''}`}
            type="button" onClick={() => { sessionStorage.setItem('metalwork:requested-trade', trade.id); requestLogin(); }}>
            <TradeIcon trade={trade} className="trade-icon" />
            <span>{trade.name}</span>
            {trade.open ? <CaretRight className="trade-chevron" weight="bold" /> : <span className="trade-state">待开放</span>}
          </button>)}
          <button className="trade-button more-trades" type="button" onClick={requestLogin}>
            <SquaresFour weight="bold" className="trade-icon" /><span>更多工种</span>
          </button>
        </div>
        <div className="sidebar-context"><span>当前状态</span><strong>未登录</strong><p>登录后查看学习进度</p></div>
      </aside>

      <main className="main-content" id="main-content">
        <HomeDashboard trade={trades[0]} onBegin={requestLogin} onNavigate={requestLogin} />
      </main>
    </div>
  </div>;
}

export function StartupAnimation() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShow(false), 620);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!show) return null;
  return <div className="guest-startup" aria-hidden="true">
    <div className="guest-startup-mark"><Gear weight="bold" size={48} /></div>
    <div className="guest-startup-progress"><span /></div>
  </div>;
}
