document.addEventListener("DOMContentLoaded", () => {
    // Inisialisasi ikon Lucide
    lucide.createIcons();

    // DOM Elemen Utama
    const viewHome = document.getElementById("view-home");
    const viewSuccess = document.getElementById("view-result-success");
    const viewFailed = document.getElementById("view-result-failed");

    const inputCertId = document.getElementById("input-cert-id");
    const btnVerify = document.getElementById("btn-verify");
    const btnStartScan = document.getElementById("btn-start-scan");
    const btnCloseScanner = document.getElementById("btn-close-scanner");
    const btnBackList = document.querySelectorAll(".btn-back");
    const scannerContainer = document.getElementById("scanner-container");
    const btnDownloadPdf = document.getElementById("btn-download-pdf");

    // Elemen Pengisi Data Detail Keberhasilan
    const resName = document.getElementById("res-name");
    const resRole = document.getElementById("res-role");
    const resActivity = document.getElementById("res-activity");
    const resDate = document.getElementById("res-date");
    const resId = document.getElementById("res-id");
    const signersContainer = document.getElementById("signers-container");

    let html5QrCode = null;

    // Ambil & Verifikasi parameter ID dari URL (?id=...) saat halaman dimuat
    const urlParams = new URLSearchParams(window.location.search);
    const certIdParam = urlParams.get('id');

    if (certIdParam) {
        verifyCertificate(certIdParam.trim());
    } else {
        showView("home");
    }

    // Handler klik tombol Verifikasi manual
    btnVerify.addEventListener("click", () => {
        const certId = inputCertId.value.trim();
        if (certId) {
            window.location.href = `?id=${encodeURIComponent(certId)}`;
        } else {
            alert("Silakan masukkan Nomor Sertifikat terlebih dahulu.");
        }
    });

    // Jalankan verifikasi jika menekan tombol Enter pada input teks
    inputCertId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            btnVerify.click();
        }
    });

    // Handler Tombol Kembali ke Beranda
    btnBackList.forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = window.location.pathname;
        });
    });

    // Integrasi Scanner Kamera QR Code
    btnStartScan.addEventListener("click", () => {
        scannerContainer.classList.remove("hidden");
        btnStartScan.classList.add("hidden");
        startScanner();
    });

    btnCloseScanner.addEventListener("click", () => {
        stopScanner();
    });

    // Fungsi Inti: Melakukan pemeriksaan data pada database variabel global
    function verifyCertificate(id) {
        if (typeof certificateDatabase === 'undefined') {
            console.error("Variabel data 'certificateDatabase' tidak ditemukan. Pastikan file output/database.js termuat.");
            showView("failed");
            return;
        }

        // Pencarian kunci data (Case-Insensitive)
        const certKey = Object.keys(certificateDatabase).find(
            key => key.toLowerCase() === id.toLowerCase()
        );

        if (certKey) {
            const data = certificateDatabase[certKey];
            
            // Pengisian Teks Utama (Mendukung innerHTML untuk format cetak miring istilah asing)
            resName.textContent = data.name || data.nama || data.penerima || "-";
            resRole.textContent = data.role || data.peran || "Peserta";
            resActivity.innerHTML = data.activity || data.kegiatan || data.nama_kegiatan || "-";
            resDate.textContent = data.date || data.tanggal || data.tanggal_terbit || "-";
            resId.textContent = certKey;
            
            // Atur URL berkas unduhan sertifikat jika tersedia
            if (data.pdfUrl || data.pdf_url) {
                btnDownloadPdf.href = data.pdfUrl || data.pdf_url;
                btnDownloadPdf.style.display = "inline-flex";
            } else {
                btnDownloadPdf.style.display = "none";
            }

            // Pemrosesan komponen Kontainer Penandatangan secara Dinamis (1, 2, atau 3 penandatangan)
            signersContainer.innerHTML = "";
            if (data.signers && Array.isArray(data.signers) && data.signers.length > 0) {
                const totalSigners = data.signers.length;
                data.signers.forEach((signer, index) => {
                    const detailRow = document.createElement("div");
                    detailRow.className = "detail-row";
                    
                    const labelText = totalSigners > 1 ? `Penandatangan ${index + 1}` : "Penandatangan";
                    const signerRole = signer.peran || signer.role || signer.jabatan || "-";
                    const signerName = signer.nama || signer.name || "-";
                    
                    detailRow.innerHTML = `
                        <span class="detail-label">${labelText}</span>
                        <div class="signature-info">
                            <span class="detail-value block">${signerRole}</span>
                            <span class="text-xs text-slate-400 block italic">${signerName}</span>
                        </div>
                    `;
                    signersContainer.appendChild(detailRow);
                });
            } else {
                // Cadangan otomatis (Fallback) jika struktur array signers kosong / format lama
                const detailRow = document.createElement("div");
                detailRow.className = "detail-row";
                
                const fallbackRole = data.penandatangan_jabatan || "Dekan FIKES - UF";
                const fallbackName = data.penandatangan_nama || "Prof. Dr. dr. Siti Aminah, M.Kes";
                
                detailRow.innerHTML = `
                    <span class="detail-label">Penandatangan</span>
                    <div class="signature-info">
                        <span class="detail-value block">${fallbackRole}</span>
                        <span class="text-xs text-slate-400 block italic">${fallbackName}</span>
                    </div>
                `;
                signersContainer.appendChild(detailRow);
            }

            showView("success");
        } else {
            showView("failed");
        }
    }

    // Fungsi Manajemen Alur Tampilan Blok Halaman
    function showView(viewName) {
        viewHome.classList.add("hidden");
        viewSuccess.classList.add("hidden");
        viewFailed.classList.add("hidden");

        if (viewName === "success") {
            viewSuccess.classList.remove("hidden");
        } else if (viewName === "failed") {
            viewFailed.classList.remove("hidden");
        } else {
            viewHome.classList.remove("hidden");
        }
    }

    // Aktivasi kamera scanner QR Code
    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Gagal mendeteksi modul kamera:", err);
            alert("Akses kamera ditolak atau tidak ditemukan.");
            stopScanner();
        });
    }

    // Deaktivasi fungsional kamera scanner
    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add("hidden");
                btnStartScan.classList.remove("hidden");
                html5QrCode = null;
            }).catch(err => {
                console.error("Kesalahan penutupan kamera:", err);
                scannerContainer.classList.add("hidden");
                btnStartScan.classList.remove("hidden");
                html5QrCode = null;
            });
        } else {
            scannerContainer.classList.add("hidden");
            btnStartScan.classList.remove("hidden");
        }
    }

    function onScanSuccess(decodedText, decodedResult) {
        stopScanner();
        let certId = decodedText;
        try {
            if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
                const url = new URL(decodedText);
                const idParam = url.searchParams.get("id");
                if (idParam) {
                    certId = idParam;
                }
            }
        } catch (e) {
            console.error("Format data URL qr tidak valid:", e);
        }
        window.location.href = `?id=${encodeURIComponent(certId.trim())}`;
    }

    function onScanFailure(error) {
        // Pemindaian berulang dinamis, log diabaikan demi efisiensi render
    }
});
