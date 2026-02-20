import { createClient } from '@supabase/supabase-js';

// Mock Supabase for demo recording if env vars are missing
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

const SHARP_IMAGE_URL = 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=1200';
const BLURRED_IMAGE_URL = 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=1200&blur=80';

// Persistent state for the mock
let mockJobState = {
    status: 'pending' as 'pending' | 'processing' | 'completed',
    startTime: 0,
};

const mockSupabase = {
    storage: {
        from: () => ({
            upload: async () => ({ data: { path: 'demo.png' }, error: null }),
            getPublicUrl: (path: string) => ({
                data: {
                    publicUrl: path.includes('restored') ? SHARP_IMAGE_URL : BLURRED_IMAGE_URL
                }
            }),
            download: async () => new Blob()
        })
    },
    from: () => ({
        insert: () => ({
            select: () => ({
                single: async () => {
                    mockJobState = { status: 'pending', startTime: Date.now() };
                    return {
                        data: {
                            id: 'demo-job-id',
                            status: 'pending',
                            blurred_image_path: 'blurred/demo.png',
                            algorithm: 'wiener_deconvolution_v1'
                        },
                        error: null
                    };
                }
            })
        }),
        select: () => ({
            eq: () => ({
                single: async () => {
                    const elapsed = Date.now() - mockJobState.startTime;
                    if (elapsed > 3000) {
                        mockJobState.status = 'completed';
                    } else if (elapsed > 1000) {
                        mockJobState.status = 'processing';
                    }

                    return {
                        data: {
                            id: 'demo-job-id',
                            status: mockJobState.status,
                            blurred_image_path: 'blurred/demo.png',
                            restored_image_path: 'restored/demo.png',
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
