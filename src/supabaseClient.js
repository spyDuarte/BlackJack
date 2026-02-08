
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xelwlekpuztdtfbvipky.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbHdsZWtwdXp0ZHRmYnZpcGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTkzOTksImV4cCI6MjA4NjEzNTM5OX0.vVAPjCL2BA7Np3l5LyJ4R-jST0I8c3-gYDE0FzH_FCk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
