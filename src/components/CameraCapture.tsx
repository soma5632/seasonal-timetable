import { useRef, useState, useEffect } from "react";
import { Box, Button, Text } from "@chakra-ui/react";

type Props = {
  onCapture: (blob: Blob) => void;
};

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error("カメラアクセス失敗:", err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCapturing(false);
  };

  const handleCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob((blob) => {
      if (blob) onCapture(blob);
      stopCamera();
    }, "image/jpeg");
  };

  return (
    <Box textAlign="center">
      {!isCapturing && (
        <Button colorScheme="blue" onClick={startCamera}>
          撮影を開始
        </Button>
      )}

      {isCapturing && (
        <Box position="relative">
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%" }} />
          {/* 撮影ガイド枠 */}
          <Box
            position="absolute"
            top="20%"
            left="10%"
            width="80%"
            height="60%"
            border="3px dashed red"
            pointerEvents="none"
          />
          <Text mt={2} fontSize="sm" color="gray.600">
            この枠にスケジュール表を合わせて、正面から撮影してください
          </Text>
          <Button mt={2} colorScheme="green" onClick={handleCapture}>
            撮影
          </Button>
          <Button mt={2} variant="outline" onClick={stopCamera}>
            キャンセル
          </Button>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Box>
      )}
    </Box>
  );
}