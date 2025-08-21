import { memo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { webcontainer } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';
import { path } from '~/utils/path';

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

    const getBuildFiles = useCallback(async () => {
      try {
        const container = await webcontainer;
        const artifact = workbenchStore.firstArtifact;

        if (!artifact) {
          console.warn('No active artifact found');
          return {
            buildPath: '',
            totalFiles: 0,
            buildFiles: 0,
            configFiles: 0,
            files: [],
          };
        }

        // Get build output path from artifact runner
        let buildPath = '/dist'; // Default fallback

        if (artifact.runner.buildOutput?.path) {
          // Remove /home/project from buildPath if it exists
          buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');
        }

        console.log('Original buildPath:', buildPath);

        // List of common output directories to check
        const commonOutputDirs = [buildPath, '/dist', '/build', '/out', '/output', '/.next', '/public'];

        // Find the actual build directory
        let finalBuildPath = buildPath;
        let buildPathExists = false;

        for (const dir of commonOutputDirs) {
          try {
            await container.fs.readdir(dir);
            finalBuildPath = dir;
            buildPathExists = true;
            console.log(`Using build directory: ${finalBuildPath}`);
            break;
          } catch (error) {
            console.log(`Directory ${dir} doesn't exist, trying next option`);
            continue;
          }
        }

        if (!buildPathExists) {
          console.warn('Could not find build output directory');
          return {
            buildPath: '',
            totalFiles: 0,
            buildFiles: 0,
            configFiles: 0,
            files: [],
          };
        }

        // Get all build files recursively
        async function getAllBuildFiles(dirPath: string): Promise<any[]> {
          const files: any[] = [];

          try {
            const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
              const fullPath = path.join(dirPath, entry.name);
              const relativePath = fullPath.replace(finalBuildPath, '') || `/${entry.name}`;

              if (entry.isFile()) {
                try {
                  const content = await container.fs.readFile(fullPath, 'utf-8');

                  files.push({
                    path: relativePath,
                    fullPath,
                    type: 'file',
                    size: content.length,
                    isBuildRelated: true,
                    content: content.substring(0, 1000), // First 1000 chars for preview
                  });
                } catch (error) {
                  // Handle binary files or files that can't be read as text
                  files.push({
                    path: relativePath,
                    fullPath,
                    type: 'file',
                    isBuildRelated: true,
                    error: 'Could not read file content (possibly binary)',
                  });
                }
              } else if (entry.isDirectory()) {
                files.push({
                  path: relativePath,
                  fullPath,
                  type: 'directory',
                  isBuildRelated: true,
                });

                // Recursively get files from subdirectories
                const subFiles = await getAllBuildFiles(fullPath);
                files.push(...subFiles);
              }
            }
          } catch (error) {
            console.warn(`Could not read directory ${dirPath}:`, error);
          }

          return files;
        }

        // Get all source project files for additional context
        async function getAllProjectFiles(dirPath: string): Promise<any[]> {
          const files: any[] = [];

          try {
            const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
              const fullPath = path.join(dirPath, entry.name);

              if (entry.isFile()) {
                // Only include important config files
                const importantFiles = [
                  'package.json',
                  'package-lock.json',
                  'yarn.lock',
                  'pnpm-lock.yaml',
                  'vite.config.js',
                  'vite.config.ts',
                  'webpack.config.js',
                  'next.config.js',
                  'nuxt.config.js',
                  'rollup.config.js',
                  'tsconfig.json',
                  'tailwind.config.js',
                  'postcss.config.js',
                  '.env',
                  '.env.local',
                  '.env.production',
                ];

                if (importantFiles.includes(entry.name)) {
                  try {
                    const content = await container.fs.readFile(fullPath, 'utf-8');

                    let relativePath = fullPath;

                    if (fullPath.startsWith('/home/project/')) {
                      relativePath = fullPath.replace('/home/project/', '');
                    } else if (fullPath.startsWith('./')) {
                      relativePath = fullPath.replace('./', '');
                    }

                    files.push({
                      path: relativePath,
                      fullPath,
                      type: 'config-file',
                      size: content.length,
                      isBuildRelated: true,
                      content: content.substring(0, 1000),
                    });
                  } catch (error) {
                    console.log(`Skipping file ${entry.name}:`, error);
                  }
                }
              } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                // Recursively check subdirectories for config files
                const subFiles = await getAllProjectFiles(fullPath);
                files.push(...subFiles);
              }
            }
          } catch (error) {
            console.warn(`Could not read project directory ${dirPath}:`, error);
          }

          return files;
        }

        // Get build files
        const buildFiles = await getAllBuildFiles(finalBuildPath);

        // Get project config files
        let projectFiles: any[] = [];

        try {
          projectFiles = await getAllProjectFiles('.');
        } catch {
          // Fallback to /home/project if current directory doesn't work
          try {
            projectFiles = await getAllProjectFiles('/home/project');
          } catch (error) {
            console.warn('Could not read project files:', error);
          }
        }

        // Combine build files and project config files
        const allFiles = [...buildFiles, ...projectFiles];

        return {
          buildPath: finalBuildPath,
          totalFiles: allFiles.length,
          buildFiles: buildFiles.length,
          configFiles: projectFiles.length,
          files: allFiles,
        };
      } catch (error) {
        console.error('Error getting build files:', error);
        return {
          buildPath: '',
          totalFiles: 0,
          buildFiles: 0,
          configFiles: 0,
          files: [],
        };
      }
    }, []);

    const consoleBuildFiles = useCallback(async () => {
      console.log('🔨 === BUILD FILES CAPTURE STARTED ===');
      console.log('📅 Timestamp:', new Date().toISOString());

      try {
        const buildData = await getBuildFiles();

        if (!buildData || !buildData.files || buildData.files.length === 0) {
          console.warn('No build files data available');
          return {
            buildPath: '',
            totalFiles: 0,
            buildFiles: 0,
            configFiles: 0,
            files: [],
          };
        }

        console.log('📁 Build Summary:');
        console.log(`  📂 Build Path: ${buildData.buildPath}`);
        console.log(`  📊 Total Files: ${buildData.totalFiles}`);
        console.log(`  🏗️ Build Files: ${buildData.buildFiles}`);
        console.log(`  ⚙️ Config Files: ${buildData.configFiles}`);

        console.log('🗂️ Build files structure:');

        // Group files by type
        const directories = buildData.files.filter((file: any) => file.type === 'directory');
        const buildFiles = buildData.files.filter((file: any) => file.type === 'file');
        const configFiles = buildData.files.filter((file: any) => file.type === 'config-file');

        if (directories.length > 0) {
          console.log('📂 Build Directories:');
          directories.forEach((dir: any, index: number) => {
            console.log(`  ${index + 1}. ${dir.path}`, {
              fullPath: dir.fullPath,
            });
          });
        }

        if (buildFiles.length > 0) {
          console.log('🏗️ Build Output Files:');
          buildFiles.forEach((file: any, index: number) => {
            console.log(`  ${index + 1}. ${file.path}`, {
              size: file.size ? `${file.size} bytes` : 'unknown',
              preview: file.content ? `${file.content.substring(0, 100)}...` : 'no preview',
              error: file.error || null,
              fullPath: file.fullPath,
            });
          });
        }

        if (configFiles.length > 0) {
          console.log('⚙️ Project Configuration Files:');
          configFiles.forEach((file: any, index: number) => {
            console.log(`  ${index + 1}. ${file.path}`, {
              size: file.size ? `${file.size} bytes` : 'unknown',
              preview: file.content ? `${file.content.substring(0, 100)}...` : 'no preview',
              fullPath: file.fullPath,
            });
          });
        }

        // Console the complete build files data as JSON for API usage
        console.log('🔧 Complete build files data (JSON):');
        console.log(JSON.stringify(buildData, null, 2));

        console.log('🔨 === BUILD FILES CAPTURE COMPLETED ===');

        return buildData;
      } catch (error) {
        console.error('❌ Error capturing build files:', error);
        console.log('🔨 === BUILD FILES CAPTURE FAILED ===');

        return {
          buildPath: '',
          totalFiles: 0,
          buildFiles: 0,
          configFiles: 0,
          files: [],
        };
      }
    }, [getBuildFiles]);

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
        // First capture build files, then take screenshot
        consoleBuildFiles();
      }
    }, [shouldTakeScreenshot, captureFullIframeScreenshot, consoleBuildFiles]);

    // This component doesn't render any visible UI
    return null;
  },
);

FullScreenshotCapture.displayName = 'FullScreenshotCapture';
