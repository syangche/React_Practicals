"use client"

import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

export default function FileUploadForm() {
  // Define constants for validation
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
  const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  
  // Initialize React Hook Form
  const { control, register, handleSubmit, formState: { errors } } = useForm();
  
  // State for tracking upload progress and status
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Update the onSubmit function to use your Express backend URL
  const onSubmit = async (data) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', data.file[0]);
      formData.append('name', data.name);
      
      // Log what we're trying to upload for debugging
      console.log('Uploading file:', data.file[0].name, 'Type:', data.file[0].type);
      
      // Change the URL to point to your Express backend
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentage);
        }
      });
      
      setUploadResult({
        success: true,
        message: 'File uploaded successfully!',
        data: response.data
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.error || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Custom Dropzone component for drag & drop functionality
  const Dropzone = ({ onDrop, maxSize, accept }) => {
    // Initialize react-dropzone with configuration
    const { 
      getRootProps, 
      getInputProps, 
      isDragActive, 
      fileRejections 
    } = useDropzone({ 
      onDrop: (acceptedFiles) => {
        // Process the dropped files
        onDrop(acceptedFiles);
        
        // Create preview info for the file (both images and PDFs)
        if (acceptedFiles.length > 0) {
          const file = acceptedFiles[0];
          
          // For images, create preview URL
          if (file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            setFilePreview({
              url: previewUrl,
              name: file.name,
              type: file.type
            });
          } 
          // For PDFs, just store the name and type (no preview URL needed)
          else if (file.type === 'application/pdf') {
            setFilePreview({
              name: file.name,
              type: file.type
            });
          } 
          else {
            // For other file types
            setFilePreview(null);
          }
        }
      },
      maxSize,
      accept,
      multiple: false // Allow only single file upload
    });
    
    // Display rejected files with reasons
    const fileRejectionItems = fileRejections.map(({ file, errors }) => (
      <li key={file.path} className="text-red-500">
        {file.name} - {errors.map(e => e.message).join(', ')}
      </li>
    ));

    // Render the dropzone UI
    return (
      <div className="mt-1">
        {/* Dropzone container with styling based on drag state */}
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-6 cursor-pointer text-center ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          {/* Hidden file input */}
          <input {...getInputProps()} />
          
          {/* Display different message based on drag state */}
          {isDragActive ? (
            <p className="text-blue-500">Drop the file here...</p>
          ) : (
            <div>
              <p>Drag & drop a file here, or click to select</p>
              <p className="text-sm text-gray-500 mt-1">
                (Only JPEG, PNG, and PDF files under 5MB are accepted)
              </p>
            </div>
          )}
        </div>
        
        {/* Display any file validation errors */}
        {fileRejectionItems.length > 0 && (
          <ul className="mt-2">{fileRejectionItems}</ul>
        )}
      </div>
    );
  };

  // Main component render
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">File Upload Form</h1>
      
      {/* Form with validation */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-md">
        {/* Name input field */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 font-medium">Your Name:</label>
          <input 
            id="name"
            type="text" 
            {...register('name', { required: 'Name is required' })}
            className="w-full p-2 border rounded" 
          />
          {/* Display name field validation errors */}
          {errors.name && <p className="text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        
        {/* File upload field with Controller for custom input handling */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Upload File:</label>
          <Controller
            name="file"
            control={control}
            rules={{ 
              required: 'File is required',
              validate: {
                // Validate file size
                fileSize: files => !files?.[0] || files[0].size <= MAX_FILE_SIZE || 
                  'File size must be less than 5MB',
                // Validate file type
                fileType: files => !files?.[0] || ACCEPTED_FILE_TYPES.includes(files[0].type) || 
                  'Only JPEG, PNG, and PDF files are accepted'
              }
            }}
            render={({ field: { onChange, value } }) => (
              <Dropzone 
                onDrop={acceptedFiles => onChange(acceptedFiles)}
                maxSize={MAX_FILE_SIZE}
                accept={{
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                  'application/pdf': ['.pdf']
                }}
              />
            )}
          />
          {/* Display file field validation errors */}
          {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
        </div>
        
        {/* Preview section - show for both images and PDFs */}
        {filePreview && (
          <div className="mb-4">
            <h3 className="font-medium mb-1">Preview:</h3>
            <div className="border rounded p-2">
              {filePreview.type?.startsWith('image/') ? (
                /* Show actual preview for images */
                <img 
                  src={filePreview.url} 
                  alt={filePreview.name} 
                  className="max-w-full h-auto max-h-40 rounded"
                />
              ) : filePreview.type === 'application/pdf' ? (
                /* Just show file name for PDFs */
                <div className="py-2 px-3 bg-gray-100 rounded flex items-center">
                  <svg className="w-6 h-6 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"></path>
                    <path d="M3 8a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"></path>
                  </svg>
                  <span>{filePreview.name}</span>
                </div>
              ) : (
                /* Generic file info for other types */
                <div>File selected: {filePreview.name}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Submit button with loading state */}
        <button 
          type="submit" 
          disabled={isUploading}
          className={`w-full p-2 text-white rounded ${
            isUploading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
        
        {/* Progress bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 text-sm">{uploadProgress}%</p>
          </div>
        )}
        
        {/* Upload result message */}
        {uploadResult && (
          <div className={`mt-4 p-3 rounded ${
            uploadResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <p>{uploadResult.message}</p>
            {uploadResult.success && uploadResult.data?.filename && (
              <p className="text-sm mt-1">Uploaded as: {uploadResult.data.filename}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}