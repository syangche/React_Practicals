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

  // Handle form submission
  const onSubmit = async (data) => {
    // Reset states for new upload
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    
    try {
      // Create FormData object for multipart/form-data submission
      const formData = new FormData();
      formData.append('file', data.file[0]);
      formData.append('name', data.name);
      
      // Make POST request with axios to track upload progress
      const response = await axios.post('/api/upload', formData, {
        // Track and update progress during upload
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentage);
        }
      });
      
      // Handle successful response
      setUploadResult({
        success: true,
        message: 'File uploaded successfully!',
        data: response.data
      });
    } catch (error) {
      // Handle error response
      setUploadResult({
        success: false,
        message: error.response?.data?.error || 'Upload failed'
      });
    } finally {
      // Reset upload status
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
        
        // Create preview for the first file if it's an image
        if (acceptedFiles.length > 0) {
          const file = acceptedFiles[0];
          if (file.type.startsWith('image/')) {
            // Create object URL for preview
            const previewUrl = URL.createObjectURL(file);
            setFilePreview({
              url: previewUrl,
              name: file.name,
              type: file.type
            });
          } else {
            // Clear preview if not an image
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
        
        {/* File preview section */}
        {filePreview && filePreview.type.startsWith('image/') && (
          <div className="mb-4">
            <h3 className="font-medium mb-1">Preview:</h3>
            <div className="border rounded p-2">
              <img 
                src={filePreview.url} 
                alt={filePreview.name} 
                className="max-w-full h-auto max-h-40 rounded"
              />
              <p className="text-sm text-gray-500 mt-1">{filePreview.name}</p>
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