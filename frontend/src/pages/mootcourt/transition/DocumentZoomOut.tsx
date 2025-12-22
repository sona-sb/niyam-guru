import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export const DocumentZoomOut: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const document3DRef = useRef<THREE.Mesh | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const shadowMaterialRef = useRef<THREE.ShadowMaterial | null>(null);
  const frontMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const deskRef = useRef<THREE.Mesh | null>(null);
  
  const stateRef = useRef({
    zoomOutProgress: 0,
    isZoomingOut: true,
    isComplete: false,
    documentRotation: { x: 0, y: 0 },
    documentPosition: { x: 0, y: 0, z: 4.85 },
    documentScale: 8,
    cameraZ: 5,
    deskVisible: false,
    hasNavigated: false
  });

  const createDocumentTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 664;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#f5f3ee';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    
    ctx.strokeStyle = '#d0ccc5';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    ctx.strokeStyle = '#e0dcd5';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('FILE A CONSUMER', canvas.width / 2, 100);
    ctx.fillText('COMPLAINT', canvas.width / 2, 135);
    
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 155);
    ctx.lineTo(canvas.width - 120, 155);
    ctx.stroke();
    
    ctx.fillStyle = '#5a5a5a';
    ctx.font = '14px Georgia, serif';
    ctx.fillText('OFFICIAL FILING DOCUMENT', canvas.width / 2, 180);
    
    ctx.strokeStyle = '#c5c0b8';
    ctx.lineWidth = 1;
    const lineStartX = 60;
    const lineEndX = canvas.width - 60;
    const formLabels = [
      'Complainant Name:',
      'Address:',
      'Date of Incident:',
      'Description of Complaint:',
      '',
      '',
      'Relief Sought:',
      ''
    ];
    
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    
    let yPos = 230;
    formLabels.forEach((label) => {
      if (label) {
        ctx.fillText(label, lineStartX, yPos - 5);
      }
      ctx.beginPath();
      ctx.moveTo(lineStartX, yPos);
      ctx.lineTo(lineEndX, yPos);
      ctx.stroke();
      yPos += 35;
    });
    
    yPos += 20;
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '11px Georgia, serif';
    
    const checkboxes = [
      'I affirm that the information provided is true and accurate',
      'I understand this filing initiates a formal process',
      'I consent to the terms and conditions of this proceeding'
    ];
    
    checkboxes.forEach((text) => {
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(lineStartX, yPos - 10, 12, 12);
      ctx.fillText(text, lineStartX + 20, yPos);
      yPos += 25;
    });
    
    yPos = canvas.height - 120;
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '12px Georgia, serif';
    ctx.fillText('Signature:', lineStartX, yPos);
    ctx.strokeStyle = '#c5c0b8';
    ctx.beginPath();
    ctx.moveTo(lineStartX + 70, yPos);
    ctx.lineTo(canvas.width / 2 - 20, yPos);
    ctx.stroke();
    
    ctx.fillText('Date:', canvas.width / 2 + 20, yPos);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + 60, yPos);
    ctx.lineTo(lineEndX, yPos);
    ctx.stroke();
    
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('DOC-2025-CC-0001', canvas.width - 40, canvas.height - 35);
    
    return new THREE.CanvasTexture(canvas);
  };

  const createWoodTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base wood color
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#8b6f47');
    gradient.addColorStop(0.5, '#a0826d');
    gradient.addColorStop(1, '#7a5c3f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Wood grain lines
    ctx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
    for (let i = 0; i < 80; i++) {
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      const y = Math.random() * canvas.height;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        canvas.width * 0.25, y + Math.random() * 20 - 10,
        canvas.width * 0.75, y + Math.random() * 20 - 10,
        canvas.width, y
      );
      ctx.stroke();
    }
    
    // Add texture noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    
    return new THREE.CanvasTexture(canvas);
  };

  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  const easeOutCubic = (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  };

  const easeInOutCubic = (t: number) => {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 4, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.camera.left = -5;
    mainLight.shadow.camera.right = 5;
    mainLight.shadow.camera.top = 5;
    mainLight.shadow.camera.bottom = -5;
    mainLight.shadow.radius = 4;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
    fillLight.position.set(-2, 2, 1);
    scene.add(fillLight);
    
    // Create desk
    const deskWidth = 6;
    const deskHeight = 0.15;
    const deskDepth = 4;
    
    const woodTexture = createWoodTexture();
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(3, 2);
    
    const deskGeometry = new THREE.BoxGeometry(deskWidth, deskHeight, deskDepth);
    const deskMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(0, -1.5, -1);
    desk.castShadow = true;
    desk.receiveShadow = true;
    desk.visible = false;
    scene.add(desk);
    deskRef.current = desk;
    
    // Document
    const documentTexture = createDocumentTexture();
    const docWidth = 1.7;
    const docHeight = 2.2;
    const docDepth = 0.02;
    
    const documentGeometry = new THREE.BoxGeometry(docWidth, docHeight, docDepth);
    
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: documentTexture,
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0.5, 0.5, 0.5)
    });
    frontMaterialRef.current = frontMaterial;
    
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0ede8,
      roughness: 0.8,
      metalness: 0.0
    });
    
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xebe8e3,
      roughness: 0.9,
      metalness: 0.0
    });
    
    const materials = [
      sideMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
      frontMaterial,
      backMaterial
    ];
    
    const document3D = new THREE.Mesh(documentGeometry, materials);
    document3D.castShadow = true;
    document3D.receiveShadow = true;
    document3D.position.z = 4.85;
    document3D.scale.setScalar(8);
    scene.add(document3D);
    document3DRef.current = document3D;
    
    // Shadow plane
    const shadowPlaneGeometry = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMaterial = new THREE.ShadowMaterial({
      opacity: 0
    });
    shadowMaterialRef.current = shadowPlaneMaterial;
    const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.position.set(0, -1.425, -1);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      const state = stateRef.current;
      
      if (state.isZoomingOut && !state.isComplete) {
        const zoomSpeed = 0.004;
        state.zoomOutProgress = Math.min(state.zoomOutProgress + zoomSpeed, 1);
        
        const progress = state.zoomOutProgress;
        
        // Phase 1: Fade from white (0 to 0.15)
        if (progress <= 0.15) {
          const fadePhase = progress / 0.15;
          const fadeEased = easeOutCubic(fadePhase);
          
          if (scene.background instanceof THREE.Color) {
            scene.background.setRGB(
              lerp(1, 0.91, fadeEased),
              lerp(1, 0.894, fadeEased),
              lerp(1, 0.875, fadeEased)
            );
          }
          
          frontMaterial.emissive.setRGB(
            lerp(0.5, 0, fadeEased),
            lerp(0.5, 0, fadeEased),
            lerp(0.5, 0, fadeEased)
          );
        }
        
        // Phase 2: Pull back and start revealing desk (0.15 to 0.5)
        if (progress > 0.15 && progress <= 0.5) {
          const pullbackPhase = (progress - 0.15) / 0.35;
          const pullbackEased = easeInOutCubic(pullbackPhase);
          
          document3D.position.z = lerp(4.85, 1.5, pullbackEased);
          document3D.scale.setScalar(lerp(8, 2, pullbackEased));
          
          // Start showing desk
          if (progress > 0.25) {
            desk.visible = true;
            const deskFade = (progress - 0.25) / 0.25;
            deskMaterial.opacity = easeOutCubic(deskFade);
            deskMaterial.transparent = true;
          }
        }
        
        // Phase 3: Float down to desk with arc motion (0.5 to 1.0)
        if (progress > 0.5) {
          const floatPhase = (progress - 0.5) / 0.5;
          const floatEased = easeInOutCubic(floatPhase);
          
          // Horizontal movement (slight arc)
          const arcProgress = Math.sin(floatPhase * Math.PI);
          document3D.position.x = lerp(0, 0.3, arcProgress * 0.5);
          
          // Vertical descent - land ON the desk surface
          document3D.position.y = lerp(0, -1.415, floatEased);
          document3D.position.z = lerp(1.5, -0.9, floatEased);
          
          // Scale to final size
          document3D.scale.setScalar(lerp(2, 1, floatEased));
          
          // Rotate to lay flat on desk (rotate 90 degrees around X axis)
          document3D.rotation.x = lerp(0, Math.PI / 2, floatEased);
          document3D.rotation.y = 0;
          document3D.rotation.z = lerp(0, -0.08, floatEased);
          
          // Fade in shadow
          shadowPlaneMaterial.opacity = lerp(0, 0.3, floatEased);
          
          // Ensure desk is fully visible
          deskMaterial.transparent = false;
          deskMaterial.opacity = 1;
        }
        
        if (progress >= 1) {
          state.isComplete = true;
          state.isZoomingOut = false;
          // Final position adjustments - laying FLAT on the desk
          document3D.position.set(0.3, -1.415, -0.9);
          document3D.rotation.set(Math.PI / 2, 0, -0.08);
          document3D.scale.setScalar(1);
          
          // Navigate after animation completes
          if (!state.hasNavigated) {
            state.hasNavigated = true;
            setTimeout(() => {
              navigate('/mootcourt/questions');
            }, 500);
          }
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      documentGeometry.dispose();
      frontMaterial.dispose();
      sideMaterial.dispose();
      backMaterial.dispose();
      documentTexture.dispose();
      shadowPlaneGeometry.dispose();
      shadowPlaneMaterial.dispose();
      deskGeometry.dispose();
      deskMaterial.dispose();
      woodTexture.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        margin: 0, 
        padding: 0, 
        overflow: 'hidden',
        background: '#ffffff'
      }} 
    />
  );
};

export default DocumentZoomOut;
