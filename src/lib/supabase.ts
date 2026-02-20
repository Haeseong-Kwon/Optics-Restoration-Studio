import { createClient } from '@supabase/supabase-js';

// Mock Supabase for demo recording if env vars are missing
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

const mockSupabase = {
    storage: {
        from: () => ({
            upload: async () => ({ data: { path: 'demo.png' }, error: null }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: path.startsWith('http') ? path : `https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1000` } }),
            download: async () => new Blob()
        })
    },
    from: () => ({
        insert: () => ({
            select: () => ({
                single: async () => ({
                    data: {
                        id: 'demo-job-id',
                        status: 'pending',
                        blurred_image_path: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1000',
                        algorithm: 'wiener_deconvolution_v1'
                    },
                    error: null
                })
            })
        }),
        select: () => ({
            eq: () => ({
                single: async () => {
                    // Simulate completion after a few seconds
                    return {
                        data: {
                            id: 'demo-job-id',
                            status: 'completed',
                            blurred_image_path: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1000',
                            restored_image_path: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1000',
                            algorithm: 'wiener_deconvolution_v1'
                        },
                        error: null
                    };
                }
            })
        })
    })
} as any;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = isDemoMode ? mockSupabase : createClient(supabaseUrl, supabaseAnonKey);
