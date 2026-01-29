import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Upload, FileIcon, Image, FileAudio, FileVideo } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getMediaTypeFromFile = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};

const getIconForMediaType = (mediaType) => {
  switch (mediaType) {
    case 'image': return <Image className="w-4 h-4" />;
    case 'audio': return <FileAudio className="w-4 h-4" />;
    case 'video': return <FileVideo className="w-4 h-4" />;
    default: return <FileIcon className="w-4 h-4" />;
  }
};

export function MediaUploader({ attachments, onMediaAdded, onMediaRemoved }) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const mediaType = getMediaTypeFromFile(file.type);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('media_type', mediaType);

        const response = await axios.post(`${API}/media/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          },
        });

        onMediaAdded({
          media_url: `${BACKEND_URL}${response.data.media_url}`,
          media_type: response.data.media_type,
          filename: response.data.filename,
          file_size: response.data.file_size
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.detail || error.message}`);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'audio/*': ['.ogg', '.mp3'],
      'video/mp4': ['.mp4'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div className="space-y-4" data-testid="media-uploader">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-300 hover:border-zinc-400'
        }`}
        data-testid="dropzone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <Upload className="mx-auto mb-2 text-zinc-400" size={24} />
        <p className="text-sm font-medium text-zinc-700">
          {isDragActive ? 'Drop files here' : 'Drag files here or click to select'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Images (5MB), Audio/Video/PDF (16MB)
        </p>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" data-testid="upload-progress" />
          <p className="text-xs text-zinc-500">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {attachments.length > 0 && (
        <Card className="p-4" data-testid="attachment-list">
          <h4 className="text-sm font-medium mb-3 font-mono uppercase tracking-wider text-zinc-600">Attached Files</h4>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-zinc-50 rounded"
                data-testid={`attachment-${index}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getIconForMediaType(attachment.media_type)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.filename}</p>
                    <p className="text-xs text-zinc-500">
                      {attachment.media_type} • {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMediaRemoved(index)}
                  className="ml-2 flex-shrink-0"
                  data-testid={`remove-attachment-${index}`}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
