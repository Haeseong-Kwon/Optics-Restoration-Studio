
# batch_worker.py

import os
import time
import numpy as np
from PIL import Image
import io as python_io
import torch
import concurrent.futures

from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

# 사용자 정의 모듈 및 외부 라이브러리
from inference_engine import ImageRestorer
import pyiqa
from reporting_tool import calculate_metrics # reporting_tool.py에서 함수 재사용

# --- Configuration ---
load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in .env.local")

# API 타임아웃을 위한 클라이언트 옵션 설정
opts = ClientOptions(postgrest_client_timeout=60, storage_client_timeout=60)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=opts)

IMAGE_STORAGE_BUCKET = "images"
MAX_WORKERS = 4  # 동시에 처리할 작업 수 (시스템 사양에 맞게 조절)
BATCH_SIZE = 8   # 한 번에 가져올 작업 수

# 이전에 정의된 모델 설정을 그대로 사용
MODELS_CONFIG = {
    "swinir_real_sr_x4": {
        "path": "model_weights/003_realSR_BSRGAN_DFO_s64w8_SwinIR-S_x4_GAN.pth",
        "config": {
            'upscale': 4, 'in_chans': 3, 'img_size': 64, 'window_size': 8, 'img_range': 1.,
            'depths': [6, 6, 6, 6, 6, 6], 'embed_dim': 180, 'num_heads': [6, 6, 6, 6, 6, 6],
            'mlp_ratio': 2, 'upsampler': 'real-esrgan', 'resi_connection': '1conv'
        }
    }
}

# --- Single Job Processing Logic ---

def process_job(job: dict) -> str:
    """단일 복원 작업을 처리하는 함수 (스레드에서 실행됨)"""
    job_id = job['id']
    start_time = time.time()
    
    try:
        print(f"[Job {job_id}] 처리 시작...")

        # 1. 모델 선택 및 로드
        model_id = job.get('model_id')
        if not model_id or model_id not in MODELS_CONFIG:
            raise ValueError(f"지원되지 않는 모델 ID: '{model_id}'")
        
        model_info = MODELS_CONFIG[model_id]
        restorer = ImageRestorer(model_path=model_info['path'], model_config=model_info['config'])
        
        # 2. 이미지 다운로드
        blurred_image_path = job.get("blurred_image_path")
        if not blurred_image_path:
            raise ValueError("블러 이미지 경로가 없습니다.")
        
        image_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=blurred_image_path)

                

                # 3. 이미지 유효성 검사

                try:

                    # 이미지를 열어봄으로써 기본적인 유효성 검사 수행

                    Image.open(python_io.BytesIO(image_bytes)).verify()

                except Exception as img_exc:

                    # PIL.UnidentifiedImageError 등 다양한 이미지 관련 예외 처리

                    raise ValueError(f"잘못된 이미지 형식 또는 손상된 파일입니다: {img_exc}")

        

                # 4. AI 모델 추론

                restored_image_array = restorer.inference(image_bytes)

                

                # 5. 결과 업로드

                restored_filename = f"restored_{model_id}_{os.path.basename(blurred_image_path)}_{int(time.time())}.png"

                restored_path = os.path.join(os.path.dirname(blurred_image_path), restored_filename)

                

                output_io = python_io.BytesIO()

                Image.fromarray(restored_image_array).save(output_io, format='PNG')

                output_io.seek(0)

                

                supabase.storage.from_(IMAGE_STORAGE_BUCKET).upload(

                    path=restored_path,

                    file=output_io.read(),

                    file_options={"content-type": "image/png"}

                )

        

                # 6. 벤치마크 계산 및 저장

                if job.get("original_image_path"):

                    original_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=job["original_image_path"])

                    metrics = calculate_metrics(original_bytes, restored_image_array, restorer.device)

                    

                    supabase.table("model_benchmarks").insert({

                        "job_id": job_id, "model_name": model_id,

                        "psnr": metrics.get('psnr'), "ssim": metrics.get('ssim'), "niqe": metrics.get('niqe'),

                    }).execute()

                    print(f"[Job {job_id}] 품질 지표: PSNR={metrics.get('psnr'):.2f}, SSIM={metrics.get('ssim'):.4f}, NIQE={metrics.get('niqe'):.2f}")

        

                # 7. 작업 상태 'completed'로 업데이트

                supabase.table("restoration_jobs").update({

                    "status": "completed",

                    "restored_image_path": restored_path,

                    "completed_at": "now()"

                }).eq("id", job_id).execute()

                

                elapsed = time.time() - start_time

                return f"[Job {job_id}] 성공적으로 완료 (소요 시간: {elapsed:.2f}초)"

        

            except Exception as e:

                # 8. 견고한 오류 처리

                error_message = f"오류 발생: {type(e).__name__}: {str(e)}"

                print(f"[Job {job_id}] 실패. {error_message}")

        

                # 메모리 부족 오류 식별 (PyTorch MPS/CUDA에서 흔히 발생)

                if isinstance(e, torch.cuda.OutOfMemoryError) or 'out of memory' in str(e).lower():

                    error_message = f"메모리 부족(OOM): {str(e)}"

                

                supabase.table("restoration_jobs").update({

                    "status": "failed",

                    "error_log": error_message

                }).eq("id", job_id).execute()

                

                # 예외를 다시 발생시켜 concurrent.futures가 인지하도록 함

                raise

        

        # --- Main Batch Worker ---

        

        def main():

            """배치 워커 메인 함수"""

            print(f"배치 워커 시작. (최대 동시 작업: {MAX_WORKERS}, 배치 크기: {BATCH_SIZE})")

            

            # 1. 'pending' 상태의 작업을 배치 크기만큼 가져옴

            response = supabase.table("restoration_jobs").select("*").eq("status", "pending").limit(BATCH_SIZE).execute()

            jobs = response.data

            

            if not jobs:

                print("처리할 작업이 없습니다. 종료합니다.")

                return

                

            print(f"{len(jobs)}개의 작업을 가져왔습니다. 처리를 시작합니다.")

            

            # 2. 가져온 작업들의 상태를 'processing'으로 일괄 변경

            job_ids = [job['id'] for job in jobs]

            supabase.table("restoration_jobs").update({"status": "processing"}).in_("id", job_ids).execute()

        

            # 3. ThreadPoolExecutor를 사용하여 병렬 처리

            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:

                # 각 job에 대해 process_job 함수를 제출

                future_to_job = {executor.submit(process_job, job): job for job in jobs}

                

                for future in concurrent.futures.as_completed(future_to_job):

                    job = future_to_job[future]

                    try:

                        result = future.get()

                        print(result)

                    except Exception as exc:

                        # process_job 내부에서 이미 오류 처리 및 로깅을 수행함

                        # 여기서는 메인 스레드에 오류가 발생했음을 알리는 역할만 함

                        print(f"[Job {job['id']}] 최종 처리 실패. 상세 내용은 로그를 확인하세요.")

        

            print("

        모든 배치 작업이 완료되었습니다.")

        

        if __name__ == "__main__":

            main()

        
