import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export const DocumentIntro: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showWhiteOverlay, setShowWhiteOverlay] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const document3DRef = useRef<THREE.Mesh | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const shadowMaterialRef = useRef<THREE.ShadowMaterial | null>(null);
  const frontMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());

  const introText = `In India, consumer justice does not begin in a courtroom.

It begins with a document.

When a consumer faces unfair treatment — a defective product, a denied service, or an unjust refusal — the law provides a structured path to seek redress.

This process is governed by the Consumer Protection Act, 2019, and handled by Consumer Disputes Redressal Commissions.

Unlike criminal courts or televised trials, consumer courts rely primarily on written complaints, affidavits, and documentary evidence.

There is little argument, little drama — and a great deal of careful reasoning.

This moot court simulates that exact process.

You will begin by filing a formal complaint, just as a real consumer would.
You will submit evidence to support your claim.
The court will examine the record, raise clarifying questions if required, and apply the law to the facts.

Based on this process, a reasoned judgment will be delivered.

This simulation does not replace a real court.
It does not promise outcomes.

Its purpose is to show you how consumer justice actually works — from filing to resolution.

When you are ready, file your complaint.`;
  
  const stateRef = useRef({
    mouse: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    currentRotation: { x: 0, y: 0 },
    isHovered: false,
    isClicked: false,
    hoverElevation: 0,
    targetElevation: 0,
    hoverScale: 1,
    targetScale: 1,
    zoomProgress: 0,
    initialZ: 0,
    targetZ: 4.85,
    shadowOpacity: 0.15,
    whiteOutOpacity: 0,
    hasNavigated: false
  });

  const createDocumentTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 664;
    const ctx = canvas.getContext('2d')!;
    
    // Paper background with subtle grain
    ctx.fillStyle = '#f0ede8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle paper texture/noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Document border
    ctx.strokeStyle = '#d0ccc5';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Inner border line
    ctx.strokeStyle = '#e0dcd5';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    
    // Header area
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('FILE A CONSUMER', canvas.width / 2, 100);
    ctx.fillText('COMPLAINT', canvas.width / 2, 135);
    
    // Decorative line under title
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 155);
    ctx.lineTo(canvas.width - 120, 155);
    ctx.stroke();
    
    // Subtitle
    ctx.fillStyle = '#5a5a5a';
    ctx.font = '14px Georgia, serif';
    ctx.fillText('OFFICIAL FILING DOCUMENT', canvas.width / 2, 180);
    
    // Form lines
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
    
    // Checkbox area
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
    
    // Signature area
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
    
    // Official seal watermark
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
    
    // Document ID
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('DOC-2025-CC-0001', canvas.width - 40, canvas.height - 35);
    
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
    if (!showIntro) return;

    let index = 0;
    const speed = 35; // ms per character

    const timer = setInterval(() => {
      setTypedText(introText.slice(0, index + 1));
      index += 1;
      if (index >= introText.length) {
        clearInterval(timer);
        setIsTypingComplete(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [introText, showIntro]);

  useEffect(() => {
    if (showIntro) return;
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf3e8);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(2, 4, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.radius = 4;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
    fillLight.position.set(-2, 2, 1);
    scene.add(fillLight);
    
    // Document
    const documentTexture = createDocumentTexture();
    const docWidth = 1.7;
    const docHeight = 2.2;
    const docDepth = 0.02;
    
    const documentGeometry = new THREE.BoxGeometry(docWidth, docHeight, docDepth);
    
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: documentTexture,
      roughness: 0.2,
      metalness: 0.0,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.08
    });
    frontMaterialRef.current = frontMaterial;
    
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.0,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.35
    });
    
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.0,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.3
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
    scene.add(document3D);
    document3DRef.current = document3D;
    
    // Shadow plane
    const shadowPlaneGeometry = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMaterial = new THREE.ShadowMaterial({
      opacity: 0.15
    });
    shadowMaterialRef.current = shadowPlaneMaterial;
    const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.position.z = -0.5;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;
    
    // Event listeners
    const handleMouseMove = (event: MouseEvent) => {
      const state = stateRef.current;
      state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      mouseVecRef.current.x = state.mouse.x;
      mouseVecRef.current.y = state.mouse.y;
      raycasterRef.current.setFromCamera(mouseVecRef.current, camera);
      
      const intersects = raycasterRef.current.intersectObject(document3D);
      state.isHovered = intersects.length > 0 && !state.isClicked;
    };
    
    const handleMouseDown = () => {
      const state = stateRef.current;
      if (state.isHovered && !state.isClicked) {
        state.isClicked = true;
        renderer.domElement.style.cursor = 'default';
      }
    };
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const maxTiltAngle = 4 * (Math.PI / 180);
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      const state = stateRef.current;
      
      if (!state.isClicked) {
        // Idle: mouse tilt response
        state.targetRotation.y = state.mouse.x * maxTiltAngle;
        state.targetRotation.x = -state.mouse.y * maxTiltAngle;
        
        const rotationLerpFactor = 0.05;
        state.currentRotation.x = lerp(
          state.currentRotation.x,
          state.targetRotation.x,
          rotationLerpFactor
        );
        state.currentRotation.y = lerp(
          state.currentRotation.y,
          state.targetRotation.y,
          rotationLerpFactor
        );
        
        document3D.rotation.x = state.currentRotation.x;
        document3D.rotation.y = state.currentRotation.y;
        
        // Hover: elevation and scale
        state.targetElevation = state.isHovered ? 0.08 : 0;
        state.targetScale = state.isHovered ? 1.025 : 1;
        
        const hoverLerpFactor = 0.08;
        state.hoverElevation = lerp(
          state.hoverElevation,
          state.targetElevation,
          hoverLerpFactor
        );
        state.hoverScale = lerp(
          state.hoverScale,
          state.targetScale,
          hoverLerpFactor
        );
        
        document3D.position.z = state.hoverElevation;
        document3D.scale.setScalar(state.hoverScale);
        
        renderer.domElement.style.cursor = state.isHovered ? 'pointer' : 'default';
        
        const shadowScale = 1 + state.hoverElevation * 0.5;
        shadowPlane.scale.setScalar(shadowScale);
        shadowPlaneMaterial.opacity = 0.15 - state.hoverElevation * 0.3;
        
      } else {
        // Click: zoom toward camera
        const zoomSpeed = 0.005;
        state.zoomProgress = Math.min(state.zoomProgress + zoomSpeed, 1);
        
        const easedProgress = easeInOutCubic(state.zoomProgress);
        
        document3D.position.z = lerp(
          state.hoverElevation,
          state.targetZ,
          easedProgress
        );
        
        const zoomScale = lerp(state.hoverScale, 8, easedProgress);
        document3D.scale.setScalar(zoomScale);
        
        document3D.rotation.x = lerp(
          state.currentRotation.x,
          0,
          easedProgress
        );
        document3D.rotation.y = lerp(
          state.currentRotation.y,
          0,
          easedProgress
        );
        
        shadowPlaneMaterial.opacity = lerp(0.15, 0, Math.min(easedProgress * 3, 1));
        
        if (easedProgress > 0.6) {
          const whitePhase = (easedProgress - 0.6) / 0.4;
          const whiteEased = easeOutCubic(whitePhase);
          if (scene.background instanceof THREE.Color) {
            scene.background.setRGB(
              lerp(0.71, 1, whiteEased),
              lerp(0.69, 1, whiteEased),
              lerp(0.66, 1, whiteEased)
            );
          }
          
          frontMaterial.color.setRGB(
            lerp(1, 1, whiteEased),
            lerp(1, 1, whiteEased),
            lerp(1, 1, whiteEased)
          );
          frontMaterial.emissive.setRGB(
            whiteEased * 0.5,
            whiteEased * 0.5,
            whiteEased * 0.5
          );
        }

        // Show white overlay and navigate when animation is near complete
        if (easedProgress > 0.85) {
          setShowWhiteOverlay(true);
        }

        if (state.zoomProgress >= 1 && !state.hasNavigated) {
          state.hasNavigated = true;
          setTimeout(() => {
            navigate('/mootcourt/template');
          }, 200);
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
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
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, showIntro]);

  if (showIntro) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#fbf7ef',
          color: '#1f1f1f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        <div style={{ maxWidth: 900, width: '100%', paddingBottom: '80px', marginTop: 'auto', marginBottom: 'auto' }}>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '19px',
              lineHeight: 1.75,
              fontFamily: 'Georgia, serif',
              color: '#2c2c2c',
              letterSpacing: '0.01em'
            }}
          >
            {typedText}
            <span 
              style={{
                display: 'inline-block',
                width: '3px',
                height: '22px',
                backgroundColor: '#2c2c2c',
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite',
                verticalAlign: 'middle',
                opacity: isTypingComplete ? 0 : 1,
                transition: 'opacity 0.3s ease'
              }}
            />
          </div>
          {isTypingComplete && (
            <div 
              style={{ 
                marginTop: 56,
                display: 'flex', 
                justifyContent: 'center'
              }}
            >
              <span
                onClick={() => setShowIntro(false)}
                style={{
                  fontSize: '16px',
                  fontFamily: 'Georgia, serif',
                  color: '#5a5a5a',
                  cursor: 'pointer',
                  letterSpacing: '0.8px',
                  textDecoration: 'underline',
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '4px',
                  transition: 'color 0.2s ease',
                  animation: 'fadeIn 0.8s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2c2c2c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#5a5a5a';
                }}
              >
                Click to continue
              </span>
            </div>
          )}
        </div>
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          margin: 0, 
          padding: 0, 
          overflow: 'hidden',
          background: '#fbf7ef'
        }} 
      />
      {/* White overlay for smooth transition */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'white',
          pointerEvents: 'none',
          opacity: showWhiteOverlay ? 1 : 0,
          transition: 'opacity 0.3s ease-out'
        }}
      />
    </>
  );
};

export default DocumentIntro;
