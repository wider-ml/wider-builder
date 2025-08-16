import { memo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

interface FullScreenshotCaptureProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  shouldTakeScreenshot: boolean;
  onScreenshotComplete?: () => void;
}

export const FullScreenshotCapture = memo(
  ({ iframeRef, shouldTakeScreenshot, onScreenshotComplete }: FullScreenshotCaptureProps) => {
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isCapturingRef = useRef(false);

    useEffect(() => {
      // Cleanup function to stop all tracks when component unmounts
      return () => {
        cleanupResources();
      };
    }, []);

    const cleanupResources = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      isCapturingRef.current = false;
    }, []);

    const initializeStream = async (): Promise<MediaStream | null> => {
      if (!mediaStreamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            audio: false,
            video: {
              displaySurface: 'window',
              preferCurrentTab: true,
              surfaceSwitching: 'include',
              systemAudio: 'exclude',
            },
          } as MediaStreamConstraints);

          // Add handler for when sharing stops
          stream.addEventListener('inactive', () => {
            cleanupResources();
          });

          mediaStreamRef.current = stream;

          // Initialize video element if needed
          if (!videoRef.current) {
            const video = document.createElement('video');
            video.style.opacity = '0';
            video.style.position = 'fixed';
            video.style.pointerEvents = 'none';
            video.style.zIndex = '-1';
            video.style.top = '-9999px';
            document.body.appendChild(video);
            videoRef.current = video;
          }

          // Set up video with the stream
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          return stream;
        } catch (error) {
          console.error('Failed to initialize stream:', error);
          toast.error('Failed to initialize screen capture');

          return null;
        }
      }

      return mediaStreamRef.current;
    };

    const captureFullIframeScreenshot = useCallback(async () => {
      if (isCapturingRef.current || !iframeRef.current) {
        return;
      }

      isCapturingRef.current = true;

      try {
        const iframe = iframeRef.current;
        const iframeRect = iframe.getBoundingClientRect();

        const stream = await initializeStream();

        if (!stream || !videoRef.current) {
          throw new Error('Failed to initialize video stream');
        }

        // Wait for video to be ready and stable
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Ensure video has loaded properly
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          throw new Error('Video stream not ready');
        }

        // Calculate scale factor between video and screen
        const scaleX = videoRef.current.videoWidth / window.innerWidth;
        const scaleY = videoRef.current.videoHeight / window.innerHeight;

        // Get window scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Calculate the scaled coordinates for the iframe area
        const scaledX = Math.round((iframeRect.left + scrollX) * scaleX);
        const scaledY = Math.round((iframeRect.top + scrollY) * scaleY);
        const scaledWidth = Math.round(iframeRect.width * scaleX);
        const scaledHeight = Math.round(iframeRect.height * scaleY);

        // Create temporary canvas for full screenshot
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth;
        tempCanvas.height = videoRef.current.videoHeight;

        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) {
          throw new Error('Failed to get temporary canvas context');
        }

        // Draw the full video frame
        tempCtx.drawImage(videoRef.current, 0, 0);

        // Create final canvas for the iframe area only
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(iframeRect.width);
        canvas.height = Math.round(iframeRect.height);

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw only the iframe area from the full screenshot
        ctx.drawImage(
          tempCanvas,
          scaledX,
          scaledY,
          scaledWidth,
          scaledHeight, // Source area (iframe in full screenshot)
          0,
          0,
          canvas.width,
          canvas.height, // Destination (full final canvas)
        );

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        });

        // Create a FileReader to convert blob to base64
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64Image = e.target?.result as string;

          // Console the base64 image data for backend API usage
          console.log('🖼️ Full iframe screenshot captured (Base64):', base64Image);
          console.log('📊 Screenshot details:', {
            size: blob.size,
            type: blob.type,
            dimensions: `${canvas.width}x${canvas.height}`,
            timestamp: new Date().toISOString(),
          });

          // Create temporary download functionality
          const downloadLink = document.createElement('a');
          downloadLink.href = base64Image;
          downloadLink.download = `iframe-screenshot-${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          toast.success('Full iframe screenshot captured and downloaded');

          // Call the completion callback if provided
          onScreenshotComplete?.();
        };

        reader.onerror = () => {
          toast.error('Failed to process screenshot');
          onScreenshotComplete?.();
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to capture iframe screenshot:', error);
        toast.error('Failed to capture screenshot');
        onScreenshotComplete?.();
      } finally {
        isCapturingRef.current = false;

        // Clean up resources after capture
        setTimeout(() => {
          cleanupResources();
        }, 1000);
      }
    }, [iframeRef, onScreenshotComplete, cleanupResources]);

    // Effect to trigger screenshot when shouldTakeScreenshot becomes true
    useEffect(() => {
      if (shouldTakeScreenshot && !isCapturingRef.current) {
        captureFullIframeScreenshot();
      }
    }, [shouldTakeScreenshot, captureFullIframeScreenshot]);

    // This component doesn't render any visible UI
    return null;
  },
);

FullScreenshotCapture.displayName = 'FullScreenshotCapture';
