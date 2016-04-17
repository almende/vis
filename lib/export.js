function ExportCanvasToPng(canvasId, downloadLinkId, exportFileName) {
    var canvas = document.getElementById(canvasId);
    var dataURL = canvas[0].toDataURL('image/png');
    document.getElementById(downloadLinkId).href = dataURL;
    document.getElementById(downloadLinkId).download = exportFileName;
},
