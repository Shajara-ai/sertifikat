document.addEventListener("DOMContentLoaded", () => {
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
    let certificateDatabase = null;

    const urlParams = new URLSearchParams(window.location.search);
    const certIdParam = urlParams.get('id');

    // SEDERHANA: Langsung fetch ke root folder tanpa sub-folder output
    fetch('database.json')
        .then(response => {
            if (!response.ok) throw new Error("Gagal memuat berkas database.json");
            return response.json();
        })
        .then(data => {
            certificateDatabase = data;
            if (certIdParam) {
                verifyCertificate(certIdParam.trim());
            } else {
                showView("home");
            }
        })
        .catch(error => {
            console.error("Kesalahan memuat database:", error);
            if (certIdParam) showView("failed");
            else showView("home");
        });

    btnVerify.addEventListener("click", () => {
        const certId = inputCertId.value.trim();
        if (certId) {
            window.location.href = `?id=${encodeURIComponent(certId)}`;
        } else {
            alert("Silakan masukkan Nomor Sertifikat terlebih dahulu.");
        }
    });

    inputCertId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") btnVerify.click();
    });

    btnBackList.forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = window.location.pathname;
        });
    });

    btnStartScan.addEventListener("click", () => {
        scannerContainer.classList.remove("hidden");
        btnStartScan.classList.add("hidden");
        startScanner();
    });

    btnCloseScanner.addEventListener("click", () => {
        stopScanner();
    });

    function verifyCertificate(id) {
        if (!certificateDatabase) {
            showView("failed");
            return;
        }

        const certKey = Object.keys(certificateDatabase).find(
            key => key.toLowerCase() === id.toLowerCase()
        );

        if (certKey) {
            const data = certificateDatabase[certKey];
            
            resName.textContent = data.name || "-";
            resRole.textContent = data.role || "Peserta";
            resActivity.innerHTML = data.activity || "-"; // Mendukung tag <i> otomatis
            resDate.textContent = data.date || "-";
            resId.textContent = certKey;
            
            if (data.pdfUrl) {
                btnDownloadPdf.href = data.pdfUrl;
                btnDownloadPdf.style.display = "inline-flex";
            } else {
                btnDownloadPdf.style.display = "none";
            }

            // FLEKSIBEL: Langsung fokus jadikan jabatan (role) dari Excel sebagai label kiri
            signersContainer.innerHTML = "";
            if (data.signers && Array.isArray(data.signers) && data.signers.length > 0) {
                data.signers.forEach((signer) => {
                    const detailRow = document.createElement("div");
                    detailRow.className = "detail-row";
                    
                    const labelText = signer.role || "Penandatangan";
                    const signerName = signer.name || "-";
                    
                    detailRow.innerHTML = `
                        <span class="detail-label">${labelText}</span>
                        <span class="detail-value font-medium text-slate-200">${signerName}</span>
                    `;
                    signersContainer.appendChild(detailRow);
                });
            } else {
                // Cadangan default jika data kosong
                const detailRow = document.createElement("div");
                detailRow.className = "detail-row";
                detailRow.innerHTML = `
                    <span class="detail-label">Dekan FIKES - UF</span>
                    <span class="detail-value font-medium text-slate-200">Prof. Dr. dr. Siti Aminah, M.Kes</span>
                `;
                signersContainer.appendChild(detailRow);
            }

            showView("success");
        } else {
            showView("failed");
        }
    }

    function showView(viewName) {
        viewHome.classList.add("hidden");
        viewSuccess.classList.add("hidden");
        viewFailed.classList.add("hidden");

        if (viewName === "success") viewSuccess.classList.remove("hidden");
        else if (viewName === "failed") viewFailed.classList.remove("hidden");
        else viewHome.classList.remove("hidden");
    }

    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .catch(() => {
                alert("Akses kamera ditolak.");
                stopScanner();
            });
    }

    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add("hidden");
                btnStartScan.classList.remove("hidden");
                html5QrCode = null;
            }).catch(() => {
                scannerContainer.classList.add("hidden");
                btnStartScan.classList.remove("hidden");
                html5QrCode = null;
            });
        } else {
            scannerContainer.classList.add("hidden");
            btnStartScan.classList.remove("hidden");
        }
    }

    function onScanSuccess(decodedText) {
        stopScanner();
        let certId = decodedText;
        try {
            if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
                const url = new URL(decodedText);
                const idParam = url.searchParams.get("id");
                if (idParam) certId = idParam;
            }
        } catch (e) {
            console.error(e);
        }
        window.location.href = `?id=${encodeURIComponent(certId.trim())}`;
    }

    function onScanFailure() {}
});
