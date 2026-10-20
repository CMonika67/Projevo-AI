import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing from .env!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting Projevo AI -> Supabase Data Migration...');
  console.log(`🔗 Connecting to: ${supabaseUrl}`);

  const dbPath = path.join(process.cwd(), 'server_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ server_db.json not found at ${dbPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  let db: any = {};
  try {
    db = JSON.parse(raw);
  } catch (e: any) {
    console.error('❌ Failed to parse server_db.json:', e.message);
    process.exit(1);
  }

  const users = db.users || {};
  const sessions = db.sessions || {};
  const userList = Object.values(users) as any[];
  const sessionEntries = Object.entries(sessions) as [string, any][];

  console.log(`📦 Found ${userList.length} users and ${sessionEntries.length} sessions to migrate.`);

  // 1. Migrate Users
  let usersMigrated = 0;
  for (const user of userList) {
    if (!user.email) continue;
    const { error } = await supabase.from('users').upsert({
      id: user.id || 'usr_' + Math.random().toString(36).substring(2, 10),
      email: user.email.toLowerCase(),
      password_hash: user.passwordHash || null,
      profile: user.profile || {},
      project: user.project || {},
      latest_analysis: user.latestAnalysis || null,
      interview_pools: user.interviewPools || {},
      created_at: user.createdAt || new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) {
      console.error(`⚠️ Failed to migrate user ${user.email}:`, error.message);
      if (error.message.includes('relation "public.users" does not exist')) {
        console.error('\n🛑 ACTION REQUIRED: You must run supabase_schema.sql in your Supabase SQL Editor first!');
        process.exit(1);
      }
    } else {
      usersMigrated++;
      console.log(`  ✓ Migrated user: ${user.email}`);
    }
  }

  // 2. Migrate Sessions
  let sessionsMigrated = 0;
  for (const [token, session] of sessionEntries) {
    if (!session.userId || !session.email) continue;
    const { error } = await supabase.from('sessions').upsert({
      token,
      user_id: session.userId,
      email: session.email.toLowerCase(),
      created_at: session.createdAt || Date.now(),
      expires_at: session.expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000)
    }, { onConflict: 'token' });

    if (!error) {
      sessionsMigrated++;
    }
  }

  console.log('\n=========================================');
  console.log('🎉 Migration Run Complete!');
  console.log(`👥 Users Synced: ${usersMigrated} / ${userList.length}`);
  console.log(`🔑 Sessions Synced: ${sessionsMigrated} / ${sessionEntries.length}`);
  console.log('=========================================\n');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
