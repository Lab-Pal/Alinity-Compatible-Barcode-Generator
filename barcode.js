/*======================================================
  DOM REFERENCES
======================================================*/
const dom = {

// Inputs
productName: document.getElementById("productName"),
lotNumber: document.getElementById("lotNumber"),
expiryDate: document.getElementById("expiryDate"),
calendarButton: document.getElementById("calendarButton"),
expiryDatePicker: document.getElementById("expiryDatePicker"),
openStability: document.getElementById("openStability"),

// Thermal
labelW: document.getElementById("labelW"),
labelH: document.getElementById("labelH"),
labelQty: document.getElementById("labelQty"),

// Buttons
generateBtn: document.getElementById("generateBtn"),
resetBtn: document.getElementById("resetBtn"),
downloadBtn: document.getElementById("downloadPdfBtn"),

// Modal
downloadModal: document.getElementById("downloadModal"),
modalClose: document.querySelector(".modal-close"),

// Print mode
printModeAvery: document.getElementById('printModeAvery'),
printModeThermal: document.getElementById('printModeThermal'),

// UI
showBorder: document.getElementById('showBorder'),
thermalSettings: document.getElementById('thermalSettings'),
averyInfo: document.getElementById('averyInfo'),

levelCheckboxes: document.querySelectorAll('.level-checkbox'),
containerRadios: document.querySelectorAll('.container-radio'),

appVersion: document.getElementById("appVersion"),

};


/*======================================================
  CONSTANTS
======================================================*/
const VERSION = {
    app: "1.1.0",
    build: "2026-06-23"
};
dom.appVersion.textContent =
    `v${VERSION.app}`;

const levelCheckboxes = [...dom.levelCheckboxes];
const containerRadios = [...dom.containerRadios];

const CONFIG = {
    avery: {
        totalLabels: 60,
        width: 1.75,
        height: 0.66,
        padding: 0.125,
        columnGap: 0.3,
        marginTop: 0.55,
        marginLeft: 0.3,
        columns: 4,
        gap: 0.125
    },
    thermal: {
        minWidth: 1.5,
        minHeight: 0.66,
        maxQuantity: 500
    },
    limits: {
        productName: 25,
        lotNumber: 20,
        openStability: 15
    }
};
const COLORS = {
    normalBorder: '#555',
    errorBorder: '#ff4d4d'
};
const PDF = {
    fontSize: 6,
    lineSpacing: 0.08,

    vialMatrixRows: 12,
    vialMatrixColumns: 26,
    vialMatrixScale: 4,

    sampleBarcodeScale: 2
};

/*======================================================
  APPLICATION STATE
======================================================*/
let isGenerating = false;
const downloadState = {
    url: null,
    filename: "",
    downloaded: false
};
/*======================================================
  UI FUNCTIONS
======================================================*/
function updatePlaceholders() {

    const mobile = window.innerWidth <= 600;

    dom.productName.placeholder =
        mobile ? "Product Name (optional)" : "optional";

    dom.lotNumber.placeholder =
        mobile ? "Lot Number (required)" : "Enter as registered in Alinity";

    dom.expiryDate.placeholder =
        mobile ? "Expiration Date (MM/DD/YYYY)" : "MM/DD/YYYY";

    dom.openStability.placeholder =
        mobile ? "Open Stability (optional)" : "optional";

}


// Update UI
function updatePrintModeUI() {

    if (dom.printModeAvery.checked) {

        dom.thermalSettings.style.display = 'none';
        dom.averyInfo.style.display = 'block';

    } else {

        dom.thermalSettings.style.display = 'flex';
        dom.averyInfo.style.display = 'none';
    }
}
// Draw label border if option checked
function drawBorder(pdf, x, y, width, height) {
    if(dom.showBorder.checked){
        pdf.setDrawColor(COLORS.normalBorder);
        pdf.setLineWidth(0.005);
        pdf.rect(x, y, width, height);
    }
}
/*======================================================
    MODAL FUNCTIONS
======================================================*/
function showDownloadModal(pdfUrl, filename) {

    downloadState.url = pdfUrl;
    downloadState.filename = filename;
    downloadState.downloaded = false;

    dom.downloadBtn.disabled = false;
    dom.downloadBtn.textContent = "Download PDF";

    dom.downloadModal.style.display = "flex";
}
function closeDownloadModal() {

    dom.downloadModal.style.display = "none";

    if (downloadState.url) {
        URL.revokeObjectURL(downloadState.url);
        downloadState.url = null;
        downloadState.filename = "";
        downloadState.downloaded = false;
    }

    resetForm();
}

function downloadPdf() {

    if (downloadState.downloaded) return;

    const a = document.createElement("a");
    a.href = downloadState.url;
    a.download = downloadState.filename;
    a.click();

    downloadState.downloaded = true;

    dom.downloadBtn.disabled = true;
    dom.downloadBtn.textContent = "✓ Downloaded";
}

/*======================================================
  VALIDATION
======================================================*/
function limitLength(input, maxLength) {

    if (input.value.length > maxLength) {
        input.value =
            input.value.slice(0, maxLength);
    }

}

function updateGenerateButton() {

    const lotFilled =
        dom.lotNumber.value.trim() !== "";

    const levelSelected =
        levelCheckboxes.some(cb => cb.checked);

    const containerSelected =
        document.querySelector(
            'input[name="containerType"]:checked'
        ) !== null;

    dom.generateBtn.disabled =
        !(lotFilled && levelSelected && containerSelected);
}
// Validate expiry date
function isValidExpiry(expiryStr){
    if(!expiryStr) return true;
    const parts = expiryStr.split('/');
    if(parts.length!==3) return false;
    const month = parseInt(parts[0],10);
    const day = parseInt(parts[1],10);
    const year = parseInt(parts[2],10); // full year now
    if(isNaN(month)||isNaN(day)||isNaN(year)) return false;
    if(month<1||month>12) return false;
    const maxDays=[31,(year%4===0&&(year%100!==0||year%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
    if(day<1||day>maxDays[month-1]) return false;
    return true;
}

/*======================================================
  BARCODE GENERATION
======================================================*/
// Random serial generator
function generateSerialSet(count) {
    return Array.from({ length: count }, () =>
        String(Math.floor(Math.random() * 100000)).padStart(5, '0')
    );
}
/*======================================================
  PDF GENERATION
======================================================*/
// Generate Vial Label
async function generateVialLabel(pdf, x, y, availableWidth, availableHeight, innerPadding, gap, productName, lot, level, expiry, openStability, serial) {
    //const serial = generateSerial();
    const barcodeText = lot + level + serial;

    const canvas = document.createElement('canvas');
    await bwipjs.toCanvas(canvas, {
        bcid: 'datamatrixrectangular',
        text: barcodeText,
        rows: PDF.vialMatrixRows,
        columns: PDF.vialMatrixColumns,
        scale: PDF.vialMatrixScale,
        includetext: false,
        rotate: 'R',
        padding: 0,
        eclevel: 'auto'
    });

    const rotatedRows = PDF.vialMatrixColumns, rotatedCols = PDF.vialMatrixRows;
    const barcodeHeight = availableHeight;
    const barcodeWidth = barcodeHeight * (rotatedCols / rotatedRows);
    const barcodeX = x + innerPadding, barcodeY = y + innerPadding;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);

    const textX = barcodeX + barcodeWidth + gap, textY = y + innerPadding, textWidth = availableWidth - barcodeWidth - gap;
    let text = '';

    if (productName) {
        text += `${productName} L${level}`;
    } else {
        text += `Level ${level}`;
    }

    text += `\nLot: ${lot} SN: ${serial}`;
    if (expiry) text += `\nExp: ${expiry}`;
    if (openStability) text += `\nStability: ${openStability}`;
    text += `\nOpen Date:`;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF.fontSize);
    const lines = pdf.splitTextToSize(text, textWidth);
    lines.forEach((line, idx) => {
        const lineY = textY + (6/72) + idx * PDF.lineSpacing;
        if (lineY <= y + availableHeight + innerPadding) pdf.text(line, textX, lineY);
    });
}

// Generate Sample Label
async function generateSampleLabel(pdf, x, y, availableWidth, availableHeight, innerPadding, productName, lot, level, expiry, openStability) {
    const barcodeText = "QQQ" + lot + level;

    const canvas = document.createElement('canvas');
    await bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text: barcodeText,
        scale: PDF.sampleBarcodeScale,
        includetext: false,
        padding: 0
    });

    const barcodeWidth = availableWidth * 0.75;
    const barcodeHeight = availableHeight * 0.6;
    const barcodeX = x + innerPadding;
    const barcodeY = y + innerPadding;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);

    const textX = barcodeX;
    const textY = barcodeY + barcodeHeight + 0.1;
    let line1 = productName
        ? `${productName} L${level}`
        : `Level ${level}`;
    if(expiry) line1 += ` Exp: ${expiry}`;
    let line2 = `Lot: ${lot}`;
    if(openStability) line2 += ` Stability: ${openStability}`;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF.fontSize);
    pdf.text(line1, textX, textY);
    pdf.text(line2, textX, textY + PDF.lineSpacing);
}
/*======================================================
  MAIN WORKFLOW
======================================================*/
function getFormData() {
    return {
        containerType:
            containerRadios.find(rb => rb.checked)?.value || "",

        productName:
            dom.productName.value.trim(),

        lot:
            dom.lotNumber.value.trim(),

        selectedLevels:
            levelCheckboxes
                .filter(cb => cb.checked)
                .map(cb => cb.value),

        expiry:
            dom.expiryDate.value.trim(),

        openStability:
            dom.openStability.value.trim(),

        printMode:
            dom.printModeThermal.checked
                ? "thermal"
                : "avery",

        thermalQty:
            Math.min(
                CONFIG.thermal.maxQuantity,
                Math.max(
                    1,
                    parseInt(dom.labelQty.value || "1", 10)
                )
            )
    };
}
function createPdf(printMode) {
    const { jsPDF } = window.jspdf;
    if (printMode === "thermal") {
        const w =
            parseFloat(dom.labelW.value)
            || CONFIG.avery.width;
        const h =
            parseFloat(dom.labelH.value)
            || CONFIG.avery.height;
        return new jsPDF({
            orientation:
                w > h
                    ? "landscape"
                    : "portrait",
            unit: "in",
            format: [w, h]
        });
    }

    return new jsPDF({
        unit: "in",
        format: "letter"
    });
}
function getLayout(printMode) {
    const h =
    parseFloat(dom.labelH.value) ||
    CONFIG.avery.height;
    return {

        cols:
            printMode === "thermal"
                ? 1
                : CONFIG.avery.columns,
        labelWidth: CONFIG.avery.width,
        labelHeight: CONFIG.avery.height,
        colGap: printMode === "thermal" ? 0 : CONFIG.avery.columnGap,

        rowGap: printMode === "thermal" ? h-CONFIG.avery.height : 0,
        marginLeft: printMode === "thermal" ? 0 : CONFIG.avery.marginLeft,
        marginTop: printMode === "thermal" ? 0 : CONFIG.avery.marginTop,
        innerPadding: CONFIG.avery.padding,
        gap: CONFIG.avery.gap,
        availableWidth: CONFIG.avery.width - 2 * CONFIG.avery.padding,
        availableHeight: CONFIG.avery.height - 2 * CONFIG.avery.padding,
        labelsPerPage:
            printMode === "thermal"
                ? 1
                : CONFIG.avery.columns *
                Math.floor((11 - CONFIG.avery.marginTop) /
                            CONFIG.avery.height)
    };
}
function validateThermalSettings(printMode) {
    
    if (printMode === "thermal") {
        const h =
            parseFloat(dom.labelH.value) || CONFIG.avery.height;
        const w =
            parseFloat(dom.labelW.value) || CONFIG.avery.width;

        if (h < CONFIG.thermal.minHeight) {
            alert(`Minimum thermal label height is ${CONFIG.thermal.minHeight} inches.`);
            return false;
        }
        if (w < CONFIG.thermal.minWidth) {
            alert(`Minimum thermal label width is ${CONFIG.thermal.minWidth} inches.`);
            return false;
        }
    }
    return true;
}
function getLabelPosition(index, layout, printMode) {

    const row = (printMode === "thermal")
        ? 0
        : Math.floor(index / layout.cols) %
          Math.floor((11 - layout.marginTop) / layout.labelHeight);

    const col = (printMode === "thermal")
        ? 0
        : index % layout.cols;

    return {

        row,
        col,

        x: layout.marginLeft +
           col * (layout.labelWidth + layout.colGap),

        y: layout.marginTop +
           row * (layout.labelHeight + layout.rowGap)

    };
}
function addPageIfNeeded(pdf, index, layout, printMode) {
    if (printMode === "thermal") {
        if (index > 0) {
            pdf.addPage();
        }
        return;
    }
    if (index > 0 && index % layout.labelsPerPage === 0) {
        pdf.addPage();
    }   
}
function getSafeFileName(name) {
    return (name || "Barcode")
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '_');
}   

function preparePdfForDownload(pdf, form) {

    const blob = pdf.output("blob");

    return {
        url: URL.createObjectURL(blob),
        filename: `${getSafeFileName(form.productName)}_${form.printMode}.pdf`
    };

}
function restoreContainerType() {

    const lastContainerType =
        localStorage.getItem("lastContainerType") || "Vial";

    containerRadios.forEach(rb => {
        rb.checked = (rb.value === lastContainerType);
    });

}
function resetForm() {

    restoreContainerType();

    [
    dom.productName,
    dom.lotNumber,
    dom.expiryDate,
    dom.openStability
    ].forEach(input => input.value = "");
    dom.showBorder.checked = false;

    dom.expiryDate.style.borderColor = COLORS.normalBorder;
    dom.expiryDate.title = ""; 
    // Clear all level checkboxes
    dom.levelCheckboxes.forEach(cb => cb.checked = false);

    // -----------------------------
    // Output mode
    // Default back to Avery
    // -----------------------------
    dom.printModeAvery.checked = true;
    dom.printModeThermal.checked = false;

    // -----------------------------
    // Thermal settings
    // -----------------------------
    dom.labelH.value = "";
    dom.labelW.value = "";
    dom.labelQty.value = "1";

    // Reset thermal/Avery UI
    updatePrintModeUI();
    // Reset Generate button
    updateGenerateButton();
}

async function generatePdf(form) {

    const totalLabels =
        form.printMode === "avery"
            ? CONFIG.avery.totalLabels
            : form.thermalQty;

    const pdf = createPdf(form.printMode);

    const layout = getLayout(form.printMode);

    if (!validateThermalSettings(form.printMode)) {
        return null;
    }

    let globalIndex = 0;
        for (const level of form.selectedLevels) {

            const labelsForThisLevel =
                form.printMode === "avery"
                ? Math.floor(totalLabels / form.selectedLevels.length)
                : totalLabels;

            const serials = generateSerialSet(labelsForThisLevel);

            for (let i = 0; i < labelsForThisLevel; i++) {
                addPageIfNeeded(pdf, globalIndex, layout, form.printMode);

                const serial = serials[i];

                const pos = 
                    getLabelPosition(globalIndex, layout, form.printMode);

                drawBorder(pdf, pos.x, pos.y, layout.labelWidth, layout.labelHeight);

                if (form.containerType === "Vial") {
                    await generateVialLabel(
                        pdf, pos.x, pos.y,
                        layout.availableWidth, layout.availableHeight,
                        layout.innerPadding, layout.gap,
                        form.productName, form.lot, level,
                        form.expiry, form.openStability,
                        serial   // 🔥 pass fixed serial
                    );
                } else {
                    await generateSampleLabel(
                        pdf, pos.x, pos.y,
                        layout.availableWidth, layout.availableHeight,
                        layout.innerPadding,
                        form.productName, form.lot, level,
                        form.expiry, form.openStability
                    );
                }
            globalIndex++;}
        }
    return pdf;
}
function initializeApp() {

    restoreContainerType();

    dom.printModeAvery.checked = true;
    dom.printModeThermal.checked = false;

    updatePrintModeUI();
    updatePlaceholders();
    updateGenerateButton();
}
/*======================================================
  EVENT LISTENERS
======================================================*/
// Generate
dom.generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;
    isGenerating = true;

    dom.generateBtn.disabled = true;
    dom.generateBtn.textContent = "Generating...";

    await new Promise(resolve => setTimeout(resolve, 0)); // allow UI update before heavy processing

    try {
        // generation
        const form = getFormData();
        const pdf = await generatePdf(form);
        if (!pdf) return;

        const download = preparePdfForDownload(pdf, form);

        showDownloadModal(download.url, download.filename);
        dom.generateBtn.textContent = "✔ PDF Generated";
    } catch (err) {
    alert("Barcode generation failed.");
    console.error(err);
    } finally {
    isGenerating = false;
    dom.generateBtn.disabled = false;
    updateGenerateButton();
    dom.generateBtn.textContent = "Generate Barcodes";
    }
});

// Reset
dom.resetBtn.addEventListener('click', resetForm);

// Download modal
dom.downloadBtn.addEventListener("click", downloadPdf);
//window.addEventListener("click", (e) => {
//    if (e.target === dom.downloadModal) {
//        closeDownloadModal();
//    }
//});
dom.modalClose.addEventListener(
    "click",
    closeDownloadModal
);

// Print mode
dom.printModeAvery.addEventListener(
    'change',
    updatePrintModeUI
);

dom.printModeThermal.addEventListener(
    'change',
    updatePrintModeUI
);

// Validation
dom.levelCheckboxes.forEach(cb => 
    cb.addEventListener("change", updateGenerateButton)
);
dom.lotNumber.addEventListener("input", updateGenerateButton);

// Limit characters
dom.productName.addEventListener("input", () => {
    limitLength(
        dom.productName,
        CONFIG.limits.productName
    );
});

dom.lotNumber.addEventListener("input", () => {
    limitLength(
        dom.lotNumber,
        CONFIG.limits.lotNumber
    );
});

dom.openStability.addEventListener("input", () => {
    limitLength(
        dom.openStability,
        CONFIG.limits.openStability
    );
});

dom.expiryDate.addEventListener('input', e => {
    let value = e.target.value.replace(/\D/g,''); // remove non-digits

    if(value.length > 2 && value.length <= 4) {
        value = value.slice(0,2) + '/' + value.slice(2);
    } else if(value.length > 4 && value.length <= 8) {
        value = value.slice(0,2) + '/' + value.slice(2,4) + '/' + value.slice(4,8);
    } else if(value.length > 8) {
        value = value.slice(0,2) + '/' + value.slice(2,4) + '/' + value.slice(4,8);
    }

    e.target.value = value;

    if(value && !isValidExpiry(value)){
        dom.expiryDate.style.borderColor = COLORS.errorBorder;
        dom.expiryDate.title = "Invalid date (MM/DD/YYYY)";
    } else {
        dom.expiryDate.style.borderColor = COLORS.normalBorder;
        dom.expiryDate.title = "";
    }
});
dom.calendarButton.addEventListener("click", () => {

    if (dom.expiryDatePicker.showPicker) {
        dom.expiryDatePicker.showPicker();
    } else {
        dom.expiryDatePicker.click();
    }

});
dom.expiryDatePicker.addEventListener("change", () => {

    if (!dom.expiryDatePicker.value) return;

    const d = new Date(dom.expiryDatePicker.value);

    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    const yyyy = d.getFullYear();

    dom.expiryDate.value =
        `${mm}/${dd}/${yyyy}`;

});

//Startup
initializeApp();

// Window
window.addEventListener("resize", updatePlaceholders);

containerRadios.forEach(radio => {
    radio.addEventListener("change", () => {

        // Remember last selection
        localStorage.setItem(
            "lastContainerType",
            radio.value
        );

        updateGenerateButton();

    });
});
