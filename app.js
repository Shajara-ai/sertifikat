document.addEventListener("DOMContentLoaded", () => {
    // Inisialisasi ikon Lucide
    lucide.createIcons();

    // DOM Elements
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

    // Success details DOM elements
    const resName = document.getElementById("res-name");
    const resRole = document.getElementById("res-role");
    const resActivity = document.getElementById("res-activity");
    const resDate = document.getElementById("res-date");
    const resId = document.getElementById("res-id");
    const signersContainer = document.getElementById("signers-container");

    let html5QrCode = null;
    let certificateDatabase = null; // Diisi melalui Fetch API

    // Muat database.json secara dinamis sebelum melakukan verifikasi
    fetch("output/database.json")
        .then(response => {
            if (!response.ok) {
                throw new Error("Gagal memuat file database.json");
            }
            return response.json();
        })
        .then(data => {
            certificateDatabase = data;
            
            // Setelah database termuat, periksa parameter URL (?id=...)
            const urlParams = new URLSearchParams(window.location.search);
            const certIdParam = urlParams.get('id');

            if (certIdParam) {
                verifyCertificate(certIdParam.trim());
            } else {
                showView("home");
            }
        })
        .catch(err => {
            console.error("Error memuat database aplikasi:", err);
            // Fallback jika dibuka lokal via file:// tanpa server atau jika rute berbeda
            showView("home");
        });

    // Event Handler untuk tombol Verifikasi manual
    btnVerify.addEventListener("click", () => {
        const certId = inputCertId.value.trim();
        if (certId) {
            window.location.href = `?id=${encodeURIComponent(certId)}`;
        } else {
            alert("Silakan masukkan Nomor Sertifikat terlebih dahulu.");
        }
    });

    // Handle enter key on input
    inputCertId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            btnVerify.click();
        }
    });

    // Event Handler untuk tombol Kembali
    btnBackList.forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = window.location.pathname;
        });
    });

    // Scanner QR Code
    btnStartScan.addEventListener("click", () => {
        scannerContainer.classList.remove("hidden");
        btnStartScan.classList.add("hidden");
        startScanner();
    });

    btnCloseScanner.addEventListener("click", () => {
        stopScanner();
    });

    // Fungsi Utama: Verifikasi sertifikat berdasarkan data JSON
    function verifyCertificate(id) {
        if (!certificateDatabase) {
            console.error("Database sertifikat belum terisi atau gagal dimuat.");
            showView("failed");
            return;
        }

        const certKey = Object.keys(certificateDatabase).find(
            key => key.toLowerCase() === id.toLowerCase()
        );

        if (certKey) {
            const data = certificateDatabase[certKey];
            
            // Pengisian data utama ke elemen HTML dengan fallback aman
            resName.textContent = data.name || "-";
            resRole.textContent = data.role || "Peserta";
            resActivity.textContent = data.activity || "-";
            resDate.textContent = data.date || "-";
            resId.textContent = certKey;
            
            btnDownloadPdf.href = data.pdfUrl || "#";

            // Render penandatangan secara dinamis dari array "signers"
            signersContainer.innerHTML = "";
            if (data.signers && Array.isArray(data.signers) && data.signers.length > 0) {
                const totalSigners = data.signers.length;
                data.signers.forEach((signer, index) => {
                    const detailRow = document.createElement("div");
                    detailRow.className = "detail-row";
                    
                    const labelText = totalSigners > 1 ? `Penandatangan ${index + 1}` : "Penandatangan";
                    const signerRole = signer.role || "-";
                    const signerName = signer.name || "-";
                    
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
                // Fallback default jika field signers tidak terdefinisi
                const detailRow = document.createElement("div");
                detailRow.className = "detail-row";
                detailRow.innerHTML = `
                    <span class="detail-label">Penandatangan</span>
                    <div class="signature-info">
                        <span class="detail-value block">Dekan FIKES - UF</span>
                        <span class="text-xs text-slate-400 block italic">Prof. Dr. dr. Siti Aminah, M.Kes</span>
                    </div>
                `;
                signersContainer.appendChild(detailRow);
            }

            showView("success");
        } else {
            showView("failed");
        }
    }

    // Fungsi navigasi view
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

    // Fungsi memulai scanner kamera
    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Gagal mengakses kamera:", err);
            alert("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
            stopScanner();
        });
    }

    // Fungsi menghentikan scanner kamera
    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add("hidden");
                btnStartScan.classList.remove("hidden");
                html5QrCode = null;
            }).catch(err => {
                console.error("Gagal menghentikan scanner:", err);
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
            console.error("Error memproses URL scan:", e);
        }
        window.location.href = `?id=${encodeURIComponent(certId.trim())}`;
    }

    function onScanFailure(error) {
        // Proses pemindaian berkelanjutan, log dilewati untuk performa UI
    }
});
