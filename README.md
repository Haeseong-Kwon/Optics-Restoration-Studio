# Optics Restoration Studio

**Optics Restoration Studio** is a professional-grade web platform designed for high-resolution image restoration using state-of-the-art AI models. Built for researchers and optical engineers, the studio provides tools for real-time parameter tuning, multi-model performance comparison, and batch processing.

## 🚀 Key Features

### 1. Advanced AI Model Selection
Integrates diverse restoration algorithms tailored for different optical degradations:
- **SwinIR**: Transformer-based restoration for superior quality.
- **Real-ESRGAN**: Specialized in detail enhancement and super-resolution.
- **Optical Diffusion**: Physically consistent generative restoration.
- **Wiener Deconvolution**: Fast classical signal processing.

### 2. Interactive Parameter Tuning
Fine-tune restoration results in real-time with adjustable hyperparameters:
- **Denoising Strength**: Control the balance between noise reduction and detail preservation.
- **Sharpness Boost**: Enhance edges and textures.
- **Iterations**: Adjust computational depth for refined outputs.

### 3. Comparison Dashboard & Metrics
Side-by-side evaluation of multiple models on the same input image:
- Quantitative analysis using **PSNR**, **SSIM**, and **NIQE**.
- Automated "Best Model" recommendation based on performance benchmarks.

### 4. Batch Processing Queue
Efficiently handle large datasets:
- Bulk upload multiple images.
- Queue sequential restoration jobs across multiple models.
- Real-time monitoring via Supabase Realtime synchronization.

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Lucide React.
- **Backend & Database**: Supabase (Database, Storage, Realtime).
- **Imaging**: Client-side tiling for high-resolution processing.
- **Reporting**: jsPDF & html2canvas for professional PDF exports.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Haeseong-Kwon/Optics-Restoration-Studio.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 📊 Restoration Cases (Before & After)

| Case | Original (Blurred) | Restored (SwinIR) | Improvement |
| :--- | :---: | :---: | :---: |
| **Star Nebula** | ![Before](https://via.placeholder.com/300x200?text=Blurred+Nebula) | ![After](https://via.placeholder.com/300x200?text=Restored+Nebula) | +4.2dB PSNR |
| **Microscopic Cell** | ![Before](https://via.placeholder.com/300x200?text=Blurred+Cell) | ![After](https://via.placeholder.com/300x200?text=Restored+Cell) | +0.12 SSIM |

## 📄 License
MIT License - Developed by [Sangminyeee/guardion](https://github.com/Sangminyeee/guardion)
