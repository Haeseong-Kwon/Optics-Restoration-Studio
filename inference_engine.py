
# inference_engine.py

import torch
import numpy as np
from PIL import Image
import io

# SwinIR 모델 아키텍처를 동적으로 로드
# 이 파일이 실행되기 전에 models/network_swinir.py 파일이 있어야 합니다.
try:
    from models.network_swinir import SwinIR as SwinIR_Net
except ImportError:
    raise ImportError("SwinIR 모델 파일을 찾을 수 없습니다. 'models/network_swinir.py' 경로에 파일이 있는지 확인하세요.")

class ImageRestorer:
    """
    PyTorch 기반 AI 모델을 로드하고 이미지 복원 추론을 수행하는 클래스.
    MPS (Apple Silicon GPU) 가속을 지원합니다.
    """
    def __init__(self, model_path: str, model_config: dict):
        self.device = self._get_device()
        print(f"Using device: {self.device}")

        self.model = self._load_model(model_config)
        self._load_weights(model_path)
        
        self.scale = model_config.get('scale', 1)
        self.window_size = model_config.get('window_size', 8)

    def _get_device(self) -> torch.device:
        """사용 가능한 최적의 디바이스를 선택 (MPS > CPU)"""
        if torch.backends.mps.is_available() and torch.backends.mps.is_built():
            return torch.device("mps")
        print("MPS is not available. Falling back to CPU.")
        return torch.device("cpu")

    def _load_model(self, model_config: dict) -> torch.nn.Module:
        """모델 아키텍처(SwinIR)를 구성에 맞게 로드"""
        model = SwinIR_Net(
            upscale=model_config.get('upscale', 1),
            in_chans=model_config.get('in_chans', 3),
            img_size=model_config.get('img_size', 128),
            window_size=model_config.get('window_size', 8),
            img_range=model_config.get('img_range', 1.0),
            depths=model_config.get('depths', [6, 6, 6, 6, 6, 6]),
            embed_dim=model_config.get('embed_dim', 180),
            num_heads=model_config.get('num_heads', [6, 6, 6, 6, 6, 6]),
            mlp_ratio=model_config.get('mlp_ratio', 2),
            upsampler=model_config.get('upsampler', 'pixelshuffle'),
            resi_connection=model_config.get('resi_connection', '1conv')
        )
        return model

    def _load_weights(self, model_path: str):
        """사전 훈련된 가중치 로드"""
        try:
            # MPS 디바이스로 직접 로드 시 발생하는 이슈를 피하기 위해 CPU로 먼저 로드
            pretrained_model = torch.load(model_path, map_location=torch.device('cpu'))
            
            # 'params_ema' 키가 있는지 확인 (SwinIR 일반적 구조)
            param_key = 'params_ema' if 'params_ema' in pretrained_model else 'params'
            if param_key not in pretrained_model:
                # 키가 없는 경우, state_dict 전체를 사용
                self.model.load_state_dict(pretrained_model, strict=True)
            else:
                self.model.load_state_dict(pretrained_model[param_key], strict=True)

            self.model.eval()
            self.model = self.model.to(self.device)
            print(f"'{model_path}' 에서 모델 가중치를 성공적으로 로드했습니다.")
        except Exception as e:
            raise IOError(f"모델 가중치 파일 로드 실패: {model_path}. 오류: {e}")

    def inference(self, image_bytes: bytes) -> np.ndarray:
        """
        입력 이미지 바이트에 대해 복원 추론을 수행합니다.
        """
        # 1. 이미지 전처리
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_np = np.array(img)
        
        img_lq = img_np.astype(np.float32) / 255.
        img_lq = np.transpose(img_lq, (2, 0, 1))  # HWC -> CHW
        img_lq = torch.from_numpy(img_lq).float().unsqueeze(0).to(self.device)  # Add batch dim and send to device

        # 2. 추론 수행
        with torch.no_grad():
            # 타일링 처리: window_size에 맞게 이미지를 패딩
            _, _, h_old, w_old = img_lq.size()
            h_pad = (h_old // self.window_size + 1) * self.window_size - h_old
            w_pad = (w_old // self.window_size + 1) * self.window_size - w_old
            img_lq = torch.cat([img_lq, torch.flip(img_lq, [2])], 2)[:, :, :h_old + h_pad, :]
            img_lq = torch.cat([img_lq, torch.flip(img_lq, [3])], 3)[:, :, :, :w_old + w_pad]

            output = self.model(img_lq)
            
            # 패딩 제거
            output = output[..., :h_old * self.scale, :w_old * self.scale]

        # 3. 결과 후처리
        output = output.data.squeeze().float().cpu().clamp_(0, 1).numpy()
        output = np.transpose(output, (1, 2, 0))  # CHW -> HWC
        output = (output * 255.0).round().astype(np.uint8)

        return output
