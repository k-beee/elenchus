import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Default Elenchus contract address (update with your deployed address)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xECdb5b02D0195b614e787307E6e712EECBfAf011';

const keys = [
  process.env.TEST_PRIVATE_KEY_1,
  process.env.TEST_PRIVATE_KEY_2,
  process.env.TEST_PRIVATE_KEY_3,
  process.env.TEST_PRIVATE_KEY_4,
];

// Humanized Socratic dialectic simulations to populate the ledger on-chain
const DEBATES = [
  {
    action: 'propose',
    walletIndex: 0,
    topic: 'The Earth has a solid iron inner core.',
    category: 'Science',
    claim: 'Scientific consensus and seismic wave analyses confirm that the Earth possesses a solid inner core composed primarily of iron and nickel.',
    evidence_url: 'https://en.wikipedia.org/wiki/Earth%27s_inner_core',
  },
  {
    action: 'refute',
    walletIndex: 1,
    topic: 'The Earth has a solid iron inner core.',
    claim: 'Recent high-pressure experiments suggest the inner core may be in a superionic state or have liquid pockets, rather than being completely solid iron.',
    evidence_url: 'https://www.nature.com/articles/d41586-022-00402-x',
  },
  {
    action: 'propose',
    walletIndex: 2,
    topic: 'Mars once had liquid water on its surface.',
    category: 'Science',
    claim: 'Geological formations such as river valleys, deltas, and mineral deposits detected by rovers indicate abundant liquid water flowed on ancient Mars.',
    evidence_url: 'https://en.wikipedia.org/wiki/Water_on_Mars',
  },
  {
    action: 'refute',
    walletIndex: 3,
    topic: 'Mars once had liquid water on its surface.',
    claim: 'Most channel features on Mars were formed by carbon dioxide ice glaciation and debris flows rather than liquid water.',
    evidence_url: 'https://www.nasa.gov/news-release/nasa-spacecraft-data-suggest-flows-on-mars-are-dry-sand-not-water/',
  },
];

async function main() {
  const missingKeys = keys.some((k) => !k);
  if (missingKeys) {
    console.error('❌ Error: Missing private keys in .env.local.');
    console.log('\nPlease add the following to frontend/.env.local:');
    console.log('TEST_PRIVATE_KEY_1=0xf9f09e0ba4f787b4ff4ba945a79531401950122faa10b11b654619a800622a97');
    console.log('TEST_PRIVATE_KEY_2=0x12c79c996651c9dc291c54a94430baf86191a933b63004f2d14455da1d7727b3');
    console.log('TEST_PRIVATE_KEY_3=0x08e90f0e02500006130b2b8b6f1f7a250287270374198aa9cfaa2e16196124fd');
    console.log('TEST_PRIVATE_KEY_4=0xfab97f13d658d3991c9a230b7ed063fa14b9487e432bc778fa859d19c176f1de');
    process.exit(1);
  }

  // Create accounts
  const accounts = keys.map((key, i) => {
    const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
    const account = privateKeyToAccount(cleanKey as `0x${string}`);
    return {
      index: i,
      account,
      client: createClient({ chain: studionet, account }),
    };
  });

  const reader = createClient({ chain: studionet });

  // Verify balances
  console.log('Checking balances...');
  for (const { account } of accounts) {
    const rawBal = await reader.getBalance({ address: account.address });
    const balGen = Number(rawBal) / 1e18;
    console.log(`Wallet address: ${account.address} | Balance: ${balGen.toFixed(4)} GEN`);
    if (balGen < 0.01) {
      console.warn(`⚠️ Warning: Wallet ${account.address} has low balance. Please fund it first.`);
    }
  }

  // Helper to wait for consensus
  const waitTx = async (client, hash) => {
    console.log(`Waiting for transaction receipt: ${hash}...`);
    for (let i = 0; i < 40; i++) {
      const tx = await client.getTransaction({ hash }).catch(() => null);
      if (tx && tx.status) {
        const status = String(tx.status);
        console.log(`Status: ${status}`);
        if (['5', '7', 'ACCEPTED', 'FINALIZED'].includes(status.toUpperCase())) {
          return tx;
        }
        if (['6', '8', '12', '13', 'UNDETERMINED', 'CANCELED', 'TIMEOUT'].includes(status.toUpperCase())) {
          throw new Error(`Transaction failed or resolved undetermined: ${status}`);
        }
      }
      await new Promise((r) => setTimeout(r, 6000));
    }
    throw new Error('Transaction timed out');
  };

  // Helper to fetch matching arena ID by topic
  const getDialecticIdByTopic = async (topic) => {
    const rawDialectics = await reader.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_arenas',
      args: [0],
    });
    const normalized = JSON.parse(JSON.stringify(rawDialectics, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    const list = Array.isArray(normalized) ? normalized : [];
    const match = list.find((a) => a.topic === topic);
    return match ? match.id : null;
  };

  // Execute debate queue
  for (const step of DEBATES) {
    const tester = accounts[step.walletIndex];
    console.log(`\n------------------------------------------------------------`);
    console.log(`Executing: ${step.action.toUpperCase()} | Wallet: ${tester.account.address}`);
    console.log(`Topic: ${step.topic}`);

    if (step.action === 'propose') {
      try {
        const hash = await tester.client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'propose_hypothesis',
          args: [step.topic, step.category, step.claim, step.evidence_url],
          value: 0n,
        });
        await waitTx(tester.client, hash);
        console.log('✅ Hypothesis successfully proposed!');
      } catch (err) {
        console.error(`❌ Failed to propose hypothesis: ${err.message}`);
      }
    } else if (step.action === 'refute') {
      try {
        const dialecticId = await getDialecticIdByTopic(step.topic);
        if (!dialecticId) {
          console.error(`❌ Could not locate dialectic session with topic: "${step.topic}"`);
          continue;
        }
        console.log(`Located Dialectic ID: ${dialecticId}`);
        const hash = await tester.client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'refute_hypothesis',
          args: [dialecticId.toString(), step.claim, step.evidence_url],
          value: 0n,
        });
        await waitTx(tester.client, hash);
        console.log('✅ Hypothesis successfully refuted!');
      } catch (err) {
        console.error(`❌ Failed to execute refutation: ${err.message}`);
      }
    }

    // Wait between transactions to let validator consensus cool down
    await new Promise((r) => setTimeout(r, 8000));
  }

  console.log('\nSimulation completed! Check your frontend or explorer to verify transactions.');
}

main().catch((err) => console.error(err));
