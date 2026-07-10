import React, { useEffect, useRef } from 'react';
import './LandingPage.css';

// Inline SVG icons
const Icons = () => (
  <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <symbol id="lp-ic-landmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
      </symbol>
      <symbol id="lp-ic-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </symbol>
      <symbol id="lp-ic-message-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </symbol>
      <symbol id="lp-ic-bot" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
      </symbol>
      <symbol id="lp-ic-trending-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
      </symbol>
      <symbol id="lp-ic-link-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/>
      </symbol>
      <symbol id="lp-ic-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </symbol>
      <symbol id="lp-ic-git-branch" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
      </symbol>
      <symbol id="lp-ic-file-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </symbol>
      <symbol id="lp-ic-sparkles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/><path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75z"/>
      </symbol>
      <symbol id="lp-ic-shopping-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </symbol>
      <symbol id="lp-ic-briefcase" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </symbol>
      <symbol id="lp-ic-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </symbol>
      <symbol id="lp-ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </symbol>
      <symbol id="lp-ic-shield-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
      </symbol>
      <symbol id="lp-ic-plug" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3z"/>
      </symbol>
      <symbol id="lp-ic-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </symbol>
      <symbol id="lp-ic-alert-triangle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </symbol>
      <symbol id="lp-ic-arrow-up-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
      </symbol>
      <symbol id="lp-ic-building-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><line x1="10" y1="6" x2="10" y2="6"/><line x1="14" y1="6" x2="14" y2="6"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="10" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="14" y2="14"/>
      </symbol>
      <symbol id="lp-ic-upload-cloud" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </symbol>
      <symbol id="lp-ic-bar-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </symbol>
    </defs>
  </svg>
);

const LogoMark = ({ gradId }) => (
  <svg className="lp-logo-mark" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#17B8CC"/>
        <stop offset="100%" stopColor="#6B3FA0"/>
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill={`url(#${gradId})`} opacity="0.12"/>
    <path d="M9 18c0-2.5 1.8-4.5 4-4.5s3 1.5 5 1.5 3-1.5 5-1.5 4 2 4 4.5-1.8 4.5-4 4.5-3-1.5-5-1.5-3 1.5-5 1.5S9 20.5 9 18z" stroke={`url(#${gradId})`} strokeWidth="2" fill="none"/>
    <circle cx="18" cy="18" r="3" fill={`url(#${gradId})`} opacity="0.7"/>
  </svg>
);

export default function LandingPage({ onLogin, onGetStarted }) {
  const fadeRefs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('lp-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });

    fadeRefs.current.forEach(el => { if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const addFadeRef = el => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-root">
      <Icons />

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <LogoMark gradId="lgnav" />
          <div>
            <div className="lp-logo-text"><span>AiFinity</span></div>
            <div className="lp-logo-sub">AI-Powered Financial Intelligence</div>
          </div>
        </div>
        <ul className="lp-nav-links">
          <li><a onClick={() => scrollTo('lp-how')}>How it works</a></li>
          <li><a onClick={() => scrollTo('lp-features')}>Features</a></li>
          <li><a onClick={() => scrollTo('lp-pricing')}>Pricing</a></li>
        </ul>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={onLogin}>Log in</button>
          <button className="lp-btn-grad" onClick={onGetStarted}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="lp-hero">
        <div className="lp-hero-glow-t"></div>
        <div className="lp-hero-glow-p"></div>
        <div className="lp-hero-fade"></div>

        <div className="lp-eyebrow">
          <div className="lp-eyebrow-dot"></div>
          Now with Open Banking · PSD2 compliant
        </div>

        <h1 className="lp-hero-title">
          Your finances,<br /><span className="lp-grad-text">finally intelligent</span>
        </h1>
        <p className="lp-hero-sub">
          AiFinity connects to your bank, categorizes every transaction, and delivers AI-powered guidance — so you always know what you can spend, save, and plan.
        </p>

        <div className="lp-hero-cta">
          <button className="lp-btn-grad-lg" onClick={onGetStarted}>Start free — no card needed</button>
          <button className="lp-btn-outline-lg" onClick={() => scrollTo('lp-features')}>See features</button>
        </div>

        {/* Dashboard Mockup */}
        <div className="lp-db-wrap">
          <div className="lp-db-frame">
            <div className="lp-db-hdr">
              <div className="lp-db-dots">
                <div className="lp-db-dot" style={{ background: '#FF5F57' }}></div>
                <div className="lp-db-dot" style={{ background: '#FEBC2E' }}></div>
                <div className="lp-db-dot" style={{ background: '#28C840' }}></div>
              </div>
              <div className="lp-db-ttl">AiFinity · Dashboard · May 2026</div>
              <div style={{ width: '60px' }}></div>
            </div>
            <div className="lp-db-body">
              <div className="lp-db-kpi">
                <div className="lp-db-kpi-lbl">Net Balance</div>
                <div className="lp-db-kpi-val lp-c-pos">€4,218</div>
                <div className="lp-db-kpi-trend"><span className="lp-up">↑ 12%</span> vs last month</div>
              </div>
              <div className="lp-db-kpi">
                <div className="lp-db-kpi-lbl">Monthly Spend</div>
                <div className="lp-db-kpi-val lp-c-neg">€2,340</div>
                <div className="lp-db-kpi-trend"><span className="lp-dn">↑ 4%</span> over budget</div>
              </div>
              <div className="lp-db-kpi">
                <div className="lp-db-kpi-lbl">Savings Rate</div>
                <div className="lp-db-kpi-val" style={{ color: 'var(--lp-text)' }}>23%</div>
                <div className="lp-db-kpi-trend"><span className="lp-up">On track</span></div>
              </div>
              <div className="lp-db-chart-row">
                <div className="lp-db-card">
                  <div className="lp-db-card-ttl">Spending — last 6 months</div>
                  <div className="lp-mini-bars">
                    <div className="lp-mbar" style={{ height: '40%', background: '#17B8CC', opacity: 0.38 }}></div>
                    <div className="lp-mbar" style={{ height: '65%', background: '#17B8CC', opacity: 0.5 }}></div>
                    <div className="lp-mbar" style={{ height: '50%', background: '#17B8CC', opacity: 0.48 }}></div>
                    <div className="lp-mbar" style={{ height: '84%', background: '#DC3755', opacity: 0.58 }}></div>
                    <div className="lp-mbar" style={{ height: '58%', background: '#17B8CC', opacity: 0.55 }}></div>
                    <div className="lp-mbar" style={{ height: '70%', background: '#6B3FA0', opacity: 0.7 }}></div>
                  </div>
                </div>
                <div className="lp-db-ai">
                  <div className="lp-db-ai-lbl">
                    <svg width="11" height="11" style={{ flexShrink: 0, color: 'var(--lp-teal-dark)' }}>
                      <use href="#lp-ic-sparkles" />
                    </svg>
                    AI Insight
                  </div>
                  <div className="lp-db-ai-msg">
                    You can spend <strong>€180 more</strong> this week and still hit your monthly target.
                  </div>
                </div>
              </div>
              <div className="lp-db-card" style={{ gridColumn: '1/-1' }}>
                <div className="lp-db-card-ttl">Recent transactions</div>
                <div className="lp-db-tx">
                  <div className="lp-db-tx-ico" style={{ background: 'var(--lp-teal-light)' }}>
                    <svg width="14" height="14" style={{ color: '#17B8CC' }}><use href="#lp-ic-shopping-cart" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lp-db-tx-name">Mercadona</div>
                    <div className="lp-db-tx-cat">Alimentación</div>
                  </div>
                  <div className="lp-db-tx-amt lp-c-neg">−€67.40</div>
                </div>
                <div className="lp-db-tx">
                  <div className="lp-db-tx-ico" style={{ background: 'var(--lp-purple-light)' }}>
                    <svg width="14" height="14" style={{ color: '#6B3FA0' }}><use href="#lp-ic-briefcase" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lp-db-tx-name">Nómina Empresa S.L.</div>
                    <div className="lp-db-tx-cat">Ingresos</div>
                  </div>
                  <div className="lp-db-tx-amt lp-c-pos">+€2,650.00</div>
                </div>
                <div className="lp-db-tx">
                  <div className="lp-db-tx-ico" style={{ background: 'var(--lp-red-light)' }}>
                    <svg width="14" height="14" style={{ color: '#DC3755' }}><use href="#lp-ic-home" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lp-db-tx-name">Alquiler Noviembre</div>
                    <div className="lp-db-tx-cat">Vivienda</div>
                  </div>
                  <div className="lp-db-tx-amt lp-c-neg">−€950.00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL PROOF */}
      <div className="lp-social">
        <div className="lp-soc-stat"><div className="lp-soc-num">€2.4M+</div><div className="lp-soc-lbl">transactions analyzed</div></div>
        <div className="lp-soc-div"></div>
        <div className="lp-soc-stat"><div className="lp-soc-num">50+</div><div className="lp-soc-lbl">spending categories</div></div>
        <div className="lp-soc-div"></div>
        <div className="lp-soc-stat"><div className="lp-soc-num">PSD2</div><div className="lp-soc-lbl">open banking compliant</div></div>
        <div className="lp-soc-div"></div>
        <div className="lp-soc-stat"><div className="lp-soc-num">EN / ES</div><div className="lp-soc-lbl">bilingual platform</div></div>
      </div>

      {/* HOW IT WORKS */}
      <div className="lp-sw" id="lp-how">
        <div className="lp-sec-eye">How it works</div>
        <h2 className="lp-sec-h">Three steps to<br />financial clarity</h2>
        <p className="lp-sec-p">From bank connection to AI-powered insights in minutes — no spreadsheets, no guesswork.</p>
        <div className="lp-how-grid lp-fade-up" ref={addFadeRef}>
          <div className="lp-how-step">
            <div className="lp-how-num">01</div>
            <div className="lp-how-ico" style={{ background: 'var(--lp-teal-light)' }}>
              <svg width="22" height="22" style={{ color: '#17B8CC' }}><use href="#lp-ic-landmark" /></svg>
            </div>
            <h3>Connect your bank</h3>
            <p>Link accounts via PSD2 Open Banking or upload PDF/CSV from ING, Sabadell, BBVA, CaixaBank and more. Secure, read-only access.</p>
          </div>
          <div className="lp-how-step">
            <div className="lp-how-num">02</div>
            <div className="lp-how-ico" style={{ background: 'var(--lp-purple-light)' }}>
              <svg width="22" height="22" style={{ color: '#6B3FA0' }}><use href="#lp-ic-zap" /></svg>
            </div>
            <h3>AI categorizes everything</h3>
            <p>Every transaction tagged across 50+ Spanish and English categories automatically. Recurring payments detected and tracked.</p>
          </div>
          <div className="lp-how-step">
            <div className="lp-how-num">03</div>
            <div className="lp-how-ico" style={{ background: 'var(--lp-teal-light)' }}>
              <svg width="22" height="22" style={{ color: '#17B8CC' }}><use href="#lp-ic-message-circle" /></svg>
            </div>
            <h3>Get real answers</h3>
            <p>Ask "Can I afford this?" and get a direct answer — not a report. AiFinity tells you exactly what you can spend, save, and plan.</p>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ background: '#fff', padding: '100px 0' }} id="lp-features">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 52px' }}>
          <div className="lp-sec-eye">Features</div>
          <h2 className="lp-sec-h">Everything you need,<br />nothing you don't</h2>
          <div className="lp-bento lp-fade-up" ref={addFadeRef}>

            {/* AI Financial Assistant */}
            <div className="lp-bc lp-wide">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-teal-light)' }}>
                <svg width="22" height="22" style={{ color: '#17B8CC' }}><use href="#lp-ic-bot" /></svg>
              </div>
              <h3>AI Financial Assistant</h3>
              <p>Ask anything about your money in plain Spanish or English. AiFinity answers directly — budget status, payment predictions, savings strategies.</p>
              <div className="lp-chat-mini">
                <div className="lp-cb lp-u">How much can I spend this weekend?</div>
                <div className="lp-cb lp-a">Based on your budget, you have <strong>€240 available</strong> before month-end. Rent and Netflix are already covered. You're on track.</div>
                <div className="lp-cb lp-u">What if I book flights for €180?</div>
                <div className="lp-cb lp-a">You'd still have <strong>€60 buffer</strong> — safe to book. Just skip one restaurant dinner this week.</div>
              </div>
              <span className="lp-ftag">
                <svg width="12" height="12" style={{ color: '#0E99AA' }}><use href="#lp-ic-sparkles" /></svg>
                Powered by Claude AI
              </span>
            </div>

            {/* Spending Prediction */}
            <div className="lp-bc">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-purple-light)' }}>
                <svg width="22" height="22" style={{ color: '#6B3FA0' }}><use href="#lp-ic-trending-up" /></svg>
              </div>
              <h3>Spending Prediction</h3>
              <p>AI forecasts your month-end balance from 3–6 months of patterns. See where you'll land before you get there.</p>
              <div style={{ marginTop: '20px' }}>
                <div className="lp-sbar-row"><span className="lp-sbar-lbl">Alimentación</span><span className="lp-sbar-pct" style={{ color: 'var(--lp-teal-dark)' }}>74%</span></div>
                <div className="lp-sbar-track"><div className="lp-sbar-fill" style={{ width: '74%', background: 'var(--lp-teal)' }}></div></div>
                <div className="lp-sbar-row"><span className="lp-sbar-lbl">Vivienda</span><span className="lp-sbar-pct" style={{ color: 'var(--lp-green)' }}>100%</span></div>
                <div className="lp-sbar-track"><div className="lp-sbar-fill" style={{ width: '100%', background: 'var(--lp-green)' }}></div></div>
                <div className="lp-sbar-row"><span className="lp-sbar-lbl">Ocio</span><span className="lp-sbar-pct" style={{ color: 'var(--lp-amber)' }}>91%</span></div>
                <div className="lp-sbar-track"><div className="lp-sbar-fill" style={{ width: '91%', background: 'var(--lp-amber)' }}></div></div>
              </div>
            </div>

            {/* Open Banking Sync */}
            <div className="lp-bc">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-teal-light)' }}>
                <svg width="22" height="22" style={{ color: '#17B8CC' }}><use href="#lp-ic-link-2" /></svg>
              </div>
              <h3>Open Banking Sync</h3>
              <p>Connect directly to 2,000+ European banks via PSD2 Open Banking. Transactions sync automatically — always current.</p>
              <div className="lp-badges">
                <div className="lp-badge"><svg width="11" height="11" style={{ color: '#0E99AA' }}><use href="#lp-ic-shield-check" /></svg>PSD2</div>
                <div className="lp-badge"><svg width="11" height="11" style={{ color: '#0E99AA' }}><use href="#lp-ic-plug" /></svg>Open API</div>
                <div className="lp-badge"><svg width="11" height="11" style={{ color: '#0E99AA' }}><use href="#lp-ic-eye" /></svg>Read-only</div>
              </div>
            </div>

            {/* Smart Budget Engine */}
            <div className="lp-bc">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-purple-light)' }}>
                <svg width="22" height="22" style={{ color: '#6B3FA0' }}><use href="#lp-ic-target" /></svg>
              </div>
              <h3>Smart Budget Engine</h3>
              <p>AI builds budgets from your real spending history, family size, and location — not generic rules. Alerts before you overspend.</p>
            </div>

            {/* Financial Scenarios */}
            <div className="lp-bc">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-teal-light)' }}>
                <svg width="22" height="22" style={{ color: '#17B8CC' }}><use href="#lp-ic-git-branch" /></svg>
              </div>
              <h3>Financial Scenarios</h3>
              <p>Job loss? Salary raise? New mortgage? Run instant what-if simulations so you're prepared for any financial reality.</p>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '14px' }}>
                <span className="lp-stag" style={{ background: 'var(--lp-red-light)', border: '1px solid rgba(220,55,85,0.2)', color: 'var(--lp-red)' }}>
                  <svg width="12" height="12" style={{ color: 'var(--lp-red)' }}><use href="#lp-ic-alert-triangle" /></svg>Job loss
                </span>
                <span className="lp-stag" style={{ background: 'var(--lp-teal-light)', border: '1px solid rgba(23,184,204,0.22)', color: 'var(--lp-teal-dark)' }}>
                  <svg width="12" height="12" style={{ color: 'var(--lp-teal-dark)' }}><use href="#lp-ic-arrow-up-right" /></svg>Salary +20%
                </span>
                <span className="lp-stag" style={{ background: 'var(--lp-purple-light)', border: '1px solid rgba(107,63,160,0.18)', color: 'var(--lp-purple-dark)' }}>
                  <svg width="12" height="12" style={{ color: 'var(--lp-purple-dark)' }}><use href="#lp-ic-building-2" /></svg>Mortgage
                </span>
              </div>
            </div>

            {/* Statement Parser */}
            <div className="lp-bc">
              <div className="lp-bc-ico" style={{ background: 'var(--lp-purple-light)' }}>
                <svg width="22" height="22" style={{ color: '#6B3FA0' }}><use href="#lp-ic-file-text" /></svg>
              </div>
              <h3>Statement Parser</h3>
              <p>No open banking yet? Drag and drop PDF or CSV — ING, Sabadell, CaixaBank parsed and categorized instantly.</p>
              <span className="lp-ftag lp-ftag-purple">
                <svg width="12" height="12" style={{ color: 'var(--lp-purple-dark)' }}><use href="#lp-ic-upload-cloud" /></svg>
                ING · Sabadell · BBVA · CaixaBank
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="lp-sw" id="lp-pricing" style={{ textAlign: 'center' }}>
        <div className="lp-sec-eye">Pricing</div>
        <h2 className="lp-sec-h">Simple, honest pricing</h2>
        <p className="lp-sec-p" style={{ margin: '0 auto' }}>Start free forever. Upgrade when you're ready for the full intelligence stack.</p>
        <div className="lp-pricing-grid lp-fade-up" ref={addFadeRef}>

          <div className="lp-plan">
            <div className="lp-plan-name">Free</div>
            <div className="lp-plan-price"><sup>€</sup>0<sub>/mo</sub></div>
            <div className="lp-plan-desc">Perfect for getting started with your financial picture.</div>
            <ul className="lp-plan-feats">
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>1 bank account connected</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>PDF/CSV statement upload</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Auto-categorization (50+ categories)</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>3 months transaction history</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Basic budget tracking</li>
              <li className="lp-off"><span className="lp-chk-off"></span>AI Financial Assistant</li>
              <li className="lp-off"><span className="lp-chk-off"></span>Spending predictions</li>
              <li className="lp-off"><span className="lp-chk-off"></span>Financial scenarios</li>
            </ul>
            <button className="lp-btn-outline-lg" style={{ width: '100%', textAlign: 'center' }} onClick={onGetStarted}>
              Get started free
            </button>
          </div>

          <div className="lp-plan lp-featured">
            <div className="lp-plan-badge">Most popular</div>
            <div className="lp-plan-name">Pro</div>
            <div className="lp-plan-price lp-gp"><sup>€</sup>9<sub style={{ WebkitTextFillColor: 'var(--lp-text-dim)', background: 'none' }}>/mo</sub></div>
            <div className="lp-plan-desc">Full AI intelligence for serious financial control.</div>
            <ul className="lp-plan-feats">
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Unlimited bank accounts</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>PDF/CSV statement upload</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Auto-categorization (50+ categories)</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Full transaction history</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>AI-powered budget (personalized)</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>AI Financial Assistant (unlimited)</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Spending predictions &amp; alerts</li>
              <li><span className="lp-chk"><svg width="10" height="10" style={{ color: '#17B8CC' }}><use href="#lp-ic-check" /></svg></span>Financial scenarios simulator</li>
            </ul>
            <button className="lp-btn-grad-lg" style={{ width: '100%', textAlign: 'center' }} onClick={onGetStarted}>
              Start 14-day free trial
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="lp-footer-outer">
        <div className="lp-footer-wrap">
          <div className="lp-footer-brand">
            <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <LogoMark gradId="lgft" />
              <div>
                <div className="lp-logo-text"><span>AiFinity</span></div>
                <div className="lp-logo-sub">AI-Powered Financial Intelligence</div>
              </div>
            </div>
            <p>AI-powered financial intelligence for the way you actually live.</p>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <ul>
              <li><a onClick={() => scrollTo('lp-features')}>Features</a></li>
              <li><a onClick={() => scrollTo('lp-pricing')}>Pricing</a></li>
              <li><a onClick={() => scrollTo('lp-how')}>Open Banking</a></li>
              <li><a>Security</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Company</h4>
            <ul>
              <li><a>About</a></li>
              <li><a>Blog</a></li>
              <li><a>Contact</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a>Privacy Policy</a></li>
              <li><a>Terms of Service</a></li>
              <li><a>Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-btm">
          <p>© 2026 AiFinity.app · All rights reserved.</p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="lp-status-dot"></span>All systems operational
          </p>
        </div>
      </div>
    </div>
  );
}
