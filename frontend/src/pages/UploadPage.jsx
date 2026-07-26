// frontend/src/pages/UploadPage.jsx
import { useState, useRef } from "react";
import API from "../api/api";
import "../styles/upload.css";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("baseline");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Konfigurasi batasan file
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB (sesuaikan kebutuhan)
  const ALLOWED_EXTENSIONS = ['.csv'];

  const validateFile = (file) => {
    // Cek ekstensi
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`File harus berformat ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    // Cek ukuran file
    if (file.size > MAX_FILE_SIZE) {
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      const fileMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Ukuran file terlalu besar (${fileMB} MB). Maksimal ${maxMB} MB`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setError(null);
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setSuccess(false);
      } else {
        setFile(null);
        e.target.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setError(null);
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setSuccess(false);
      } else {
        setFile(null);
      }
    }
  };

  const handlePredict = async () => {
    if (!file) {
      setError('Pilih file CSV terlebih dahulu');
      return;
    }

    // Validasi ulang sebelum upload
    if (!validateFile(file)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);

    try {
      const response = await API.post("/predict", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
        // Tambahkan timeout lebih lama untuk file besar
        timeout: 600000, // 10 menit
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      setSuccess(true);
      setUploadProgress(100);
      console.log("Hasil prediksi:", response.data);
      
      setTimeout(() => {
        setFile(null);
        setSuccess(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error("Error:", error);
      if (error.code === 'ECONNABORTED') {
        setError('Waktu upload habis. Silakan coba lagi dengan file yang lebih kecil.');
      } else if (error.response?.status === 413) {
        setError('File terlalu besar untuk server. Silakan kompres file atau hubungi admin.');
      } else {
        setError(error.response?.data?.detail || 'Prediksi gagal. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const maxFileSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);

  return (
    <div className="upload-page">
      {/* Header */}
      <div className="page-header">
        <h1>Upload File CSV</h1>
        <p className="page-description">
          Unggah file CSV berisi data lalu lintas jaringan untuk dideteksi
        </p>
      </div>

      <div className="upload-card">
        {/* Format Box */}
        <div className="format-box">
          <h4>📋 Format File CSV yang Diperlukan</h4>
          <p>File CSV harus memiliki kolom:</p>
          <div className="format-tags">
            <span className="tag">id.orig_p</span>
            <span className="tag">id.resp_p</span>
            <span className="tag">proto</span>
            <span className="tag">duration</span>
            <span className="tag">orig_bytes</span>
            <span className="tag">resp_bytes</span>
            <span className="tag">conn_state</span>
            <span className="tag">orig_pkts</span>
            <span className="tag">resp_pkts</span>
            <span className="tag">orig_ip_bytes</span>
            <span className="tag">resp_ip_bytes</span>
          </div>
          <div className="file-info-row">
            <span className="file-info-label">📁 Format:</span>
            <span className="file-info-value">CSV (.csv)</span>
            <span className="file-info-label">📦 Maksimal:</span>
            <span className="file-info-value">{maxFileSizeMB} MB</span>
          </div>
        </div>

        {/* Drop Zone */}
        <div 
          className={`drop-zone ${file ? 'has-file' : ''} ${error ? 'has-error' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="file-preview">
              <div className="file-icon">📄</div>
              <div className="file-detail">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button className="remove-btn" onClick={handleReset}>✕</button>
            </div>
          ) : (
            <>
              <div className="drop-icon">📤</div>
              <p className="drop-title">Drag & drop file CSV di sini</p>
              <span className="drop-or">atau</span>
              <button className="browse-btn" onClick={() => fileInputRef.current?.click()}>
                Pilih File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <p className="drop-hint">
                Maksimal ukuran file {maxFileSizeMB} MB (CSV)
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        )}

        {/* Info Note */}
        <div className="info-note">
          <span>ℹ️</span>
          <p>
            Pastikan file CSV memiliki format yang benar. Sistem akan melakukan 
            validasi dan preprocessing secara otomatis sebelum diprediksi.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-box">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Model + Button */}
        <div className="action-row">
          <div className="model-wrapper">
            <label htmlFor="model-select">Pilih Model:</label>
            <select
              id="model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="model-select"
            >
              <option value="baseline">Baseline MLP</option>
              <option value="simclr">SimCLR + MLP</option>
            </select>
          </div>

          <button
            className="upload-btn"
            onClick={handlePredict}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Memproses...
              </>
            ) : (
              'Upload dan Prediksi'
            )}
          </button>
        </div>

        {/* Success */}
        {success && (
          <div className="success-box">
            <span>✅</span>
            <div>
              <strong>Berhasil!</strong>
              <p>Dataset berhasil diupload dan diprediksi.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadPage;