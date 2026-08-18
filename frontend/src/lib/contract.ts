import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Elenchus contract address — loaded from env or left to be configured by the user
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xe4404A51d6f78Cf05250eD9FBf7197E4385516f4'
) as `0x${string}`;

export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const FAUCET = 'https://testnet-faucet.genlayer.foundation/';
export const DOCS = 'https://docs.genlayer.com';

export const readClient = createClient({ chain: studionet });

export const makeWalletClient = (account: `0x${string}`) =>
  createClient({ chain: studionet, account });

export type WalletClient = ReturnType<typeof makeWalletClient>;

// ---- Types reflecting Elenchus contract state structures ------------------

export interface ProgressionEntry {
  proponent: string;
  claim: string;
  evidence_url: string;
  defenses: number;
  stage: number;
  toppled_by: string;
  margin: number;
}

export interface Arena {
  id: string;
  topic: string;
  category: string; // New categorization field
  proponent: string;
  claim: string;
  evidence_url: string;
  founder: string;
  progression_index: number;
  defenses: number;
  clashes: number;
  progression: ProgressionEntry[];
}

export interface LedgerEvent {
  arena_id: string;
  topic: string;
  category: string; // New categorization field
  opponent: string;
  result: 'OVERTHROW' | 'DEFEND' | string;
  margin: number;
  reasoning: string;
  proponent: string;
}

export interface Stats {
  arenas: number;
  debates: number;
  overthrows: number;
  highest_overthrow_margin: number;
  highest_overthrow_id: string;
  highest_overthrow_topic: string;
  highest_overthrow_reasoning: string;
}

// ---- Data Normalization Helpers (BigInts/Maps -> JSON primitives) ---------

function toRecord<T>(value: unknown): T {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = normalize(v);
    return obj as T;
  }
  return value as T;
}

function normalize(value: unknown): unknown {
  if (value instanceof Map) return toRecord(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function asProgressionEntry(raw: unknown): ProgressionEntry {
  const r = toRecord<Record<string, unknown>>(raw);
  return {
    proponent: String(r.proponent ?? ''),
    claim: String(r.claim ?? ''),
    evidence_url: String(r.evidence_url ?? ''),
    defenses: num(r.defenses),
    stage: num(r.stage),
    toppled_by: String(r.toppled_by ?? ''),
    margin: num(r.margin),
  };
}

function asArena(raw: unknown): Arena {
  const r = toRecord<Record<string, unknown>>(raw);
  const progressionRaw = normalize(r.progression);
  const progression = Array.isArray(progressionRaw) ? progressionRaw.map(asProgressionEntry) : [];
  return {
    id: String(r.id ?? ''),
    topic: String(r.topic ?? ''),
    category: String(r.category ?? 'General'),
    proponent: String(r.proponent ?? ''),
    claim: String(r.claim ?? ''),
    evidence_url: String(r.evidence_url ?? ''),
    founder: String(r.founder ?? ''),
    progression_index: num(r.progression_index),
    defenses: num(r.defenses),
    clashes: num(r.clashes),
    progression,
  };
}

function asLedgerEvent(raw: unknown): LedgerEvent {
  const r = toRecord<Record<string, unknown>>(raw);
  return {
    arena_id: String(r.arena_id ?? ''),
    topic: String(r.topic ?? ''),
    category: String(r.category ?? 'General'),
    opponent: String(r.opponent ?? ''),
    result: String(r.result ?? ''),
    margin: num(r.margin),
    reasoning: String(r.reasoning ?? ''),
    proponent: String(r.proponent ?? ''),
  };
}

// ---- Network RPC Resiliency retry ----------------------------------------

export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!/rate limit|429|timeout|network|fetch|too many/i.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw last;
}

// ---- Public Read Contract Views ------------------------------------------

export async function fetchArenas(start = 0): Promise<Arena[]> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      // Map to smart contract get_arenas
      functionName: 'get_arenas',
      args: [start],
    }),
  );
  const arr = (normalize(raw) as unknown[]) ?? [];
  return arr.map(asArena);
}

export async function fetchArena(id: string): Promise<Arena> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_arena',
      args: [id],
    }),
  );
  return asArena(normalize(raw));
}

export async function fetchLedger(start = 0): Promise<LedgerEvent[]> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_ledger',
      args: [start],
    }),
  );
  const arr = (normalize(raw) as unknown[]) ?? [];
  return arr.map(asLedgerEvent);
}

export async function fetchStats(): Promise<Stats> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_stats',
      args: [],
    }),
  );
  const r = toRecord<Record<string, unknown>>(normalize(raw));
  return {
    arenas: num(r.arenas),
    debates: num(r.debates),
    overthrows: num(r.overthrows),
    highest_overthrow_margin: num(r.highest_overthrow_margin),
    highest_overthrow_id: String(r.highest_overthrow_id ?? ''),
    highest_overthrow_topic: String(r.highest_overthrow_topic ?? ''),
    highest_overthrow_reasoning: String(r.highest_overthrow_reasoning ?? ''),
  };
}

// ---- Write Contract Transactions ----------------------------------------

export function proposeThesis(client: WalletClient, topic: string, category: string, openingClaim: string, evidenceUrl: string) {
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'propose_hypothesis',
    args: [topic, category, openingClaim, evidenceUrl],
    value: 0n,
  });
}

export function clashThesis(
  client: WalletClient,
  arenaId: string,
  contenderClaim: string,
  contenderEvidenceUrl: string,
) {
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'refute_hypothesis',
    args: [arenaId, contenderClaim, contenderEvidenceUrl],
    value: 0n,
  });
}

// ---- Pre-Consensus Transaction Peeking -----------------------------------

const STATUS_NAME: Record<string, string> = {
  '1': 'PENDING',
  '2': 'PROPOSING',
  '3': 'COMMITTING',
  '4': 'REVEALING',
  '5': 'ACCEPTED',
  '6': 'UNDETERMINED',
  '7': 'FINALIZED',
  '8': 'CANCELED',
  '12': 'VALIDATORS_TIMEOUT',
  '13': 'LEADER_TIMEOUT',
  '14': 'TIMEOUT',
};

export const statusName = (s: unknown): string =>
  STATUS_NAME[String(s)] ?? String(s ?? 'PENDING').toUpperCase();

const TERMINAL = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED']);

export interface LeaderDraft {
  verdict: string;
  margin?: number;
  reasoning?: string;
}

function pick(obj: unknown, key: string): unknown {
  if (obj instanceof Map) return obj.get(key);
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

function parseDraft(value: unknown): LeaderDraft | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!('verdict' in v)) return null;
  return {
    verdict: String(v.verdict ?? '').toUpperCase(),
    margin: 'margin' in v ? num(v.margin) : undefined,
    reasoning: 'reasoning' in v ? String(v.reasoning ?? '') : 'note' in v ? String(v.note ?? '') : undefined,
  };
}

function scanForDraft(text: string): LeaderDraft | null {
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] !== '{') continue;
    try {
      const obj = JSON.parse(text.slice(i));
      const draft = parseDraft(obj);
      if (draft) return draft;
    } catch {
      /* continue scan */
    }
  }
  return null;
}

export function extractLeaderDraft(tx: unknown): LeaderDraft | null {
  try {
    const receipts = pick(pick(tx, 'consensus_data'), 'leader_receipt');
    const first = Array.isArray(receipts) ? receipts[0] : receipts;
    const payload = pick(pick(first, 'eq_outputs'), '0');
    if (payload == null) return null;

    if (typeof payload === 'object') {
      const readable = pick(payload, 'readable') ?? pick(payload, 'payload');
      if (typeof readable === 'string') {
        try {
          const direct = parseDraft(JSON.parse(readable));
          if (direct) return direct;
        } catch {
          /* try scan */
        }
        const scanned = scanForDraft(readable);
        if (scanned) return scanned;
      }
      const inline = parseDraft(payload);
      if (inline) return inline;
      return null;
    }

    if (typeof payload === 'string' && payload.length > 0) {
      let text = payload;
      try {
        text = atob(payload);
      } catch {
        /* try direct text */
      }
      return scanForDraft(text);
    }
    return null;
  } catch {
    return null;
  }
}

export async function pollUntilDecided(
  client: WalletClient,
  hash: `0x${string}`,
  onUpdate?: (status: string, draft: LeaderDraft | null) => void,
): Promise<{ status: string; draft: LeaderDraft | null }> {
  let draft: LeaderDraft | null = null;
  for (let i = 0; i < 150; i++) {
    const tx = await client
      .getTransaction({ hash } as Parameters<typeof client.getTransaction>[0])
      .catch(() => null);
    const status = statusName(tx ? (tx as { status?: unknown }).status : 'PENDING');
    draft = extractLeaderDraft(tx) ?? draft;
    onUpdate?.(status, draft);
    if (TERMINAL.has(status)) return { status, draft };
    await new Promise((r) => setTimeout(r, 6000));
  }
  return { status: 'TIMEOUT', draft };
}
