import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Credenciales de Producción
const CONNECTION_STRING = "postgresql://postgres.fseyophzvhafjywyufsa:Hefesto123.@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

// Output Files
const FILE_SETUP = path.join(process.cwd(), '00_setup.sql');
const FILE_TABLES = path.join(process.cwd(), '01_tables.sql');
const FILE_FUNCTIONS = path.join(process.cwd(), '02_functions.sql');
const FILE_RLS = path.join(process.cwd(), '03_rls.sql');

const LOG_FILE = path.join(process.cwd(), 'extraction_debug.log');

function log(msg) {
  try {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
  } catch (e) {}
}

async function extractSchema() {
  // Clear log
  fs.writeFileSync(LOG_FILE, '');
  
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    log('🔌 Conectando a la base de datos de producción...');
    await client.connect();
    log('✅ Conectado.');

    // Buffers for each file
    let setupSql = "-- 00_SETUP: Limpieza, Extensiones, Tipos y Secuencias\n";
    setupSql += "-- FECHA: " + new Date().toISOString() + "\n\n";
    setupSql += "SET search_path = public, temp;\n\n";

    let tablesSql = "-- 01_TABLES: Creación de Tablas\n";
    tablesSql += "SET search_path = public, temp;\n\n";
    
    let functionsSql = "-- 02_FUNCTIONS: Funciones y Triggers\n";
    functionsSql += "SET search_path = public, temp;\n\n";

    let rlsSql = "-- 03_RLS: Políticas de Seguridad (RLS)\n";
    rlsSql += "SET search_path = public, temp;\n\n";

    // --- 1. SETUP (DROP, EXTENSIONS, TYPES, SEQUENCES) ---
    
    // 1.1 Extensions
    setupSql += "-- EXTENSIONS --\n";
    log('🧩 Extrayendo extensiones...');
    const extensionsRes = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname NOT IN ('plpgsql') 
    `);
    // uuid-ossp is usually safer to include explicitly or let the DB handle it if installed.
    // We'll extract what's there.
    for (const ext of extensionsRes.rows) {
       setupSql += `CREATE EXTENSION IF NOT EXISTS "${ext.extname}";\n`;
    }
    setupSql += "\n";

    // 1.2 Types (Enums)
    setupSql += "-- TYPES --\n";
    log('🎨 Extrayendo tipos (ENUMs)...');
    const enumsRes = await client.query(`
      SELECT t.typname, string_agg(quote_literal(e.enumlabel), ', ') as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON t.typnamespace = n.oid 
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);

    for (const type of enumsRes.rows) {
        setupSql += `DO $$ BEGIN
    CREATE TYPE public.${type.typname} AS ENUM (${type.enum_values});
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;\n\n`;
    }

    // 1.3 Sequences
    setupSql += "-- SEQUENCES --\n";
    log('🔢 Extrayendo secuencias...');
    const sequencesRes = await client.query(`
      SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment, cycle_option
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesRes.rows) {
        log(`   - Procesando secuencia: ${seq.sequence_name}`);
        setupSql += `CREATE SEQUENCE IF NOT EXISTS public.${seq.sequence_name} INCREMENT ${seq.increment} START ${seq.start_value} MINVALUE ${seq.minimum_value} MAXVALUE ${seq.maximum_value};\n`;
    }
    setupSql += '\n';

    // --- 2. TABLES (DROP & CREATE) ---
    
    log('📄 Extrayendo tablas...');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    setupSql += "-- DROP TABLES (CLEANUP) --\n";
    for (const table of tables) {
        // Add Drops to Setup to ensure clean state
        setupSql += `DROP TABLE IF EXISTS public.${table} CASCADE;\n`;
    }
    setupSql += "\n";

    for (const table of tables) {
      try {
        log(`   - Procesando tabla: ${table}`);
        tablesSql += `-- TABLA: ${table}\n`;
        // Idempotency: Drop table if exists to allow re-running 01_tables.sql
        tablesSql += `DROP TABLE IF EXISTS public.${table} CASCADE;\n`;
        tablesSql += `CREATE TABLE public.${table} (\n`;
        
        // Columns
        const columnsRes = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, udt_name
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [table]);

        const columns = columnsRes.rows.map(col => {
            let type = col.data_type;
            
            if (col.data_type === 'character varying') {
                type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
            } else if (col.data_type === 'USER-DEFINED') {
                type = col.udt_name; 
            } else if (col.data_type === 'ARRAY') {
                if (col.udt_name) {
                    let elemType = col.udt_name.startsWith('_') ? col.udt_name.substring(1) : col.udt_name;
                    type = `${elemType}[]`;
                } else {
                    type = 'TEXT[]';
                }
            }

            let line = `  ${col.column_name} ${type}`;
            
            if (col.is_nullable === 'NO') line += ' NOT NULL';
            
            if (col.column_default) {
                let defaultVal = col.column_default;
                
                // 1. Convert nextval to IDENTITY
                if (defaultVal.includes('nextval')) {
                     line += ' GENERATED BY DEFAULT AS IDENTITY';
                } 
                // 2. Normalize UUIDs
                else {
                    if (defaultVal.includes('uuid_generate_v4()')) {
                        defaultVal = 'gen_random_uuid()';
                    }
                    line += ` DEFAULT ${defaultVal}`;
                }
            }
            
            return line;
        });

        // Primary Key
        const pkRes = await client.query(`
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_name = $1
            ORDER BY kcu.ordinal_position
        `, [table]);

        let uniquePks = [...new Set(pkRes.rows.map(r => r.column_name))];
        const validColumns = new Set(columnsRes.rows.map(c => c.column_name));
        uniquePks = uniquePks.filter(pk => validColumns.has(pk));

        if (uniquePks.length > 0) {
            columns.push(`  PRIMARY KEY (${uniquePks.join(', ')})`);
        }

        tablesSql += columns.join(',\n');
        tablesSql += "\n);\n\n";
        
        // Enable RLS
        tablesSql += `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n\n`;

      } catch (e) {
         log(`❌ Error procesando tabla ${table}: ${e.message}`);
      }
    }

    // --- 3. FUNCTIONS ---
    log('⚡ Extrayendo funciones...');
    const funcsRes = await client.query(`
      SELECT p.proname as name,
             pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      WHERE n.nspname = 'public'
      AND l.lanname NOT IN ('c', 'internal')
      AND d.objid IS NULL
    `);
    
    for (const func of funcsRes.rows) {
        log(`   - Procesando función: ${func.name}`);
        let def = func.definition;
        
        // Inject search_path for PLPGSQL
        if (def.includes('LANGUAGE plpgsql') && !def.includes('SET search_path')) {
             def = def.replace(/LANGUAGE plpgsql/i, "LANGUAGE plpgsql SET search_path TO 'public', 'temp'");
        }
        
        functionsSql += `${def};\n\n`;
    }

    // --- 4. RLS ---
    log('🛡️ Extrayendo políticas RLS...');
    const policiesRes = await client.query(`
      SELECT tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `);

    for (const policy of policiesRes.rows) {
        rlsSql += `DROP POLICY IF EXISTS "${policy.policyname}" ON public.${policy.tablename};\n`;
        rlsSql += `CREATE POLICY "${policy.policyname}" ON public.${policy.tablename}\n`;
        rlsSql += `FOR ${policy.cmd} `;
        
        let roles = policy.roles;
        if (!Array.isArray(roles)) {
             if (typeof roles === 'string') {
                 roles = roles.replace(/^{|}$/g, '').split(',');
             } else {
                 roles = ['PUBLIC'];
             }
        }
        rlsSql += `TO ${roles.join(', ')} `;
        
        if (policy.qual) {
            rlsSql += `USING (${policy.qual}) `;
        }
        if (policy.with_check) {
            rlsSql += `WITH CHECK (${policy.with_check}) `;
        }
        rlsSql += ";\n\n";
    }

    // Write Files
    fs.writeFileSync(FILE_SETUP, setupSql);
    log(`✅ Guardado: ${FILE_SETUP}`);
    
    fs.writeFileSync(FILE_TABLES, tablesSql);
    log(`✅ Guardado: ${FILE_TABLES}`);
    
    fs.writeFileSync(FILE_FUNCTIONS, functionsSql);
    log(`✅ Guardado: ${FILE_FUNCTIONS}`);
    
    fs.writeFileSync(FILE_RLS, rlsSql);
    log(`✅ Guardado: ${FILE_RLS}`);

  } catch (err) {
    log('❌ Error fatal: ' + err.message + '\n' + err.stack);
  } finally {
    await client.end();
  }
}

extractSchema();
