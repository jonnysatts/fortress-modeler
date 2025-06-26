import { useState, useEffect } from 'react';

export const useImageUpload = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        setDataUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    setDataUrl(null);
  };

  const setInitialImage = (imageUrl: string | null | undefined) => {
    if (imageUrl) {
      setPreview(imageUrl);
      setDataUrl(imageUrl);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup any object URLs if we create them in the future
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return {
    preview,
    dataUrl,
    handleImageChange,
    removeImage,
    setInitialImage
  };
};