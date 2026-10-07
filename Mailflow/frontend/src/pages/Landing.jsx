import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

const features = [
  { icon: '📬', title: 'Email Sequences', desc: 'Set up multi-step email sequences with automatic follow-ups. Define delays between steps — MailFlow handles the rest.' },
  { icon: '🔁', title: 'Smart Follow-ups', desc: 'Follow-ups stop automatically if someone replies. No awkward emails to people who\'ve already responded.' },
  { icon: '👥', title: 'Bulk or Single Contact', desc: 'Upload a CSV for bulk outreach, or just type in 1-2 emails manually. Works for any campaign size.' },
  { icon: '📊', title: 'Open & Reply Tracking', desc: 'See who opened your emails and who replied. Track performance across all your sequences in one dashboard.' },
  { icon: '📅', title: 'Schedule Calendar', desc: 'See exactly how many emails are going out each day — date-wise, sequence-wise. Never lose track of your outreach.' },
  { icon: '✉️', title: 'Gmail Integration', desc: 'Connects directly with your Gmail account. Emails are sent from your inbox — not some shady third-party server.' },
  { icon: '📎', title: 'Attachments', desc: 'Attach your resume, brochure, or any file to every email in a sequence. One upload, applied everywhere.' },
  { icon: '🗂️', title: 'Sequence Management', desc: 'Archive old sequences, search, reorder, add private notes. Keep your workspace clean as you scale.' },
  { icon: '🔒', title: 'Duplicate Protection', desc: 'Built-in checks make sure no contact ever gets the same email twice — no matter what.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const m = useIsMobile();
  const goLogin = () => navigate('/login');
  const goRegister = () => navigate('/register');

  const px = m ? '20px' : '48px';
  const sectionPad = m ? '52px 20px' : '80px 48px';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f5f5f7', color: '#1a1a2e', fontSize: 15, lineHeight: '1.6', WebkitFontSmoothing: 'antialiased', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e2ea', position: 'sticky', top: 0, zIndex: 100, padding: `0 ${px}`, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={goLogin}>
          <div style={{ width: 32, height: 32, background: '#6c63ff', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✉️</div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>MailFlow</span>
        </div>

        {/* Nav links — hidden on mobile */}
        {!m && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <button style={{ color: '#555570', textDecoration: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
            <button style={{ color: '#555570', textDecoration: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit' }} onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
            <button style={{ color: '#555570', textDecoration: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit' }} onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!m && <button style={{ background: 'none', color: '#555570', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goLogin}>Log in</button>}
          {m && <button style={{ background: 'none', color: '#6c63ff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goLogin}>Log in</button>}
          <button style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: m ? '8px 14px' : '9px 20px', borderRadius: 8, fontSize: m ? 13 : 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goRegister}>
            {m ? 'Free Trial' : 'Start Free Trial'}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding: m ? '56px 24px 40px' : '96px 48px 72px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(108,99,255,0.08)', color: '#6c63ff', border: '1px solid rgba(108,99,255,0.2)', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          ✨ Smart Email Outreach Tool
        </div>
        <h1 style={{ fontSize: m ? 38 : 64, fontWeight: 800, letterSpacing: m ? '-1px' : '-2px', lineHeight: 1.15, marginBottom: 20, color: '#1a1a2e' }}>
          Send smarter.<br />
          Follow up <span style={{ color: '#6c63ff' }}>automatically.</span>
        </h1>
        <p style={{ fontSize: m ? 16 : 20, color: '#555570', maxWidth: 520, margin: '0 auto 32px', lineHeight: '1.6', fontWeight: 400 }}>
          Build email sequences, add your contacts, and let MailFlow handle the follow-ups — so you can focus on the conversations that matter.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16, flexDirection: m ? 'column' : 'row' }}>
          <button style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: m ? '13px 28px' : '14px 36px', borderRadius: 10, fontSize: m ? 15 : 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: m ? '100%' : 'auto', maxWidth: m ? 320 : 'none' }} onClick={goRegister}>
            Start 7-Day Free Trial
          </button>
          {!m && (
            <button style={{ background: 'none', color: '#6c63ff', border: '1.5px solid #6c63ff', padding: '13px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See Features
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#9090a8' }}>
          <span style={{ color: '#12a17a', fontWeight: 600 }}>✓ Free for 7 days</span>
          {m ? <><br />No credit card · Setup in minutes</> : <>&nbsp;·&nbsp; No credit card needed &nbsp;·&nbsp; Setup in minutes</>}
        </p>
      </div>

      {/* APP DEMO — hidden on mobile to save space */}
      {!m && (
        <div style={{ maxWidth: 960, margin: '0 auto 72px', padding: '0 48px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e2ea', borderRadius: 20, boxShadow: '0 16px 64px rgba(108,99,255,0.12)', overflow: 'hidden' }}>
            <div style={{ background: '#f0f0f5', borderBottom: '1px solid #e2e2ea', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5c7a' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffb547' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22d3a5' }} />
              <span style={{ fontSize: 12, color: '#9090a8', marginLeft: 8 }}>mailflow.app</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: 340 }}>
              <div style={{ borderRight: '1px solid #e2e2ea', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, background: '#6c63ff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✉️</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>MailFlow</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'rgba(108,99,255,0.08)', color: '#6c63ff' }}>🏠 &nbsp;Dashboard</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: '#555570' }}>⚙️ &nbsp;Settings</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Dashboard</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
                  {[['309','Total Contacts','#6c63ff'],['247','Emails Sent','#12a17a'],['61','Opened','#c47800'],['12','Replied','#5a52e0']].map(([v,l,c]) => (
                    <div key={l} style={{ background: '#f0f0f5', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {[['Mailing 30-03','156 contacts',true],['Blinkit Outreach','26 contacts',true],['ZS Consulting','18 contacts',false]].map(([name,sub,active]) => (
                  <div key={name} style={{ background: '#f0f0f5', borderRadius: 9, padding: '11px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{name}</div>
                      <div style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>from@gmail.com · {sub}</div>
                    </div>
                    <span style={{ padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: active ? 'rgba(18,161,122,0.1)' : '#e2e2ea', color: active ? '#12a17a' : '#9090a8' }}>
                      {active ? '● active' : 'stopped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES */}
      <div id="features" style={{ padding: sectionPad, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', color: '#6c63ff', fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Features</div>
        <div style={{ textAlign: 'center', fontSize: m ? 28 : 42, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 12, color: '#1a1a2e' }}>
          Everything you need to <span style={{ color: '#6c63ff' }}>run outreach at scale</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: m ? 15 : 18, color: '#555570', maxWidth: 520, margin: '0 auto 36px' }}>
          From a single email to hundreds of follow-ups — MailFlow keeps it organized and automated.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(3,1fr)', gap: m ? 12 : 18 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#fff', border: '1px solid #e2e2ea', borderRadius: 16, padding: m ? 20 : 26 }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: '#555570', lineHeight: '1.6' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#fff', padding: sectionPad, borderTop: '1px solid #e2e2ea', borderBottom: '1px solid #e2e2ea' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', color: '#6c63ff', fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <div style={{ textAlign: 'center', fontSize: m ? 28 : 42, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 12, color: '#1a1a2e' }}>
            Up and running in <span style={{ color: '#6c63ff' }}>4 simple steps</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: m ? 15 : 18, color: '#555570', maxWidth: 520, margin: '0 auto 36px' }}>
            No complicated setup. Connect Gmail, add contacts, write your emails, and launch.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: m ? 16 : 24 }}>
            {[
              { n: 1, title: 'Connect Gmail', desc: 'One-click OAuth. Emails go from your real inbox — builds trust.' },
              { n: 2, title: 'Add Contacts', desc: 'Upload a CSV for bulk outreach, or type emails manually.' },
              { n: 3, title: 'Write Sequence', desc: 'Write emails, set follow-up delays, personalize with variables.' },
              { n: 4, title: 'Launch & Track', desc: 'Hit launch. Monitor opens, replies, and schedule in real time.' },
            ].map((s) => (
              <div key={s.n} style={{ textAlign: 'center', padding: m ? '4px 0' : 0 }}>
                <div style={{ width: 44, height: 44, background: 'rgba(108,99,255,0.08)', border: '2px solid #6c63ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#6c63ff', margin: '0 auto 12px' }}>{s.n}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#555570', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ padding: sectionPad, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', color: '#6c63ff', fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
        <div style={{ textAlign: 'center', fontSize: m ? 28 : 42, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 12, color: '#1a1a2e' }}>
          Simple, honest <span style={{ color: '#6c63ff' }}>pricing</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: m ? 15 : 18, color: '#555570', margin: '0 auto 36px' }}>
          Start free. If you love it, request access to keep going.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(2,1fr)', gap: m ? 16 : 22 }}>
          <div style={{ background: '#fff', border: '1.5px solid #e2e2ea', borderRadius: 18, padding: m ? 24 : 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9090a8', marginBottom: 8, letterSpacing: '1px' }}>FREE TRIAL</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-1px', marginBottom: 4 }}>₹0 <span style={{ fontSize: 15, fontWeight: 400, color: '#9090a8' }}>/ 7 days</span></div>
            <div style={{ fontSize: 13, color: '#555570', marginBottom: 20, lineHeight: '1.5' }}>Full access for 7 days. No credit card, no commitment.</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, padding: 0 }}>
              {['All features unlocked', 'Unlimited sequences', 'Gmail integration', 'Open & reply tracking', 'Auto follow-ups'].map(f => (
                <li key={f} style={{ fontSize: 13.5, display: 'flex', alignItems: 'flex-start', gap: 8, color: '#1a1a2e' }}>
                  <span style={{ color: '#12a17a', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', color: '#6c63ff', border: '1.5px solid #6c63ff', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goRegister}>Start Free Trial</button>
          </div>
          <div style={{ background: '#fff', border: '2px solid #6c63ff', borderRadius: 18, padding: m ? 24 : 32, position: 'relative', boxShadow: '0 8px 40px rgba(108,99,255,0.15)' }}>
            <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#6c63ff', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100 }}>⭐ PREMIUM</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9090a8', marginBottom: 8, letterSpacing: '1px' }}>FULL ACCESS</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-1px', marginBottom: 4 }}>Request <span style={{ fontSize: 15, fontWeight: 400, color: '#9090a8' }}>access</span></div>
            <div style={{ fontSize: 13, color: '#555570', marginBottom: 20, lineHeight: '1.5' }}>After your trial, send a request. Once approved, you get permanent full access.</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, padding: 0 }}>
              {['Everything in Free Trial', 'Permanent access', 'Priority support', 'No limits on contacts', 'Early access to new features'].map(f => (
                <li key={f} style={{ fontSize: 13.5, display: 'flex', alignItems: 'flex-start', gap: 8, color: '#1a1a2e' }}>
                  <span style={{ color: '#12a17a', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button style={{ display: 'block', width: '100%', textAlign: 'center', background: '#6c63ff', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goRegister}>Request Access</button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#6c63ff', padding: sectionPad, textAlign: 'center' }}>
        <h2 style={{ fontSize: m ? 28 : 42, fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: 12 }}>Ready to level up your outreach?</h2>
        <p style={{ fontSize: m ? 15 : 18, color: 'rgba(255,255,255,0.8)', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
          Join others who use MailFlow to land interviews, close deals, and build connections — on autopilot.
        </p>
        <button style={{ background: '#fff', color: '#6c63ff', border: 'none', padding: m ? '13px 32px' : '14px 40px', borderRadius: 10, fontSize: m ? 15 : 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goRegister}>
          Start Your Free Trial →
        </button>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1a1a2e', padding: m ? '24px 20px' : '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: m ? 'column' : 'row', gap: m ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#6c63ff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✉️</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>MailFlow</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>© 2026 MailFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
