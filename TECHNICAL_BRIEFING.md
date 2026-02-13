
# AI 기반 이미지 복원 파이프라인: 기술 보고서

## 1. 개요

본 프로젝트는 저화질 또는 블러 처리된 이미지의 품질을 최신 AI 모델을 사용하여 자동으로 복원하는 **엔드투엔드(End-to-End) 파이프라인**입니다. 사용자가 복원할 이미지를 시스템에 등록하면, 백그라운드에서 동작하는 지능형 워커(Worker)가 작업을 감지하여 AI 추론을 수행하고, 결과를 다시 데이터베이스에 기록합니다. 전체 과정은 확장성과 안정성을 고려하여 설계되었으며, 모델의 성능을 정량적으로 평가하고 결과물을 손쉽게 관리할 수 있는 유틸리티를 포함합니다.

---

## 2. 시스템 아키텍처

본 시스템은 다음과 같은 주요 컴포넌트로 구성되어 있으며, 각 컴포넌트는 명확하게 분리된 역할을 수행합니다.

![System Architecture Diagram](https://i.imgur.com/example.png)  <!-- 다이어그램 예시 URL -->

-   **Supabase (BaaS - Backend as a Service)**
    -   **Database**: `restoration_jobs`(작업 큐), `model_benchmarks`(성능 지표) 등 핵심 데이터를 관리하는 PostgreSQL 데이터베이스 역할을 합니다.
    -   **Storage**: 원본 이미지, 블러 이미지, AI에 의해 복원된 결과 이미지를 저장하고 서빙합니다.
    -   **API Gateway**: 파이썬 워커가 데이터베이스 및 스토리지와 안전하게 통신할 수 있는 API 엔드포인트를 제공합니다.

-   **AI Batch Worker (`batch_worker.py`)**
    -   시스템의 핵심 두뇌로, `pending` 상태의 작업을 주기적으로 폴링(Polling)합니다.
    -   `concurrent.futures`를 활용한 **멀티스레딩**으로 여러 작업을 동시에 처리하여 처리량을 극대화합니다.
    -   작업에 명시된 `model_id`를 기반으로 적절한 AI 모델을 동적으로 로드합니다.
    -   메모리 부족(OOM), API 타임아웃, 잘못된 파일 형식 등 다양한 예외 상황을 처리하고, 실패 시 해당 작업의 상태를 `failed`로 기록하여 시스템의 안정성을 보장합니다.

-   **Inference Engine (`inference_engine.py`)**
    -   PyTorch 기반의 AI 모델(예: SwinIR)을 로드하고 실제 추론을 수행하는 모듈입니다.
    -   Apple Silicon의 **MPS (Metal Performance Shaders)를 통한 GPU 가속**을 지원하여 추론 속도를 최적화합니다.

-   **Reporting & Export Tool (`reporting_tool.py`)**
    -   배치 작업 완료 후, `model_benchmarks` 테이블의 데이터를 분석하여 모델별 평균 성능(PSNR, SSIM, NIQE) 리포트를 생성합니다.
    -   지정된 작업의 결과 이미지와 벤치마크 리포트를 하나의 ZIP 파일로 압축하여 손쉽게 다운로드할 수 있는 기능을 제공합니다.

---

## 3. 주요 기능 및 적용 기술

-   **자동화된 배치 처리**: `ThreadPoolExecutor`를 사용하여 다수의 이미지 복원 작업을 병렬로 처리함으로써, 대규모 데이터셋에 대한 확장성을 확보했습니다.
-   **지능형 AI 모델 적용**:
    -   **SwinIR**: 이미지 복원 분야에서 뛰어난 성능을 입증한 Transformer 기반의 AI 모델을 적용했습니다.
    -   **동적 모델 로딩**: 작업 요청에 따라 각기 다른 사전 훈련된 모델 가중치를 로드할 수 있는 유연한 구조를 갖추었습니다.
    -   **GPU 가속**: PyTorch의 MPS 백엔드를 활용하여 Mac의 GPU 성능을 최대로 활용, 추론 시간을 단축했습니다.
-   **견고한 오류 처리 및 로깅**: 이미지 포맷 오류, 메모리 부족, 네트워크 타임아웃 등 예측 가능한 오류 발생 시, 스레드가 중단되지 않고 해당 작업의 상태를 'failed'로 기록하며 Supabase에 원인을 로깅합니다.
-   **종합적인 성능 벤치마킹**:
    -   복원된 이미지의 품질을 다각적으로 평가하기 위해 다음 세 가지 산업 표준 지표를 사용합니다.
        -   **PSNR** (Peak Signal-to-Noise Ratio): 원본과 결과물 사이의 손실 정보량을 측정합니다.
        -   **SSIM** (Structural Similarity Index): 인간의 시각 시스템이 인지하는 구조적 유사도를 측정합니다.
        -   **NIQE** (Natural Image Quality Evaluator): 원본 이미지 없이 복원된 이미지 자체의 자연스러움을 평가하는 No-Reference 지표입니다.
-   **데이터 익스포트 기능**: `reporting_tool.py`를 통해 복원된 이미지들과 정량적 성능 분석 리포트를 하나의 ZIP 아카이브로 패키징하여 연구 결과 공유 및 보관을 용이하게 합니다.

---

## 4. 시연 시나리오

1.  **작업 생성**: Supabase 대시보드에서 `restoration_jobs` 테이블에 `status`가 'pending'이고 `model_id`가 'swinir_real_sr_x4'인 새로운 작업을 여러 개 생성합니다.
2.  **배치 워커 실행**: 터미널에서 `python batch_worker.py` 명령어를 실행합니다.
    -   *관찰 포인트*: 터미널에 여러 작업이 동시에 처리되는 로그가 출력됩니다.
3.  **결과 확인**: Supabase 대시보드에서 다음을 확인합니다.
    -   `restoration_jobs` 테이블의 작업 상태가 'processing'을 거쳐 'completed' 또는 'failed'로 변경됩니다.
    -   'completed'된 작업에는 `restored_image_path`가 채워집니다.
    -   `model_benchmarks` 테이블에 각 작업의 PSNR, SSIM, NIQE 점수가 기록됩니다.
    -   Storage에서 복원된 이미지 파일을 직접 확인할 수 있습니다.
4.  **리포트 생성**: 터미널에서 `python reporting_tool.py --generate-report`를 실행하여 `benchmark_report.json` 파일이 생성되는 것을 확인합니다.
5.  **결과물 압축**: 터미널에서 `python reporting_tool.py --create-zip --job-ids "ID1,ID2,..."` 명령을 실행하여, 지정된 작업의 결과물이 담긴 ZIP 파일이 생성되는 것을 확인합니다.

## 5. 결론

본 프로젝트는 단순한 AI 모델 실행 스크립트를 넘어, 실제 서비스 환경에서 운영될 수 있는 수준의 **자동화, 안정성, 확장성**을 갖춘 이미지 복원 파이프라인을 성공적으로 구축했습니다. Supabase를 활용하여 백엔드 개발 부담을 최소화하고, Python의 병렬 처리 기능과 PyTorch의 GPU 가속을 통해 핵심 로직의 성능을 극대화했습니다. 또한, 정량적인 벤치마킹과 편리한 데이터 관리 유틸리티를 통해 연구 및 개발의 효율성을 높였습니다.
