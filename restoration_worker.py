
# restoration_worker.py

import os
import time
import numpy as np
from skimage import io, color, restoration
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim
from dotenv import load_dotenv
from supabase import create_client, Client
import io as python_io

# --- Configuration ---
# .env.local 파일에서 환경 변수 로드
load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in the .env.local file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
IMAGE_STORAGE_BUCKET = "images"  # Supabase 스토리지 버킷 이름

# --- Image Processing Functions ---

def deconvolve_image(image_bytes: bytes) -> np.ndarray:
    """
    Wiener deconvolution을 사용하여 이미지의 블러를 제거합니다.
    """
    # 바이트 데이터를 numpy 배열로 읽기
    image = io.imread(image_bytes)

    # 컬러 이미지인 경우 흑백으로 변환하여 처리
    if image.ndim == 3:
        image_gray = color.rgb2gray(image)
    else:
        image_gray = image

    # PSF(Point Spread Function) 추정. 실제 환경에서는 더 정교한 추정이 필요.
    # 여기서는 간단한 가우시안 커널을 가정합니다.
    psf = np.ones((5, 5)) / 25  # 5x5 평균 필터

    # Wiener deconvolution 적용
    # 'balance' 파라미터는 노이즈와 디블러링 사이의 균형을 조절합니다.
    deconvolved_image = restoration.wiener(image_gray, psf, 1.1, clip=True)

    # 0-255 범위의 8비트 이미지로 변환
    deconvolved_image_uint8 = (np.clip(deconvolved_image, 0, 1) * 255).astype(np.uint8)

    return deconvolved_image_uint8


# --- Main Worker Logic ---

def main():
    """
    Supabase에서 보정 작업을 가져와 처리하고 결과를 업데이트합니다.
    """
    job = None
    try:
        # 1. 'pending' 상태의 작업을 하나 가져와 'processing'으로 상태 변경 (원자적 연산)
        # PostgreSQL의 'FOR UPDATE SKIP LOCKED'와 유사한 효과를 내기 위해,
        # 먼저 작업을 가져오고 즉시 상태를 업데이트합니다.
        
        response = supabase.table("restoration_jobs").select("*").eq("status", "pending").limit(1).execute()
        
        if not response.data:
            print("처리할 작업이 없습니다. 종료합니다.")
            return

        job = response.data[0]
        job_id = job['id']

        # 다른 워커가 이 작업을 가져가지 못하도록 상태 업데이트
        supabase.table("restoration_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        
        print(f"작업 ID {job_id} 처리 시작...")

        # 2. Supabase Storage에서 블러 이미지 다운로드
        blurred_image_path = job.get("blurred_image_path")
        if not blurred_image_path:
            raise ValueError("블러 이미지 경로가 없습니다.")

        print(f"이미지 다운로드 중: {blurred_image_path}")
        image_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=blurred_image_path)

        # 3. Deconvolution 실행
        print("Deconvolution 처리 중...")
        restored_image_array = deconvolve_image(image_bytes)
        
        # 4. 복원된 이미지를 바이트로 변환하여 Supabase Storage에 업로드
        restored_filename = f"restored_{os.path.basename(blurred_image_path)}_{int(time.time())}.png"
        restored_folder = os.path.dirname(blurred_image_path)
        restored_image_path = os.path.join(restored_folder, restored_filename)

        output_bytes_io = python_io.BytesIO()
        io.imsave(output_bytes_io, restored_image_array, format='png')
        output_bytes_io.seek(0)
        file_bytes = output_bytes_io.read()

        print(f"복원된 이미지 업로드 중: {restored_image_path}")
        supabase.storage.from_(IMAGE_STORAGE_BUCKET).upload(
            path=restored_image_path,
            file=file_bytes,
            file_options={"content-type": "image/png"}
        )

        # 5. 품질 측정 (원본 이미지가 있는 경우)
        original_image_path = job.get("original_image_path")
        if original_image_path:
            print("품질 측정 중...")
            try:
                original_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=original_image_path)
                original_image = io.imread(original_bytes, as_gray=True)

                # 복원된 이미지도 gray 스케일로 로드하여 비교
                restored_gray = restored_image_array
                if restored_gray.ndim == 3:
                     restored_gray = color.rgb2gray(restored_gray)

                # 크기가 다를 경우, 원본 크기에 맞춰 복원된 이미지 리사이즈
                if original_image.shape != restored_gray.shape:
                    from skimage.transform import resize
                    restored_gray = resize(restored_gray, original_image.shape, anti_aliasing=True)

                # PSNR 및 SSIM 계산
                psnr_value = psnr(original_image, restored_gray, data_range=1.0)
                ssim_value = ssim(original_image, restored_gray, data_range=1.0)

                print(f"PSNR: {psnr_value:.2f}, SSIM: {ssim_value:.4f}")

                # model_benchmarks 테이블에 기록
                supabase.table("model_benchmarks").insert({
                    "job_id": job_id,
                    "model_name": "wiener_deconvolution_v1",
                    "psnr": psnr_value,
                    "ssim": ssim_value,
                }).execute()
            except Exception as e:
                print(f"품질 측정 중 오류 발생: {e}")


        # 6. 작업 상태를 'completed'로 업데이트
        print("작업 상태를 'completed'로 업데이트합니다.")
        supabase.table("restoration_jobs").update({
            "status": "completed",
            "restored_image_path": restored_image_path,
            "completed_at": "now()"
        }).eq("id", job_id).execute()

        print(f"작업 ID {job_id} 처리 완료.")

    except Exception as e:
        print(f"오류 발생: {e}")
        if job:
            job_id = job['id']
            # 오류 발생 시 상태를 'failed'로 업데이트
            supabase.table("restoration_jobs").update({
                "status": "failed",
                "error_log": str(e)
            }).eq("id", job_id).execute()
            print(f"작업 ID {job_id}를 'failed'로 표시했습니다.")


if __name__ == "__main__":
    main()

# --- 병렬 실행 방법 ---
# 이 스크립트는 단일 작업을 처리하고 종료됩니다.
# 터미널에서 여러 인스턴스를 실행하여 병렬 처리를 할 수 있습니다.
# 예시 (4개의 워커를 병렬로 실행):
# for i in {1..4}; do python restoration_worker.py &; done
# wait
