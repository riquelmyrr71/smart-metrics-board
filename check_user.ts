
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgipzfsoeubdysuoqiml.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaXB6ZnNvZXViZHlzdW9xaW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjIzODksImV4cCI6MjA4MDE5ODM4OX0.3HJXDL8Yv-5FlofGSX2bpRvhWsT5H4zl5ePIdlxFBzo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'curliagencia@businesscenter.com')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('User found:', data)
    }
}

checkUser()
