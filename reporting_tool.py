
# reporting_tool.py

import os
import json
import zipfile
import argparse
from collections import defaultdict

from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
from PIL import Image
import io as python_io
import torch
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim
import pyiqa


# --- Configuration ---
load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
IMAGE_STORAGE_BUCKET = "images"
REPORT_FILENAME = "benchmark_report.json"

# --- Metric Calculation Logic (from batch_worker) ---
# This function is now self-contained in the reporting tool for reuse.
def calculate_metrics(original_img_bytes: bytes, restored_img_array: np.ndarray, device: torch.device):
    """PSNR, SSIM, NIQE 품질 지표를 계산합니다."""
    metrics = {}
    try:
        original_pil = Image.open(python_io.BytesIO(original_img_bytes)).convert('RGB')
        original_array = np.array(original_pil)

        restored_pil = Image.fromarray(restored_img_array)
        if original_pil.size != restored_pil.size:
            restored_pil = restored_pil.resize(original_pil.size, Image.LANCZOS)
        
        restored_array_resized = np.array(restored_pil)
        
        metrics['psnr'] = psnr(original_array, restored_array_resized)
        metrics['ssim'] = ssim(original_array, restored_array_resized, multichannel=True, channel_axis=2, data_range=255)

        niqe_metric = pyiqa.create_metric('niqe', device=device)
        restored_tensor = torch.tensor(restored_array_resized).permute(2, 0, 1).unsqueeze(0) / 255.
        
        with torch.no_grad():
            niqe_score = niqe_metric(restored_tensor)
        metrics['niqe'] = niqe_score.item()
    except Exception as e:
        print(f"품질 지표 계산 중 오류 발생: {e}")
    return metrics


# --- Core Functions ---

def generate_benchmark_report(output_filename: str):
    """
    Supabase 'model_benchmarks' 테이블에서 데이터를 가져와 모델별 평균 점수를 계산하고 JSON 파일로 저장합니다.
    """
    print("벤치마크 데이터를 가져오는 중...")
    response = supabase.table("model_benchmarks").select("model_name, psnr, ssim, niqe").execute()
    
    if not response.data:
        print("분석할 벤치마크 데이터가 없습니다.")
        return

    # 모델 이름별로 점수를 그룹화
    scores = defaultdict(lambda: defaultdict(list))
    for row in response.data:
        model = row['model_name']
        if row['psnr']: scores[model]['psnr'].append(row['psnr'])
        if row['ssim']: scores[model]['ssim'].append(row['ssim'])
        if row['niqe']: scores[model]['niqe'].append(row['niqe'])

    # 평균 점수 계산
    report = {}
    print("
--- 벤치마크 종합 리포트 ---")
    for model, data in scores.items():
        avg_psnr = np.mean(data['psnr']) if data['psnr'] else 0
        avg_ssim = np.mean(data['ssim']) if data['ssim'] else 0
        avg_niqe = np.mean(data['niqe']) if data['niqe'] else 0
        count = len(data['psnr']) # psnr 기준으로 개수 카운트
        
        report[model] = {
            "image_count": count,
            "average_psnr": f"{avg_psnr:.2f}",
            "average_ssim": f"{avg_ssim:.4f}",
            "average_niqe": f"{avg_niqe:.2f}"
        }
        print(f"모델: {model} (처리된 이미지: {count}개)")
        print(f"  - 평균 PSNR: {avg_psnr:.2f}")
        print(f"  - 평균 SSIM: {avg_ssim:.4f}")
        print(f"  - 평균 NIQE: {avg_niqe:.2f}
")

    # JSON 파일로 저장
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=4)
    print(f"리포트가 '{output_filename}' 파일로 저장되었습니다.")


def create_archive_zip(job_ids: list, output_zip_path: str):
    """
    지정된 작업 ID의 복원된 이미지와 벤치마크 리포트를 다운로드하여 ZIP 파일로 압축합니다.
    """
    if not job_ids:
        print("압축할 작업 ID가 지정되지 않았습니다.")
        return

    print(f"{len(job_ids)}개 작업의 결과물을 압축합니다...")
    
    response = supabase.table("restoration_jobs").select("id, restored_image_path").in_("id", job_ids).execute()
    
    if not response.data:
        print("해당 ID의 작업을 찾을 수 없습니다.")
        return
        
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 벤치마크 리포트 파일 추가
        if os.path.exists(REPORT_FILENAME):
            zipf.write(REPORT_FILENAME)
            print(f"'{REPORT_FILENAME}' 추가 완료.")
        
        # 각 작업의 복원된 이미지 다운로드 및 추가
        for job in response.data:
            path = job.get('restored_image_path')
            if not path:
                print(f"[경고] 작업 ID {job['id']}의 복원된 이미지 경로를 찾을 수 없습니다.")
                continue
            
            try:
                print(f"이미지 다운로드 중: {path}")
                image_bytes = supabase.storage.from_(IMAGE_STORAGE_BUCKET).download(path=path)
                filename = os.path.basename(path)
                zipf.writestr(f"images/{filename}", image_bytes)
            except Exception as e:
                print(f"[오류] '{path}' 이미지 다운로드 또는 압축 실패: {e}")
                
    print(f"
결과물이 '{output_zip_path}' 파일로 성공적으로 압축되었습니다.")


# --- Command-line Interface ---

def main():
    parser = argparse.ArgumentParser(description="벤치마크 리포팅 및 결과물 내보내기 도구")
    parser.add_argument(
        '--generate-report', 
        action='store_true', 
        help="Supabase에서 벤치마크 데이터를 가져와 JSON 리포트를 생성합니다."
    )
    parser.add_argument(
        '--create-zip', 
        action='store_true', 
        help="지정된 작업 ID의 결과물을 ZIP 파일로 압축합니다."
    )
    parser.add_argument(
        '--job-ids', 
        type=str, 
        help="ZIP으로 압축할 작업 ID 목록 (쉼표로 구분). 예: '101,102,103'"
    )
    parser.add_argument(
        '--output-file', 
        type=str,
        help="생성될 리포트 또는 ZIP 파일의 이름을 지정합니다."
    )
    
    args = parser.parse_args()
    
    if args.generate_report:
        output_filename = args.output_file or REPORT_FILENAME
        generate_benchmark_report(output_filename)
        
    elif args.create_zip:
        if not args.job_ids:
            parser.error("--create-zip 옵션은 --job-ids를 필요로 합니다.")
        
        job_ids_list = [int(x.strip()) for x in args.job_ids.split(',')]
        output_zip_filename = args.output_file or f"restoration_batch_{job_ids_list[0]}_{len(job_ids_list)}.zip"
        create_archive_zip(job_ids_list, output_zip_filename)
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
