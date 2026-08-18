'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Arena,
  clashThesis,
  EXPLORER,
  FAUCET,
  LedgerEvent,
  proposeThesis,
  Stats,
  fetchArena,
} from '@/lib/contract';
import { useContractData } from '@/hooks/useContractData';
import { useTransaction } from '@/hooks/useTransaction';
import { useWallet } from '@/hooks/useWallet';
import {
  AddrChip,
  CloseIcon,
  ExternalIcon,
  FocusTrap,
  RefreshIcon,
  PillarIcon,
  BalanceIcon,
  ScrollIcon,
  BookIcon,
  Spinner,
  StatusBadge,
  Toast,
  ToastVariant,
  WalletIcon,
} from '@/components/ui';

interface ToastItem { id: number; message: string; variant: ToastVariant; }

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now();
    setToasts(p => [...p.slice(-4), { id, message, variant }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

// ─────────────────────────────────────────────
//  ACADEMY APP HEADER
// ─────────────────────────────────────────────
function AppHeader({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0' }}>
        {/* Wordmark logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--gold), #8f7421)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg-void)',
          }}>
            <PillarIcon size={20} />
          </div>
          <div>
            <h1 className="display-title" style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--gold)' }}>
              ELENCHUS
            </h1>
            <p className="label-caps" style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--text-muted)', marginTop: '1px' }}>
              Fact-Adjudicated Socratic Duels · GenLayer
            </p>
          </div>
        </div>

        {/* Wallet info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {wallet.address ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              background: 'var(--bg-raised)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-md)', padding: '0.45rem 0.85rem',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: wallet.onChain ? 'var(--sage)' : 'var(--terracotta)',
                boxShadow: wallet.onChain ? '0 0 8px var(--sage)' : '0 0 8px var(--terracotta)',
              }} />
              <AddrChip addr={wallet.address} />
              {wallet.balance && (
                <span className="mono" style={{ color: 'var(--gold)', fontSize: '0.78rem', fontWeight: 600 }}>
                  {wallet.balance} GEN
                </span>
              )}
              <button className="btn btn-ghost btn-icon" onClick={wallet.disconnect} aria-label="Disconnect wallet" style={{ width: 22, height: 22, marginLeft: 6, padding: 0 }}>
                <CloseIcon size={12} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={wallet.connect}
              disabled={wallet.connecting || !wallet.hasProvider}
              id="connect-wallet-btn"
            >
              {wallet.connecting ? <Spinner size={14} color="var(--bg-void)" /> : <WalletIcon size={14} />}
              {wallet.connecting ? 'Connecting…' : wallet.hasProvider ? 'Access Academy' : 'Install MetaMask'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
//  TABS & VIEWS
// ─────────────────────────────────────────────

// 🏛 Tab 1: DIALECTICS LIST & DETAIL
function DialecticsView({
  arenas, selected, onSelect, onPropose, onClash, walletAddr, loading,
}: {
  arenas: Arena[]; selected: Arena | null; onSelect: (a: Arena) => void;
  onPropose: () => void; onClash: (a: Arena) => void; walletAddr: string | null; loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Categories list
  const categories = useMemo(() => {
    const list = new Set<string>();
    arenas.forEach(a => { if (a.category) list.add(a.category); });
    return ['All', ...Array.from(list)];
  }, [arenas]);

  // Filter and search
  const filteredArenas = useMemo(() => {
    return arenas.filter(a => {
      const matchSearch = a.topic.toLowerCase().includes(search.toLowerCase()) || 
                          a.claim.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'All' || a.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [arenas, search, activeCategory]);

  const canClash = selected && walletAddr && walletAddr.toLowerCase() !== selected.proponent.toLowerCase();

  return (
    <div className="layout-cols">
      {/* Left panel: Hypotheses cards list */}
      <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="display-title" style={{ fontSize: '1.2rem', color: 'var(--text-bright)' }}>Active Hypotheses</h2>
          <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={onPropose} id="propose-thesis-btn">
            + Propose Hypothesis
          </button>
        </div>

        {/* Search */}
        <input
          className="field-input"
          placeholder="Search topics or claims..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontSize: '0.85rem', padding: '0.55rem 0.85rem' }}
        />

        {/* Categories slider */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Dialectics List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
          {loading && arenas.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />
            ))
          ) : filteredArenas.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', padding: '2rem 1rem', textAlign: 'center' }}>
              No dialectic sessions matches your filter.
            </p>
          ) : (
            filteredArenas.map(arena => (
              <button
                key={arena.id}
                className={`dialectic-card ${selected?.id === arena.id ? 'selected' : ''}`}
                onClick={() => onSelect(arena)}
                id={`arena-item-${arena.id}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
                  <span className="badge badge-dim" style={{ fontSize: '0.62rem' }}>{arena.category}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>#{arena.id}</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.4 }}>
                  {arena.topic}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                    {arena.clashes} Duel{arena.clashes !== 1 ? 's' : ''}
                  </span>
                  <span className="badge badge-sage" style={{ fontSize: '0.6rem' }}>
                    {arena.defenses} Defended
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Selected detailed progression */}
      <div>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Topic header */}
            <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>{selected.category}</span>
                <h2 className="display-title" style={{ fontSize: '1.6rem', color: 'var(--text-bright)' }}>{selected.topic}</h2>
              </div>

              {/* Current Hypothesis state */}
              <div style={{
                background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-soft)', padding: '1.25rem',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.35rem 0.75rem', background: 'var(--gold-glow)', borderBottomLeftRadius: 8, borderLeft: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
                  <span className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--gold)' }}>Active State</span>
                </div>
                <p className="label-caps" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Hypothesis</p>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-bright)', lineHeight: 1.65, marginBottom: '1rem', fontStyle: 'italic' }}>
                  "{selected.claim}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Proponent:</span>
                    <AddrChip addr={selected.proponent} />
                  </div>
                  {selected.evidence_url && (
                    <a
                      href={selected.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.76rem', padding: '0.25rem 0.65rem', borderRadius: 4 }}
                    >
                      Inspect Source <ExternalIcon />
                    </a>
                  )}
                </div>
              </div>

              {/* Refutation button */}
              {canClash ? (
                <button className="btn btn-primary" onClick={() => onClash(selected)} id={`clash-btn-${selected.id}`} style={{ width: '100%' }}>
                  <BalanceIcon size={14} color="var(--bg-void)" />
                  Challenge & Refute Hypothesis
                </button>
              ) : walletAddr && selected.proponent.toLowerCase() === walletAddr.toLowerCase() ? (
                <div style={{ background: 'var(--sage-glow)', border: '1px solid var(--sage-dim)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>
                    🛡 You are currently defending this hypothesis as the active proponent.
                  </p>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Connect your wallet to cross-examine and challenge this statement.
                  </p>
                </div>
              )}
            </div>

            {/* Socratic history timeline */}
            <div className="panel" style={{ padding: '1.5rem' }}>
              <h3 className="display-title" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Socratic Progression</h3>
              
              {selected.progression.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  This hypothesis has never been overthrown. It remains at its original founding stage.
                </p>
              ) : (
                <div className="timeline-track">
                  {selected.progression.map((entry, idx) => (
                    <div key={idx} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                      <div className="timeline-node" />
                      <div style={{
                        background: 'var(--bg-deep)',
                        borderLeft: `3px solid ${entry.toppled_by ? 'var(--terracotta)' : 'var(--sage)'}`,
                        borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span className="badge badge-terracotta" style={{ fontSize: '0.6rem' }}>Stage {entry.stage} Toppled</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            adjudication margin: {entry.margin}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem', fontStyle: 'italic' }}>
                          "{entry.claim}"
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                            Defended by <AddrChip addr={entry.proponent} />
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--terracotta)' }}>
                            Overthrown by <AddrChip addr={entry.toppled_by} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="panel flex-center" style={{ minHeight: 380, flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
            <BalanceIcon size={44} color="var(--border-soft)" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-bright)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Select a Dialectic to Investigate
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
                "The only true wisdom is in knowing you know nothing." Choose a statement to view its validation logs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 📜 Tab 2: DUEL LEDGER
function LedgerView({ ledger, loading }: { ledger: LedgerEvent[]; loading: boolean }) {
  return (
    <div className="panel" style={{ padding: '1.75rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="display-title" style={{ fontSize: '1.3rem', color: 'var(--text-bright)' }}>Dialectic Ledger</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Historical transcript of Socratic duels and LLM Arbiter verdicts, updated in real time.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && ledger.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 95, borderRadius: 'var(--radius-md)' }} />
          ))
        ) : ledger.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', padding: '3rem', textAlign: 'center' }}>
            No duels have been recorded in the circular ledger.
          </p>
        ) : (
          ledger.map((ev, idx) => {
            const isOverthrow = ev.result === 'OVERTHROW';
            return (
              <div key={idx} style={{
                padding: '1.25rem',
                background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isOverthrow ? 'var(--terracotta-dim)' : 'var(--sage-dim)'}`,
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${isOverthrow ? 'badge-terracotta' : 'badge-sage'}`} style={{ fontSize: '0.62rem' }}>
                      {isOverthrow ? 'REFUTED' : 'UPHELD'}
                    </span>
                    <span className="badge badge-dim" style={{ fontSize: '0.62rem' }}>{ev.category}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    margin score: Δ{ev.margin}
                  </div>
                </div>
                
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-bright)' }}>{ev.topic}</h4>
                
                {ev.reasoning && (
                  <p style={{
                    fontSize: '0.84rem', color: 'var(--text-primary)',
                    background: 'var(--bg-panel)', padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)',
                    lineHeight: 1.5, borderLeft: '3px solid var(--gold)',
                  }}>
                    <strong>Socratic Verdict:</strong> {ev.reasoning}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                  <span>
                    Challenger: <AddrChip addr={ev.opponent} />
                  </span>
                  <span>
                    Active Proponent: <AddrChip addr={ev.proponent} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 📊 Tab 3: INSIGHTS & CHAMPION
function InsightsView({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="panel flex-center" style={{ minHeight: 280 }}>
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Core statistics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {[
          ['Total Dialectics Created', stats.arenas, <PillarIcon size={24} key="p" />],
          ['Total Socratic Duels Run', stats.debates, <BalanceIcon size={24} key="b" />],
          ['Total Successful Refutations', stats.overthrows, <ScrollIcon size={24} key="s" />],
        ].map(([label, val, icon]) => (
          <div key={label as string} className="panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--gold-glow)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-bright)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                {val as number}
              </div>
              <div className="label-caps" style={{ fontSize: '0.62rem', marginTop: '2px' }}>{label as string}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Refutation Champion (analytics display) */}
      <div className="panel" style={{ padding: '2rem', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.6rem' }}>🏆</span>
          <div>
            <h3 className="display-title" style={{ fontSize: '1.25rem' }}>The Socratic Champion</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              The most decisive factual refutation accepted into the Elenchus archive.
            </p>
          </div>
        </div>

        {stats.highest_overthrow_margin > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg-deep)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)' }}>
              <div>
                <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--gold)' }}>Dialectic Target</span>
                <h4 style={{ fontSize: '0.98rem', color: 'var(--text-bright)', fontWeight: 600, marginTop: '2px' }}>
                  {stats.highest_overthrow_topic}
                </h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--terracotta)' }}>Refutation Margin</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--terracotta)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '2px' }}>
                  {stats.highest_overthrow_margin} points
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-deep)', borderLeft: '4px solid var(--gold)',
              borderRadius: 'var(--radius-md)', padding: '1.25rem',
            }}>
              <p className="label-caps" style={{ fontSize: '0.62rem', marginBottom: '0.5rem' }}>Arbiter Conviction Note</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{stats.highest_overthrow_reasoning}"
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-dim)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
              No refutations have succeeded yet to crown a Socratic Champion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  CONSENSUS STATUS BANNER
// ─────────────────────────────────────────────
function ConsensusBanner({ txState, onClose }: {
  txState: ReturnType<typeof useTransaction>['state'];
  onClose: () => void;
}) {
  const { phase, hash, liveStatus, draft, error } = txState;
  if (phase === 'idle') return null;

  const isActive = phase === 'wallet' || phase === 'submitted' || phase === 'consensus';
  const isDone   = phase === 'confirmed';
  const isError  = phase === 'error';

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, minWidth: 340, maxWidth: 500, width: '90vw',
    }}>
      <div className={`panel-raised verdict-box`} style={{
        padding: '1.25rem 1.5rem',
        borderColor: isError ? 'rgba(224,90,71,0.3)' : isDone ? 'var(--sage-dim)' : 'var(--border-soft)',
        boxShadow: isError ? '0 0 30px rgba(224,90,71,0.12)' : isDone ? '0 0 30px var(--sage-glow)' : 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            {isActive && <Spinner size={15} />}
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-bright)' }}>
              {phase === 'wallet' && 'Awaiting Wallet Signature…'}
              {phase === 'submitted' && 'Transaction Broadcasted'}
              {phase === 'consensus' && 'Socratic Jury Consensus Running'}
              {phase === 'confirmed' && '⚡ Dialectic Duel Concluded'}
              {phase === 'error' && '✕ Adjudication Failed'}
            </span>
          </div>
          {!isActive && (
            <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 28, height: 28, padding: 0 }} aria-label="Close status">
              <CloseIcon size={12} />
            </button>
          )}
        </div>

        {phase === 'consensus' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <StatusBadge status={liveStatus} />
          </div>
        )}

        {draft && (
          <div style={{
            background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-soft)', padding: '0.875rem', marginBottom: '0.75rem',
          }}>
            <p className="label-caps" style={{ marginBottom: '0.4rem', fontSize: '0.58rem', color: 'var(--gold)' }}>Arbiter Preliminary Draft</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: draft.reasoning ? '0.5rem' : 0 }}>
              <span className={`badge ${draft.verdict === 'REFUTE' ? 'badge-terracotta' : draft.verdict === 'UPHOLD' ? 'badge-sage' : 'badge-dim'}`} style={{ fontSize: '0.62rem' }}>
                {draft.verdict === 'REFUTE' ? 'REFUTE' : 'UPHOLD'}
              </span>
              {draft.margin !== undefined && (
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>margin: {draft.margin}</span>
              )}
            </div>
            {draft.reasoning && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{draft.reasoning}</p>
            )}
          </div>
        )}

        {isError && error && (
          <p style={{ fontSize: '0.82rem', color: 'var(--red)', lineHeight: 1.5, marginBottom: '0.5rem' }}>{error}</p>
        )}

        {hash && (
          <a
            href={`${EXPLORER}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--gold)' }}
          >
            Inspect Tx on Explorer <ExternalIcon size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PROPOSE DIALECTIC DIALOG MODAL
// ─────────────────────────────────────────────
interface ProposeModalProps {
  onClose: () => void;
  onSubmit: (topic: string, category: string, claim: string, url: string) => void;
  busy: boolean;
}

function ProposeModalDialog({ onClose, onSubmit, busy }: ProposeModalProps) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Technology');
  const [claim, setClaim] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!topic.trim()) e.topic = 'Topic title is required.';
    if (topic.trim().length > 100) e.topic = 'Topic must be under 100 characters.';
    if (!category.trim()) e.category = 'Category tag is required.';
    if (!claim.trim()) e.claim = 'Opening hypothesis is required.';
    if (claim.trim().length > 600) e.claim = 'Hypothesis must be under 600 characters.';
    if (!url.trim()) e.url = 'Evidence web link is required.';
    try { new URL(url.trim()); } catch { if (url.trim()) e.url = 'Must be a valid web URL (https://…).'; }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(topic.trim(), category.trim(), claim.trim(), url.trim());
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="propose-modal-title">
      <FocusTrap>
        <div className="modal-box">
          <div className="modal-header">
            <div>
              <h2 id="propose-modal-title" className="display-title" style={{ fontSize: '1.25rem' }}>Propose a Hypothesis</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Found a new dialectic session. Source evidence will be checked on-chain.
              </p>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={busy} aria-label="Close dialog" style={{ padding: 0 }}>
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="field-group">
                <label className="field-label" htmlFor="propose-topic">Topic Title</label>
                <input
                  id="propose-topic"
                  className="field-input"
                  placeholder="e.g. Artificial Intelligence Job Displacement"
                  value={topic}
                  onChange={e => { setTopic(e.target.value); setErrors(p => ({ ...p, topic: '' })); }}
                  maxLength={100}
                  disabled={busy}
                />
                {errors.topic && <span className="field-error-msg">{errors.topic}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="propose-category">Category Tag</label>
                <select
                  id="propose-category"
                  className="field-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={busy}
                  style={{ background: 'var(--bg-deep)' }}
                >
                  <option value="Technology">Technology</option>
                  <option value="Science">Science</option>
                  <option value="Philosophy">Philosophy</option>
                  <option value="Geopolitics">Geopolitics</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="propose-claim">Opening Statement / Claim</label>
                <textarea
                  id="propose-claim"
                  className="field-textarea"
                  placeholder="Provide your precise, factual opening statement…"
                  value={claim}
                  onChange={e => { setClaim(e.target.value); setErrors(p => ({ ...p, claim: '' })); }}
                  maxLength={600}
                  disabled={busy}
                />
                {errors.claim && <span className="field-error-msg">{errors.claim}</span>}
                <span className="field-hint">{claim.length}/600 characters</span>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="propose-url">Evidence Web URL</label>
                <input
                  id="propose-url"
                  className="field-input"
                  type="url"
                  placeholder="https://example.com/source-document"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setErrors(p => ({ ...p, url: '' })); }}
                  disabled={busy}
                />
                {errors.url && <span className="field-error-msg">{errors.url}</span>}
                <span className="field-hint">GenLayer nodes will crawl this web page during consensus evaluation.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy} id="propose-submit-btn">
                {busy ? <><Spinner size={14} color="var(--bg-void)" /> Proposing…</> : 'Establish Hypothesis'}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}

// ─────────────────────────────────────────────
//  CHALLENGE DIALECTIC DIALOG MODAL
// ─────────────────────────────────────────────
interface ClashModalProps {
  arena: Arena;
  onClose: () => void;
  onSubmit: (arenaId: string, claim: string, url: string) => void;
  busy: boolean;
}

function ClashModalDialog({ arena, onClose, onSubmit, busy }: ClashModalProps) {
  const [claim, setClaim] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!claim.trim()) e.claim = 'Challenging antithesis statement is required.';
    if (claim.trim().length > 600) e.claim = 'Claim must be under 600 characters.';
    if (!url.trim()) e.url = 'Supporting web evidence is required.';
    try { new URL(url.trim()); } catch { if (url.trim()) e.url = 'Must be a valid web URL (https://…).'; }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(arena.id, claim.trim(), url.trim());
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="clash-modal-title">
      <FocusTrap>
        <div className="modal-box">
          <div className="modal-header">
            <div>
              <h2 id="clash-modal-title" className="display-title" style={{ fontSize: '1.25rem' }}>Challenge Hypothesis</h2>
              <p className="truncate" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 360 }}>
                Target: {arena.topic}
              </p>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={busy} aria-label="Close dialog" style={{ padding: 0 }}>
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Incumbent hypothesis preview */}
              <div style={{
                background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-soft)', padding: '1rem',
              }}>
                <p className="label-caps" style={{ marginBottom: '0.35rem', fontSize: '0.58rem' }}>Incumbent Thesis</p>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55, fontStyle: 'italic' }}>
                  "{arena.claim.length > 200 ? arena.claim.slice(0, 200) + '…' : arena.claim}"
                </p>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="clash-claim">Your Contending Antithesis</label>
                <textarea
                  id="clash-claim"
                  className="field-textarea"
                  placeholder="State your counter-hypothesis with logical clarity…"
                  value={claim}
                  onChange={e => { setClaim(e.target.value); setErrors(p => ({ ...p, claim: '' })); }}
                  maxLength={600}
                  disabled={busy}
                />
                {errors.claim && <span className="field-error-msg">{errors.claim}</span>}
                <span className="field-hint">{claim.length}/600 characters</span>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="clash-url">Your Evidence URL</label>
                <input
                  id="clash-url"
                  className="field-input"
                  type="url"
                  placeholder="https://example.com/counter-evidence"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setErrors(p => ({ ...p, url: '' })); }}
                  disabled={busy}
                />
                {errors.url && <span className="field-error-msg">{errors.url}</span>}
                <span className="field-hint">
                  The Socratic Arbiter will compare crawled contents of both URLs to issue a verdict.
                </span>
              </div>

              <div style={{ background: 'var(--terracotta-glow)', border: '1px solid rgba(210,125,45,0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--terracotta)', lineHeight: 1.5 }}>
                  ⚠️ Validator consensus and web crawling require transaction gas fees. Connect switch to StudioNet network and obtain GEN tokens.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-danger" disabled={busy} id="clash-submit-btn" style={{ background: 'var(--terracotta)', color: 'var(--bg-void)' }}>
                {busy ? <><Spinner size={14} color="var(--bg-void)" /> Evaluating…</> : <><BalanceIcon size={14} /> Submit Duel</>}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}

// ─────────────────────────────────────────────
//  WALLET UNCONNECTED GATEWAY
// ─────────────────────────────────────────────
function WalletGate({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return (
    <div className="panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-glow)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
        <PillarIcon size={32} />
      </div>
      <div>
        <h2 className="display-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access the Athenian Academy</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
          Connect your Metamask wallet and switch to GenLayer StudioNet network to propose hypotheses, start duels, or review cross-examinations.
        </p>
      </div>
      <button className="btn btn-primary" onClick={wallet.connect} disabled={wallet.connecting || !wallet.hasProvider} id="gate-connect-btn">
        {wallet.connecting ? <Spinner size={14} color="var(--bg-void)" /> : <WalletIcon size={14} />}
        {wallet.hasProvider ? 'Connect MetaMask' : 'Install MetaMask'}
      </button>
      {wallet.error && <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: 2 }}>{wallet.error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
//  MAIN LANDING PAGE
// ─────────────────────────────────────────────
export default function HomePage() {
  const wallet = useWallet();
  const { arenas, ledger, stats, loading, error: dataError, refreshData, setIsBusy } = useContractData();
  const { state: txState, runTx, resetTx } = useTransaction();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const [activeTab, setActiveTab] = useState<'dialectics' | 'ledger' | 'insights'>('dialectics');
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [clashTarget, setClashTarget] = useState<Arena | null>(null);

  const txBusy = txState.phase === 'wallet' || txState.phase === 'submitted' || txState.phase === 'consensus';

  // Sort active dialectics (newest ID first)
  const sortedArenas = useMemo(() => {
    return [...arenas].sort((a, b) => Number(b.id.replace('D', '')) - Number(a.id.replace('D', '')));
  }, [arenas]);

  // Propose hypothesis transaction handler
  const handlePropose = useCallback(async (topic: string, category: string, claim: string, url: string) => {
    if (!wallet.address) return;
    setShowPropose(false);
    setIsBusy(true);
    await runTx({
      account: wallet.address,
      send: (client) => proposeThesis(client, topic, category, claim, url),
      onConfirmed: async () => {
        pushToast('Hypothesis registered! Socratic Dialectic is now active.', 'success');
        await refreshData();
        setIsBusy(false);
      },
      onBusy: setIsBusy,
    });
    if (txState.phase === 'error') {
      pushToast('Proposal failed. Check the status banner details.', 'error');
      setIsBusy(false);
    }
  }, [wallet.address, runTx, refreshData, setIsBusy, pushToast, txState.phase]);

  // Challenge / Refute hypothesis transaction handler
  const handleClash = useCallback(async (arenaId: string, claim: string, url: string) => {
    if (!wallet.address) return;
    setClashTarget(null);
    setIsBusy(true);
    await runTx({
      account: wallet.address,
      send: (client) => clashThesis(client, arenaId, claim, url),
      onConfirmed: async (_, draft) => {
        const verdict = draft?.verdict ?? 'DECIDED';
        const msg = verdict === 'REFUTE'
          ? '⚡ Success! The incumbent hypothesis was REFUTED. You are the new proponent.'
          : '🛡 The Socratic Arbiter UPHELD the incumbent hypothesis.';
        pushToast(msg, verdict === 'REFUTE' ? 'success' : 'warning');
        
        // Refresh detail view
        await refreshData();
        if (selectedArena && selectedArena.id === arenaId) {
          fetchArena(arenaId).then(setSelectedArena).catch(() => null);
        }
        setIsBusy(false);
      },
      onBusy: setIsBusy,
    });
    if (txState.phase === 'error') {
      pushToast('Dialectic challenge failed. Check status banner details.', 'error');
      setIsBusy(false);
    }
  }, [wallet.address, runTx, refreshData, selectedArena, setIsBusy, pushToast, txState.phase]);

  const openClash = useCallback((arena: Arena) => {
    if (!wallet.address) { pushToast('Connect your wallet to cross-examine.', 'warning'); return; }
    setClashTarget(arena);
  }, [wallet.address, pushToast]);

  return (
    <>
      <AppHeader wallet={wallet} />

      <main style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 140px)', padding: '2rem 0 5rem' }}>
        <div className="container">
          
          {/* Editorial Scholastic Hero Banner */}
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h2 className="display-title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>
              "An unexamined life is not worth living."
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
              Welcome to the Elenchus Academy. Test the purity of modern hypotheses against public web facts. Adjudicated on-chain through GenLayer validator consensus.
            </p>
          </div>

          {/* Network Data Sync Error */}
          {dataError && (
            <div style={{
              background: 'var(--red-glow)', border: '1px solid rgba(224,90,71,0.3)',
              borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--red)' }}>{dataError}</p>
              <button className="btn btn-ghost" onClick={refreshData} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                <RefreshIcon size={12} /> Sync Retry
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-container">
            {[
              ['dialectics', '🏛 Dialectic Sessions', <PillarIcon size={14} key="p"/>],
              ['ledger', '📜 Socratic Ledger', <ScrollIcon size={14} key="s"/>],
              ['insights', '📊 Academy Insights', <BalanceIcon size={14} key="b"/>],
            ].map(([id, label, icon]) => (
              <button
                key={id as string}
                className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id as 'dialectics' | 'ledger' | 'insights')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {icon}
                {label as string}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <section>
            {!wallet.address && activeTab === 'dialectics' ? (
              <WalletGate wallet={wallet} />
            ) : (
              <>
                {activeTab === 'dialectics' && (
                  <DialecticsView
                    arenas={sortedArenas}
                    selected={selectedArena}
                    onSelect={setSelectedArena}
                    onPropose={() => {
                      if (!wallet.address) { pushToast('Connect wallet to propose.', 'warning'); return; }
                      setShowPropose(true);
                    }}
                    onClash={openClash}
                    walletAddr={wallet.address}
                    loading={loading}
                  />
                )}

                {activeTab === 'ledger' && (
                  <LedgerView ledger={ledger} loading={loading} />
                )}

                {activeTab === 'insights' && (
                  <InsightsView stats={stats} />
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {/* Write modals */}
      {showPropose && (
        <ProposeModalDialog
          onClose={() => setShowPropose(false)}
          onSubmit={handlePropose}
          busy={txBusy}
        />
      )}
      {clashTarget && (
        <ClashModalDialog
          arena={clashTarget}
          onClose={() => setClashTarget(null)}
          onSubmit={handleClash}
          busy={txBusy}
        />
      )}

      {/* Consensus running tracking banner */}
      <ConsensusBanner txState={txState} onClose={resetTx} />

      {/* Toast Alert stack */}
      <div style={{
        position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 70,
        display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end',
      }} aria-live="polite">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} variant={t.variant} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </>
  );
}
