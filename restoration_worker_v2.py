
# restoration_worker_v2.py

import os
import time
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim
from PIL import Image
import io as python_io
import torch

from dotenv import load_dotenv
from supabase import create_client, Client

# 사용자 정의 모듈 임포트
from inference_engine import ImageRestorer

# IQA (Image Quality Assessment) 라이브러리
try:
    import pyiqa
except ImportError:
    raise ImportError("pyiqa 라이브러리가 설치되지 않았습니다. 'pip install pyiqa'로 설치해주세요.")

# --- Configuration ---
load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in the .env.local file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
IMAGE_STORAGE_BUCKET = "images"

# --- Model & Metric Definitions ---

# 사용자가 Supabase 'restoration_jobs' 테이블에 'model_id'로 지정할 키
# 이 설정은 데이터베이스 스키마와 밀접하게 연관됩니다.
MODELS_CONFIG = {
    "swinir_real_sr_x4": {
        "path": "model_weights/003_realSR_BSRGAN_DFO_s64w8_SwinIR-S_x4_GAN.pth",
        # SwinIR 공식 Repo에서 제공하는 Real-SR (small) 모델의 설정값
        "config": {
            'upscale': 4,
            'in_chans': 3,
            'img_size': 64,
            'window_size': 8,
            'img_range': 1.,
            'depths': [6, 6, 6, 6, 6, 6],
            'embed_dim': 180,
            'num_heads': [6, 6, 6, 6, 6, 6],
            'mlp_ratio': 2,
            'upsampler': 'real-esrgan',
            'resi_connection': '1conv'
        }
    }
}

# --- Metric Calculation ---

def calculate_metrics(original_img_bytes: bytes, restored_img_array: np.ndarray, device: torch.device):
    """PSNR, SSIM, NIQE 품질 지표를 계산합니다."""
    metrics = {}
    try:
        # 원본 이미지 로드 및 전처리
        original_pil = Image.open(python_io.BytesIO(original_img_bytes)).convert('RGB')
        original_array = np.array(original_pil)

        # 복원된 이미지와 크기 맞춤 (원본을 기준으로)
        restored_pil = Image.fromarray(restored_img_array)
        if original_pil.size != restored_pil.size:
            restored_pil = restored_pil.resize(original_pil.size, Image.LANCZOS)
        
        restored_array_resized = np.array(restored_pil)
        
        # PSNR 계산
        metrics['psnr'] = psnr(original_array, restored_array_resized)
        
        # SSIM 계산
        metrics['ssim'] = ssim(original_array, restored_array_resized, multichannel=True, channel_axis=2, data_range=255)

        # NIQE 계산 (GPU 활용)
        niqe_metric = pyiqa.create_metric('niqe', device=device)
        
        # pyiqa 입력 형식에 맞게 Tensor로 변환
        restored_tensor = torch.tensor(restored_array_resized).permute(2, 0, 1).unsqueeze(0) / 255.
        
        with torch.no_grad():
            niqe_score = niqe_metric(restored_tensor)
        metrics['niqe'] = niqe_score.item()

    except Exception as e:
        print(f"품질 지표 계산 중 오류 발생: {e}")
    
    return metrics

# --- Main Worker Logic ---

def main():
    """지능형 복원 워커 v2 메인 로직"""
    job = None
    try:
        # 1. 처리할 작업 가져오기
        response = supabase.table("restoration_jobs").select("*").eq("status", "pending").limit(1).execute()
        if not response.data:
            print("처리할 작업이 없습니다.")
            return
        
        job = response.data[0]
        job_id = job['id']
        
        # 2. 작업 상태를 'processing'으로 변경
        supabase.table("restoration_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        print(f"
작업 ID {job_id} 처리 시작...")
        
        # 3. 작업에 맞는 모델 선택 및 로드
        model_id = job.get('model_id') # Supabase 테이블에 'model_id' 컬럼이 있어야 함
        if not model_id or model_id not in MODELS_CONFIG:
            raise ValueError(f"'{model_id}'는 지원되지 않는 모델 ID입니다.")
            
        model_info = MODELS_CONFIG[model_id]
        print(f"모델 '{model_id}' 로드 중...")
        restorer = ImageRestorer(model_path=model_info['path'], model_config=model_info['config'])

        # 4. 이미지 다운로드 및 복원
        blurred_image_path = job.get("blurred_image_path")
        if not blurred_image_path:
            raise ValueError("블러 처리된 이미지 경로가 없습니다.")
        
        print(f"이미지 다운로드: {blurred_image_path}")
        image_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=blurred_image_path)
        
        print("AI 모델 추론 시작...")
        start_time = time.time()
        restored_image_array = restorer.inference(image_bytes)
        print(f"추론 완료. (소요 시간: {time.time() - start_time:.2f}초)")

        # 5. 복원된 이미지 업로드
        restored_filename = f"restored_{model_id}_{os.path.basename(blurred_image_path)}_{int(time.time())}.png"
        restored_path = os.path.join(os.path.dirname(blurred_image_path), restored_filename)
        
        output_io = python_io.BytesIO()
        Image.fromarray(restored_image_array).save(output_io, format='PNG')
        output_io.seek(0)

        print(f"복원된 이미지 업로드: {restored_path}")
        supabase.storage.from_(IMAGE_STORAGE_BUCKET).upload(
            path=restored_path,
            file=output_io.read(),
            file_options={"content-type": "image/png"}
        )

        # 6. 품질 지표 계산 및 저장
        metrics = {}
        if job.get("original_image_path"):
            print("품질 지표 계산 중...")
            original_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=job["original_image_path"])
            metrics = calculate_metrics(original_bytes, restored_image_array, restorer.device)
            print(f"계산된 지표: PSNR={metrics.get('psnr'):.2f}, SSIM={metrics.get('ssim'):.4f}, NIQE={metrics.get('niqe'):.2f}")
            
            # model_benchmarks 테이블에 저장
            supabase.table("model_benchmarks").insert({
                "job_id": job_id,
                "model_name": model_id,
                "psnr": metrics.get('psnr'),
                "ssim": metrics.get('ssim'),
                "niqe": metrics.get('niqe'),
            }).execute()

        # 7. 작업 최종 완료 처리
        supabase.table("restoration_jobs").update({
            "status": "completed",
            "restored_image_path": restored_path,
            "completed_at": "now()"
        }).eq("id", job_id).execute()
        
        print(f"작업 ID {job_id} 성공적으로 완료.")

    except Exception as e:
        print(f"작업 처리 중 심각한 오류 발생: {e}")
        if job:
            supabase.table("restoration_jobs").update({
                "status": "failed",
                "error_log": str(e)
            }).eq("id", job['id']).execute()
            print(f"작업 ID {job['id']}를 'failed' 상태로 변경했습니다.")

if __name__ == "__main__":
    main()
