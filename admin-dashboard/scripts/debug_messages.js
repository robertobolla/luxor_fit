
import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = "postgresql://postgres.fseyophzvhafjywyufsa:Hefesto123.@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

async function debugTable() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado.');

    console.log('--- COLUMNS ---');
    const columnsRes = await client.query(`
        SELECT column_name, data_type, ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages'
        ORDER BY ordinal_position
    `);
    console.table(columnsRes.rows);

    console.log('--- CONSTRAINTS ---');
    const pkRes = await client.query(`
        SELECT kcu.column_name, kcu.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = 'messages'
        ORDER BY kcu.ordinal_position
    `);
    console.table(pkRes.rows);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

debugTable();
