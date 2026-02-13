export interface RestorationJob {
    id: string;
    created_at: string;
    blurred_image_path: string;
    original_image_path?: string;
    restored_image_path?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    current_step?: string;
    logs?: string[];
    completed_at?: string;
    error_log?: string;
    algorithm?: string;
    parameters?: any;
}

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    type: 'speed' | 'quality' | 'balanced';
    tags: string[];
}

export interface BenchmarkResult {
    id: string;
    job_id: string;
    model_name: string;
    psnr: number;
    ssim: number;
    created_at: string;
}

export interface RestorationParameters {
    method: 'deconvolution' | 'gan' | 'pinn' | 'swinir' | 'real-esrgan' | 'optical-diffusion';
    iterations?: number;
    learning_rate?: number;
    denoise_level?: number;
}
