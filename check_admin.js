const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fseyophzvhafjywyufsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZXlvcGh6dmhhZmp5d3l1ZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODkxNzAsImV4cCI6MjA4NjE0OTE3MH0.M55lP4XsP8bi05X95SIhGzO8YmeJonjEgspgp49JVmk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  const email = 'segao1999@gmail.com';
  console.log(`Checking DB for email: ${email}`);

  const { data: adminRoles, error: adminErr } = await supabase
    .from('admin_roles')
    .select('*')
    .ilike('email', email);

  if (adminErr) console.error('Error fetching admin roles:', adminErr);
  else console.log('Admin Roles:', JSON.stringify(adminRoles, null, 2));

  const { data: userProfiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('email', email);

  if (profileErr) console.error('Error fetching user profiles:', profileErr);
  else console.log('User Profiles:', JSON.stringify(userProfiles, null, 2));
}

checkAdmin();
