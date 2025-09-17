export default function FilePreview({
  showFilePicker,
  selectedFiles,
  setSelectedFiles,
  setShowFilePicker,
  fileInputRef,
}) {
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.startsWith("video/")) return "🎥";
    if (fileType.startsWith("audio/")) return "🎵";
    if (fileType.includes("pdf")) return "📄";
    return "📎";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!showFilePicker || selectedFiles.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-50 rounded border">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-sm">Selected Files</h4>
        <button
          onClick={() => {
            setSelectedFiles([]);
            setShowFilePicker(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="text-red-600 text-sm hover:underline"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {selectedFiles.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-xs bg-white p-2 rounded"
          >
            <div className="flex items-center space-x-2 flex-1">
              <span>{getFileIcon(file.type)}</span>
              <span className="truncate">{file.name}</span>
              <span className="text-gray-500">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <button
              onClick={() => removeFile(index)}
              className="text-red-600 hover:text-red-800 ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}